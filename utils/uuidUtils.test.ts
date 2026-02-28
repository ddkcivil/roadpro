import { describe, it, expect } from 'vitest';
import { generateUniqueId } from './uuidUtils';

describe('uuidUtils', () => {
  describe('generateUniqueId', () => {
    it('should generate a valid string', () => {
      const id = generateUniqueId();
      expect(typeof id).toBe('string');
      expect(id.length).toBeGreaterThan(0);
    });

    it('should generate unique ids', () => {
      const id1 = generateUniqueId();
      const id2 = generateUniqueId();
      expect(id1).not.toBe(id2);
    });

    it('should match UUID v4 format', () => {
      const id = generateUniqueId();
      // Basic UUID v4 regex
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
      expect(id).toMatch(uuidRegex);
    });
  });
});
