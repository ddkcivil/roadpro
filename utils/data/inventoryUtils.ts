/**
 * Inventory stock computation utilities
 * Computes stock in/out levels from transaction history
 */

export interface Transaction {
  id: number;
  material_detail: string;
  category: string;
  unit: string;
  recieved_qty: number;
  consumption: number;
  party_name?: string;
  ref_no?: string;
  vehical_no?: string;
  location?: string;
  created_at?: string;
  [key: string]: any;
}

export interface StockLevel {
  material: string;
  category: string;
  unit: string;
  totalReceived: number;
  totalConsumed: number;
  currentStock: number;
  transactionCount: number;
  lastTransactionDate?: string;
  firstTransactionDate?: string;
}

export interface StockSummary {
  totalMaterials: number;
  totalStockIn: number;
  totalStockOut: number;
  totalCurrentStock: number;
  materials: StockLevel[];
}

/**
 * Computes stock levels from transaction history
 * Groups transactions by material_detail and aggregates received/consumed quantities
 */
export function computeStockLevels(transactions: Transaction[]): StockLevel[] {
  if (!transactions || transactions.length === 0) {
    return [];
  }

  const stockMap = new Map<string, StockLevel>();

  for (const tx of transactions) {
    const key = tx.material_detail || 'Unknown';

    if (!stockMap.has(key)) {
      stockMap.set(key, {
        material: key,
        category: tx.category || '',
        unit: tx.unit || '',
        totalReceived: 0,
        totalConsumed: 0,
        currentStock: 0,
        transactionCount: 0,
        lastTransactionDate: tx.created_at,
        firstTransactionDate: tx.created_at,
      });
    }

    const level = stockMap.get(key)!;
    level.totalReceived += tx.recieved_qty || 0;
    level.totalConsumed += tx.consumption || 0;
    level.currentStock = level.totalReceived - level.totalConsumed;
    level.transactionCount += 1;

    if (tx.created_at) {
      if (!level.firstTransactionDate || tx.created_at < level.firstTransactionDate) {
        level.firstTransactionDate = tx.created_at;
      }
      if (!level.lastTransactionDate || tx.created_at > level.lastTransactionDate) {
        level.lastTransactionDate = tx.created_at;
      }
    }
  }

  return Array.from(stockMap.values());
}

/**
 * Generates a summary of all stock levels
 */
export function computeStockSummary(transactions: Transaction[]): StockSummary {
  if (!transactions || transactions.length === 0) {
    return {
      totalMaterials: 0,
      totalStockIn: 0,
      totalStockOut: 0,
      totalCurrentStock: 0,
      materials: [],
    };
  }

  const materials = computeStockLevels(transactions);

  const totalStockIn = materials.reduce((sum, m) => sum + m.totalReceived, 0);
  const totalStockOut = materials.reduce((sum, m) => sum + m.totalConsumed, 0);

  return {
    totalMaterials: materials.length,
    totalStockIn,
    totalStockOut,
    totalCurrentStock: totalStockIn - totalStockOut,
    materials,
  };
}

/**
 * Filters transactions by date range
 */
export function filterTransactionsByDate(
  transactions: Transaction[],
  startDate: string,
  endDate: string
): Transaction[] {
  if (!transactions || transactions.length === 0) {
    return [];
  }

  return transactions.filter(tx => {
    if (!tx.created_at) return false;
    return tx.created_at >= startDate && tx.created_at <= endDate;
  });
}

/**
 * Computes stock movement for a specific material
 */
export function getMaterialStockHistory(
  transactions: Transaction[],
  materialName: string
): Transaction[] {
  if (!transactions || transactions.length === 0) {
    return [];
  }

  return transactions
    .filter(tx => tx.material_detail === materialName)
    .sort((a, b) => {
      if (!a.created_at) return 1;
      if (!b.created_at) return -1;
      return a.created_at.localeCompare(b.created_at);
    });
}

/**
 * Computes running stock balance over time for a material
 */
export function getRunningStockBalance(
  transactions: Transaction[],
  materialName: string
): { date: string; balance: number }[] {
  const history = getMaterialStockHistory(transactions, materialName);
  const balances: { date: string; balance: number }[] = [];
  let runningBalance = 0;

  for (const tx of history) {
    if (!tx.created_at) continue;

    runningBalance += (tx.recieved_qty || 0) - (tx.consumption || 0);

    balances.push({
      date: tx.created_at,
      balance: runningBalance,
    });
  }

  return balances;
}

/**
 * Gets current stock for a single material
 */
export function getCurrentStock(
  transactions: Transaction[],
  materialName: string
): number {
  if (!transactions || transactions.length === 0) {
    return 0;
  }

  return transactions
    .filter(tx => tx.material_detail === materialName)
    .reduce((balance, tx) => balance + (tx.recieved_qty || 0) - (tx.consumption || 0), 0);
}

/**
 * Identifies materials with low stock (zero or negative)
 */
export function getLowStockMaterials(
  transactions: Transaction[],
  threshold: number = 0
): StockLevel[] {
  const levels = computeStockLevels(transactions);
  return levels.filter(level => level.currentStock <= threshold);
}