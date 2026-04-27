import { describe, it, expect, vi, beforeEach } from 'vitest';
import { RoadDataManager } from '../services/roadManager.js';
import { Road, Alignment, Structure, Chainage, parseChainage } from '../models/roadTypes.js';
import { v4 as uuidv4 } from 'uuid';

// Mocking uuidv4
const mockUuidV4 = vi.fn();
vi.mock('uuid', () => ({
  v4: mockUuidV4,
}));

// Mocking mongodb directly since RoadDataManager uses lib/mongodb
// We need to ensure the mock returns chainable objects for collection methods
const mockDb = {
  collection: vi.fn().mockReturnThis(),
  find: vi.fn().mockReturnThis(),
  toArray: vi.fn(),
  insertOne: vi.fn(),
  updateOne: vi.fn(),
  findOneAndUpdate: vi.fn(),
  deleteOne: vi.fn(),
  findOne: vi.fn(),
};
vi.mock('../lib/mongodb.js', () => ({
  mongodb: {
    db: mockDb,
    close: vi.fn()
  }
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
    
    // Configure mockUuidV4 for sequential ID generation
    mockUuidV4
      .mockReturnValueOnce('road-id-1') // For addRoad in CRUD tests
      .mockReturnValueOnce('align-id-1') // For addAlignmentToRoad
      .mockReturnValueOnce('struct-id-1') // For addStructureToRoad
      .mockReturnValueOnce('road-id-2') // For addRoad in getAllRoads test
      .mockReturnValueOnce('align-id-2') // For addAlignmentToRoad
      .mockReturnValueOnce('struct-id-2') // For addStructureToRoad
      .mockReturnValueOnce('road-id-3') // For addRoad in Validation tests
      .mockReturnValueOnce('align-id-3') // For addAlignmentToRoad
      .mockReturnValueOnce('struct-id-3') // For addStructureToRoad
      .mockReturnValue('new-id'); // Default fallback

    roadDataManager = new RoadDataManager();
  });

  // --- Road CRUD Operations ---
  describe('Road CRUD Operations', () => {
    it('should add a road and return its ID', () => {
      const newRoadId = roadDataManager.addRoad(mockRoadData('Main Street'));
      expect(newRoadId).toBe('road-id-1'); // First mockReturnValueOnce
      expect(roadDataManager.getRoad('road-id-1')).toBeDefined();
      expect(roadDataManager.getRoad('road-id-1')?.name).toBe('Main Street');
    });

    it('should get all roads', () => {
      roadDataManager.addRoad(mockRoadData('Street 1')); // Uses 'road-id-1'
      roadDataManager.addRoad(mockRoadData('Street 2')); // Uses 'road-id-2'
      const roads = roadDataManager.getAllRoads();
      expect(roads.length).toBe(2);
      expect(roads.some(r => r.name === 'Street 1')).toBe(true);
      expect(roads.some(r => r.name === 'Street 2')).toBe(true);
    });

    it('should update a road', () => {
      roadDataManager.addRoad(mockRoadData('Old Name')); // Uses 'road-id-1'
      const updateSuccess = roadDataManager.updateRoad('road-id-1', { name: 'New Name', chainageOffset: 100 });
      expect(updateSuccess).toBe(true);
      const updatedRoad = roadDataManager.getRoad('road-id-1');
      expect(updatedRoad?.name).toBe('New Name');
      expect(updatedRoad?.chainageOffset).toBe(100);
    });

    it('should delete a road', () => {
      roadDataManager.addRoad(mockRoadData('Road to Delete')); // Uses 'road-id-1'
      const deleteSuccess = roadDataManager.deleteRoad('road-id-1');
      expect(deleteSuccess).toBe(true);
      expect(roadDataManager.getRoad('road-id-1')).toBeUndefined();
    });
  });

  // --- Alignment Management ---
  describe('Alignment Management', () => {
    let roadId: string;
    beforeEach(() => {
      roadId = roadDataManager.addRoad(mockRoadData('Test Road for Alignments'))!; // Uses 'road-id-1' from current sequence
    });

    it('should add an alignment to a road', () => {
      const newAlignmentId = roadDataManager.addAlignmentToRoad(roadId!, mockAlignmentData('Pavement'));
      expect(newAlignmentId).toBe('align-id-1'); // Uses 'align-id-1'
      const road = roadDataManager.getRoad(roadId!);
      expect(road?.alignments.length).toBe(1);
      expect(road?.alignments[0].name).toBe('Pavement');
    });
  });

  // --- Structure Management ---
  describe('Structure Management', () => {
    let roadId: string;
    beforeEach(() => {
      roadId = roadDataManager.addRoad(mockRoadData('Test Road for Structures'))!; // Uses 'road-id-2'
    });

    it('should add a structure to a road', () => {
      const newStructureId = roadDataManager.addStructureToRoad(roadId!, mockStructureData('Culvert 1'));
      expect(newStructureId).toBe('struct-id-1'); // Uses 'struct-id-1'
      const road = roadDataManager.getRoad(roadId!);
      expect(road?.structures.length).toBe(1);
      expect(road?.structures[0].name).toBe('Culvert 1');
    });
  });

  // --- Validation Tasks ---
  describe('Validation', () => {
    let roadId: string;

    beforeEach(() => {
      roadId = roadDataManager.addRoad(mockRoadData('Validation Road'))!; // Uses 'road-id-3'
      roadDataManager.addAlignmentToRoad(roadId!, {
        name: 'Valid Alignment', type: 'pavement',
        chainagePoints: [
          { chainage: '0+000', distance: 0, point: { lat: 0, lng: 0 } },
          { chainage: '0+500', distance: 500, point: { lat: 1, lng: 1 } },
          { chainage: '1+000', distance: 1000, point: { lat: 2, lng: 2 } }
        ], totalLength: 1000, coordinates: []
      }); // Uses 'align-id-1'
      roadDataManager.addStructureToRoad(roadId!, mockStructureData('Test Structure', 'culvert', '0+300')); // Uses 'struct-id-1'
    });

    it('should validate alignment chainage sequence (valid)', () => {
      expect(roadDataManager.validateChainage(roadId!, 'align-id-1')).toBe(true);
    });

    it('should fail validation if alignment chainage sequence is decreasing', () => {
      const alignment = roadDataManager.getAlignment(roadId!, 'align-id-1')!;
      alignment.chainagePoints.push({ chainage: '0+400', distance: 400, point: { lat: 1.5, lng: 1.5 } }); 
      expect(roadDataManager.validateChainage(roadId!, 'align-id-1')).toBe(false);
    });

    it('should warn if structure chainage is outside road bounds', () => {
      roadDataManager.addStructureToRoad(roadId!, { ...mockStructureData('Far Structure', 'bridge', '10+000'), chainage: '10+000' }); // Uses 'struct-id-2'
      const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      expect(roadDataManager.validateChainage(roadId!, undefined, 'struct-id-2')).toBe(true);
      expect(consoleWarnSpy).toHaveBeenCalled();
      consoleWarnSpy.mockRestore();
    });
  });

  // --- Querying Tasks ---
  describe('Querying', () => {
    let road1Id: string;

    beforeEach(() => {
      road1Id = roadDataManager.addRoad(mockRoadData('Road Alpha'))!; // Uses 'road-id-1' (reset by beforeEach)
      roadDataManager.addStructureToRoad(road1Id!, { ...mockStructureData('Struct A1', 'culvert', '0+250'), name: 'Struct A1' }); // Uses 'struct-id-1'
      roadDataManager.addAlignmentToRoad(road1Id!, { 
        name: 'Align A1', type: 'pavement', 
        chainagePoints: [
          { chainage: '0+000', distance: 0, point: { lat: 0, lng: 0 } },
          { chainage: '0+500', distance: 500, point: { lat: 1, lng: 1 } },
        ], totalLength: 1000, coordinates: []
      }); // Uses 'align-id-1'
    });

    it('should find roads containing elements within the range', () => {
      const roads = roadDataManager.findRoadsByChainageRange('0+100', '0+400');
      expect(roads.length).toBe(1);
      expect(roads[0].id).toBe(road1Id);
    });

    it('should find structures for a given road within the range', () => {
      const structures = roadDataManager.findStructuresByRoadIdAndChainageRange(road1Id!, '0+100', '0+400');
      expect(structures.length).toBe(1);
      expect(structures[0].name).toBe('Struct A1');
    });
  });
});
