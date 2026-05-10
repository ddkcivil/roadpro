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
    it('should parse valid chainage format "X+YYY"', () => {
      expect(parseChainage('0+000')).toBe(0);
      expect(parseChainage('1+000')).toBe(1000);
      expect(parseChainage('3+025')).toBe(3025);
    });

    it('should parse simple numeric strings as fallback', () => {
      expect(parseChainage('500')).toBe(500);
    });

    it('should return 0 for invalid formats', () => {
      expect(parseChainage('invalid')).toBe(0);
      expect(parseChainage('')).toBe(0);
    });
  });

  describe('formatChainage', () => {
    it('should format meters into "X+YYY" format', () => {
      expect(formatChainage(0)).toBe('0+000');
      expect(formatChainage(1000)).toBe('1+000');
      expect(formatChainage(3025)).toBe('3+025');
    });

    it('should handle large values', () => {
      expect(formatChainage(12500)).toBe('12+500');
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
