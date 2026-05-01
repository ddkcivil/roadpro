import { describe, it, expect, vi, beforeEach } from 'vitest';
import { RoadDataManager } from '../services/roadManager.js';
import { Road, Alignment, Structure, Chainage, parseChainage } from '../models/roadTypes.js';

// Hoist uuid mock
const { mockUuidV4 } = vi.hoisted(() => ({
  mockUuidV4: vi.fn(),
}));

vi.mock('uuid', () => ({
  v4: mockUuidV4,
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

const mockStructureData = (name: string, type: Structure['type'] = 'culvert', chainage: Chainage = '0+250'): Omit<Structure, 'id' | 'roadId'> => ({
  name,
  type,
  chainage,
  distance: 250,
  alignments: [],
  properties: { material: 'concrete' },
});

describe('RoadDataManager', () => {
  let roadDataManager: RoadDataManager;

  beforeEach(() => {
    vi.clearAllMocks();
    
    // Default mock implementation
    mockUuidV4.mockReturnValue('new-id');

    roadDataManager = new RoadDataManager();
  });

  // --- Road CRUD Operations ---
  describe('Road CRUD Operations', () => {
    it('should add a road and return its ID', () => {
      mockUuidV4.mockReturnValueOnce('road-id-1');
      const newRoadId = roadDataManager.addRoad(mockRoadData('Main Street'));
      expect(newRoadId).toBe('road-id-1');
      expect(roadDataManager.getRoad('road-id-1')).toBeDefined();
    });

    it('should get all roads', () => {
      mockUuidV4.mockReturnValueOnce('road-id-1').mockReturnValueOnce('road-id-2');
      roadDataManager.addRoad(mockRoadData('Street 1'));
      roadDataManager.addRoad(mockRoadData('Street 2'));
      const roads = roadDataManager.getAllRoads();
      expect(roads.length).toBe(2);
    });

    it('should update a road', () => {
      mockUuidV4.mockReturnValueOnce('road-id-1');
      roadDataManager.addRoad(mockRoadData('Old Name'));
      const updateSuccess = roadDataManager.updateRoad('road-id-1', { name: 'New Name' });
      expect(updateSuccess).toBe(true);
      expect(roadDataManager.getRoad('road-id-1')?.name).toBe('New Name');
    });

    it('should delete a road', () => {
      mockUuidV4.mockReturnValueOnce('road-id-1');
      roadDataManager.addRoad(mockRoadData('Road to Delete'));
      const deleteSuccess = roadDataManager.deleteRoad('road-id-1');
      expect(deleteSuccess).toBe(true);
      expect(roadDataManager.getRoad('road-id-1')).toBeUndefined();
    });
  });

  describe('Alignment and Structure Management', () => {
    it('should add an alignment to a road', () => {
      mockUuidV4.mockReturnValueOnce('road-id-1').mockReturnValueOnce('align-id-1');
      const roadId = roadDataManager.addRoad(mockRoadData('Test Road'))!;
      const alignId = roadDataManager.addAlignmentToRoad(roadId, mockAlignmentData('Pavement'));
      expect(alignId).toBe('align-id-1');
      expect(roadDataManager.getRoad(roadId)?.alignments.length).toBe(1);
    });

    it('should add a structure to a road', () => {
      mockUuidV4.mockReturnValueOnce('road-id-1').mockReturnValueOnce('struct-id-1');
      const roadId = roadDataManager.addRoad(mockRoadData('Test Road'))!;
      const structId = roadDataManager.addStructureToRoad(roadId, mockStructureData('Culvert'));
      expect(structId).toBe('struct-id-1');
      expect(roadDataManager.getRoad(roadId)?.structures.length).toBe(1);
    });
  });
});
