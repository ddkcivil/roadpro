import { describe, it, expect } from 'vitest';
import { 
  getCurrencyConfig, 
  getCurrencySymbol, 
  formatCurrency, 
  formatCurrencyWithDecimals,
  getCurrencyOptions 
} from './currencyUtils';

describe('currencyUtils', () => {
  describe('getCurrencyConfig', () => {
    it('should return NPR config by default', () => {
      const config = getCurrencyConfig();
      expect(config.code).toBe('NPR');
      expect(config.symbol).toBe('Rs.');
    });

    it('should fallback to NPR for unknown code', () => {
      const config = getCurrencyConfig('XYZ' as any);
      expect(config.code).toBe('NPR');
    });
  });

  describe('getCurrencySymbol', () => {
    it('should return correct symbol', () => {
      expect(getCurrencySymbol('USD')).toBe('$');
      expect(getCurrencySymbol('NPR')).toBe('Rs.');
      expect(getCurrencySymbol()).toBe('Rs.');
    });
  });

  describe('formatCurrency', () => {
    it('should format amount with symbol', () => {
      // Note: toLocaleString output can vary by environment, 
      // but we test the prefix and existence of commas
      const formatted = formatCurrency(1234.56, 'USD');
      expect(formatted).toContain('$');
      expect(formatted).toContain('1,234');
    });
  });

  describe('getCurrencyOptions', () => {
    it('should return all configured currencies', () => {
      const options = getCurrencyOptions();
      expect(options.length).toBeGreaterThan(0);
      expect(options.find(o => o.value === 'NPR')).toBeDefined();
    });
  });
});
