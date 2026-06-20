import { useState, useEffect, useCallback, useRef } from 'react';
import { computeStockLevels, computeStockSummary, getCurrentStock, getLowStockMaterials } from '../utils/data/inventoryUtils';

export interface InventoryTransaction {
  id: number;
  username: string;
  name: string;
  branch: string;
  ref_no: string;
  party_name: string;
  vehical_no: string;
  category: string;
  material_detail: string;
  unit: string;
  recieved_qty: number;
  rate: number;
  amount: string;
  consumption: number;
  remarks: string;
  created_at: string;
  bsdate: string;
  dbdate: string;
  vat_percent: number;
  vat_amount: string;
  total_amount: string;
  location: string;
  synced_at?: string;
  source_url?: string;
}

export interface SyncStatus {
  isSyncing: boolean;
  lastSyncedAt?: string;
  totalFetched?: number;
  inserted?: number;
  updated?: number;
  errors?: number;
  errorDetails?: string[];
  success?: boolean;
}

export interface InventoryState {
  transactions: InventoryTransaction[];
  stockLevels: ReturnType<typeof computeStockLevels>;
  stockSummary: ReturnType<typeof computeStockSummary>;
  lowStockMaterials: ReturnType<typeof getLowStockMaterials>;
  syncStatus: SyncStatus;
  isLoading: boolean;
  error: string | null;
}

export const useInventorySync = (isAuthenticated: boolean, userRole?: string) => {
  const [transactions, setTransactions] = useState<InventoryTransaction[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [syncStatus, setSyncStatus] = useState<SyncStatus>({ isSyncing: false });
  const [error, setError] = useState<string | null>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  // Fetch transactions from local Supabase (already synced data)
  const fetchTransactions = useCallback(async () => {
    if (!isAuthenticated) return;

    try {
      const token = typeof localStorage !== 'undefined' ? localStorage.getItem('roadmaster-token') : null;
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      const response = await fetch('/api/inventorySync', {
        method: 'GET',
        headers,
        credentials: 'include',
      });

      if (!response.ok) {
        const errBody = await response.json().catch(() => ({}));
        throw new Error(errBody?.error || `Failed to fetch inventory transactions (${response.status})`);
      }

      const data = await response.json();
      setTransactions(Array.isArray(data) ? data : []);
      setError(null);
    } catch (err: any) {
      console.error('[useInventorySync] Fetch error:', err);
      setError(err.message || 'Failed to load inventory data');
    }
  }, [isAuthenticated]);

  // Trigger sync with external API
  const syncNow = useCallback(async () => {
    if (!isAuthenticated) {
      console.warn('[useInventorySync] Cannot sync: Not authenticated');
      return;
    }

    if (userRole !== 'Admin') {
      console.warn('[useInventorySync] Cannot sync: Insufficient permissions');
      setError('Only admins can trigger inventory sync');
      return;
    }

    setSyncStatus(prev => ({ ...prev, isSyncing: true }));
    setError(null);

    try {
      const token = typeof localStorage !== 'undefined' ? localStorage.getItem('roadmaster-token') : null;
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      const response = await fetch('/api/inventorySync', {
        method: 'POST',
        headers,
        credentials: 'include',
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Sync failed');
      }

      setSyncStatus({
        isSyncing: false,
        lastSyncedAt: result.syncedAt,
        totalFetched: result.totalFetched,
        inserted: result.inserted,
        updated: result.updated,
        errors: result.errors,
        errorDetails: result.errorDetails,
        success: result.success,
      });

      // Refresh local data after sync
      await fetchTransactions();
    } catch (err: any) {
      console.error('[useInventorySync] Sync error:', err);
      setSyncStatus(prev => ({ ...prev, isSyncing: false }));
      setError(err.message || 'Sync failed');
    }
  }, [isAuthenticated, fetchTransactions]);

  // Setup polling
  useEffect(() => {
    if (!isAuthenticated) {
      setTransactions([]);
      setSyncStatus({ isSyncing: false });
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      return;
    }

    // Initial fetch and sync — await so the loading state is visible/blocks blank render
    const initialize = async () => {
      setIsLoading(true);
      await fetchTransactions();
      // Only hide loading if we successfully fetched something OR there is an explicit error
      // This prevents the blank-screen flash where loading disappears before data arrives
      setIsLoading(false);
    };
    initialize();

    // Optional: background polling every 5 minutes
    intervalRef.current = setInterval(() => {
      fetchTransactions();
    }, 5 * 60 * 1000);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [isAuthenticated, fetchTransactions]);

// Compute derived state
  const stockLevels = computeStockLevels(transactions);
  const stockSummary = computeStockSummary(transactions) || {
    totalCategories: 0,
    totalMaterials: 0,
    totalStockIn: 0,
    totalStockOut: 0,
    totalCurrentStock: 0,
    materials: []
  };
  const lowStockMaterials = getLowStockMaterials(transactions, 0) || [];

  return {
    transactions,
    stockLevels,
    stockSummary,
    lowStockMaterials,
    syncStatus,
    isLoading,
    error,
    syncNow,
    refresh: fetchTransactions,
  };
};