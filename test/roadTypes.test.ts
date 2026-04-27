import { describe, it, expect, vi, beforeEach } from 'vitest';
import { RoadDataManager } from '../services/roadManager.js';
import { Road, Alignment, Structure, Chainage } from '../models/roadTypes.js';
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

const mockAlignmentData = (name: string, type: Alignment['type'] = 'pavement'): Omit<Alignment, 'id' | 'roadId'> => ({
  name,
  type,
  chainagePoints: [{ chainage: '0+000', distance: 0, point: { lat: 20, lng: 20 } }, { chainage: '0+500', distance: 500, point: { lat: 21, lng: 21 } }],
  totalLength: 500,
  coordinates: []
});

describe('RoadDataManager (Types)', () => {
  let roadDataManager: RoadDataManager;

  beforeEach(() => {
    vi.clearAllMocks();
    (uuidv4 as any).mockReturnValue('mock-id');
    roadDataManager = new RoadDataManager();
  });

  it('should handle complex road types', () => {
    const id = roadDataManager.addRoad(mockRoadData('Complex Road'));
    expect(id).toBe('mock-id');
  });
});
