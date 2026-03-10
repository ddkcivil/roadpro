/**
 * Currency utilities for consistent currency handling across the application
 */

interface CurrencyConfig {
  code: string;
  symbol: string;
  name: string;
}

const CURRENCY_CONFIGS: Record<string, CurrencyConfig> = {
  'USD': { code: 'USD', symbol: '$', name: 'US Dollar' },
  'NPR': { code: 'NPR', symbol: 'Rs.', name: 'Nepalese Rupee' },
  'INR': { code: 'INR', symbol: '₹', name: 'Indian Rupee' },
  'EUR': { code: 'EUR', symbol: '€', name: 'Euro' },
  'GBP': { code: 'GBP', symbol: '£', name: 'British Pound' }
};

/**
 * Get currency configuration by currency code
 */
export function getCurrencyConfig(currencyCode: string = 'NPR'): CurrencyConfig {
  return CURRENCY_CONFIGS[currencyCode] || CURRENCY_CONFIGS['NPR'];
}

/**
 * Get currency symbol by currency code
 */
export function getCurrencySymbol(currencyCode?: string): string {
  return getCurrencyConfig(currencyCode || 'NPR').symbol;
}

/**
 * Format currency amount with symbol
 */
export function formatCurrency(amount: number, currencyCode?: string): string {
  const symbol = getCurrencySymbol(currencyCode);
  return `${symbol}${amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

/**
 * Format currency amount with symbol and decimal places
 */
export function formatCurrencyWithDecimals(amount: number, currencyCode?: string, decimals: number = 2): string {
  const symbol = getCurrencySymbol(currencyCode);
  return `${symbol}${amount.toLocaleString(undefined, { minimumFractionDigits: decimals, maximumFractionDigits: decimals })}`;
}

/**
 * Get currency options for dropdown/select components
 */
export function getCurrencyOptions(): { value: string; label: string; symbol: string }[] {
  return Object.values(CURRENCY_CONFIGS).map(config => ({
    value: config.code,
    label: `${config.code} (${config.symbol})`,
    symbol: config.symbol
  }));
}