import { describe, it, expect, vi, beforeEach } from 'vitest';
import { RoadDataManager } from '../services/roadManager.js';
import { Road, Alignment, Structure, Chainage } from '../models/roadTypes.js';

// Mocking uuidv4
vi.mock('uuid', () => ({
  v4: vi.fn(() => 'mock-uuid'),
}));

// Helper to create mock data structures for tests
const mockRoadData = (name: string): Omit<Road, 'id'> => ({
  name,
  geometry: [{ lat: 10, lng: 10 }],
  chainageOffset: 0,
  alignments: [],
  structures: [],
});

const mockAlignmentData = (name: string): Omit<Alignment, 'id' | 'roadId'> => ({
  name,
  type: 'pavement',
  chainagePoints: [{ distance: 0, chainage: '0+000', point: { lat: 20, lng: 20 } }],
  totalLength: 500,
  coordinates: []
});

const mockStructureData = (name: string): Omit<Structure, 'id' | 'roadId'> => ({
  name,
  type: 'box-culvert',
  chainage: '0+250',
  distance: 250,
  alignments: [],
  properties: {},
});

describe('RoadDataManager', () => {
  let roadDataManager: RoadDataManager;

  beforeEach(() => {
    vi.clearAllMocks();
    roadDataManager = new RoadDataManager();
  });

  describe('addRoad', () => {
    it('should save a new road and return its ID', async () => {
      const roadData = mockRoadData('Test Road');
      const id = roadDataManager.addRoad(roadData);
      expect(id).toBe('mock-uuid');
      expect(roadDataManager.getRoad(id!)).toBeDefined();
    });
  });

  describe('getRoad', () => {
    it('should return a road by ID', async () => {
      const id = roadDataManager.addRoad(mockRoadData('Find Me'));
      const road = roadDataManager.getRoad(id!);
      expect(road).toBeDefined();
      expect(road?.name).toBe('Find Me');
    });

    it('should return undefined if road not found', async () => {
      const road = roadDataManager.getRoad('non-existent');
      expect(road).toBeUndefined();
    });
  });

  describe('updateRoad', () => {
    it('should update and return true if road exists', async () => {
      const id = roadDataManager.addRoad(mockRoadData('Old Name'));
      const result = roadDataManager.updateRoad(id!, { name: 'New Name' });
      expect(result).toBe(true);
      expect(roadDataManager.getRoad(id!)?.name).toBe('New Name');
    });
  });

  describe('deleteRoad', () => {
    it('should delete and return true if road exists', async () => {
      const id = roadDataManager.addRoad(mockRoadData('Delete Me'));
      const result = roadDataManager.deleteRoad(id!);
      expect(result).toBe(true);
      expect(roadDataManager.getRoad(id!)).toBeUndefined();
    });
  });

  describe('addAlignmentToRoad', () => {
    it('should add an alignment to an existing road', async () => {
      const roadId = roadDataManager.addRoad(mockRoadData('Road'))!;
      const alignId = roadDataManager.addAlignmentToRoad(roadId, mockAlignmentData('Align'));
      expect(alignId).toBeDefined();
      expect(roadDataManager.getRoad(roadId)?.alignments.length).toBe(1);
    });
  });

  describe('addStructureToRoad', () => {
    it('should add a structure to an existing road', async () => {
      const roadId = roadDataManager.addRoad(mockRoadData('Road'))!;
      const structId = roadDataManager.addStructureToRoad(roadId, mockStructureData('Struct'));
      expect(structId).toBeDefined();
      expect(roadDataManager.getRoad(roadId)?.structures.length).toBe(1);
    });
  });

  describe('Querying', () => {
    it('should find roads by chainage range', async () => {
      const roadId = roadDataManager.addRoad(mockRoadData('Query Road'))!;
      roadDataManager.addStructureToRoad(roadId, mockStructureData('In Range'));
      
      const results = roadDataManager.findRoadsByChainageRange('0+100', '0+400');
      expect(results.length).toBe(1);
      expect(results[0].id).toBe(roadId);
    });
  });
});
