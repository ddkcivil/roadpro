import { describe, it, expect, vi, beforeEach } from 'vitest';
import { RoadDataManager } from '../services/roadManager.js';
import { Road, Alignment, Structure, Chainage, parseChainage, formatChainage } from '../utils/roadTypes';
import { v4 as uuidv4 } from 'uuid';

// Mocking uuidv4
vi.mock('uuid', () => ({
  v4: vi.fn(),
}));

// Helper to create mock data structures for tests
const mockRoadData = (name: string): Omit<Road, 'id'> => ({
  name,
  geometry: [{ lat: 10, lng: 10 }],
  chainageOffset: 0,
  alignments: [],
  structures: [],
});

describe('roadTypes Utilities', () => {
  describe('parseChainage', () => {
    it('should parse valid chainage format "X+YYY.DD"', () => {
      expect(parseChainage('0+000.00')).toBe(0);
      expect(parseChainage('1+000.00')).toBe(1000);
      expect(parseChainage('3+025.50')).toBe(3025.50);
      expect(parseChainage('3+025.75')).toBe(3025.75);
    });

    it('should parse chainage format without decimals "X+YYY"', () => {
      expect(parseChainage('0+000')).toBe(0);
      expect(parseChainage('1+000')).toBe(1000);
      expect(parseChainage('3+025')).toBe(3025);
    });

    it('should parse simple numeric strings as fallback', () => {
      expect(parseChainage('500')).toBe(500);
      expect(parseChainage('500.50')).toBe(500.50);
    });

    it('should return 0 for invalid formats', () => {
      expect(parseChainage('invalid')).toBe(0);
      expect(parseChainage('')).toBe(0);
    });
  });

  describe('formatChainage', () => {
    it('should format meters into "X+YYY.DD" format with 2 decimal places', () => {
      expect(formatChainage(0)).toBe('0+000.00');
      expect(formatChainage(1000)).toBe('1+000.00');
      expect(formatChainage(3025)).toBe('3+025.00');
      expect(formatChainage(3025.50)).toBe('3+025.50');
      expect(formatChainage(3025.75)).toBe('3+025.75');
    });

    it('should handle large values', () => {
      expect(formatChainage(12500)).toBe('12+500.00');
      expect(formatChainage(12500.25)).toBe('12+500.25');
    });

    it('should round decimals correctly', () => {
      expect(formatChainage(1000.005)).toBe('1+000.01');
      expect(formatChainage(1000.004)).toBe('1+000.00');
    });
  });
});

describe('RoadDataManager (Types Integration)', () => {
  let roadDataManager: RoadDataManager;

  beforeEach(() => {
    vi.clearAllMocks();
    (uuidv4 as any).mockReturnValue('mock-id');
    roadDataManager = new RoadDataManager();
  });

  it('should handle complex road types', () => {
    const id = roadDataManager.addRoad(mockRoadData('Complex Road'));
    expect(id).toBe('mock-id');
    const road = roadDataManager.getRoad(id!);
    expect(road).toBeDefined();
    expect(road?.name).toBe('Complex Road');
  });
});
