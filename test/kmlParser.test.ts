import { describe, it, expect, beforeEach, vi, Mock } from 'vitest';
import { RoadDataManager } from '../services/roadManager';
import { Road, Alignment, Structure, Chainage } from '../models/roadTypes';
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
  coordinates: [[20, 20], [21, 21]],
  chainagePoints: [
    { distance: 0, chainage: '0+000', point: { lat: 20, lng: 20 } }, 
    { distance: 500, chainage: '0+500', point: { lat: 21, lng: 21 } }
  ],
  totalLength: 500,
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
    // Reset mocks before each test
    vi.clearAllMocks();

    // Setup uuidv4 mock to return sequential IDs
    let counter = 1;
    (uuidv4 as Mock).mockImplementation(() => `uuid-${counter++}`);

    roadDataManager = new RoadDataManager();
  });

  // --- Road CRUD Operations ---
  describe('Road CRUD Operations', () => {
    it('should add a road and return its ID', () => {
      const newRoadId = roadDataManager.addRoad(mockRoadData('Main Street'));
      expect(newRoadId).toBe('uuid-1');
      expect(roadDataManager.getRoad('uuid-1')).toBeDefined();
      expect(roadDataManager.getRoad('uuid-1')?.name).toBe('Main Street');
    });

    it('should return null if adding a road with an existing ID (though uuidv4 makes this unlikely)', () => {
      (uuidv4 as Mock).mockImplementationOnce(() => 'fixed-road-id');
      roadDataManager.addRoad(mockRoadData('Street A'));
      (uuidv4 as Mock).mockImplementationOnce(() => 'fixed-road-id'); // Same ID
      const secondAddResult = roadDataManager.addRoad(mockRoadData('Street B'));
      expect(secondAddResult).toBeNull();
    });

    it('should get all roads', () => {
      roadDataManager.addRoad(mockRoadData('Street 1'));
      roadDataManager.addRoad(mockRoadData('Street 2'));
      const roads = roadDataManager.getAllRoads();
      expect(roads.length).toBe(2);
      expect(roads.some(r => r.name === 'Street 1')).toBe(true);
      expect(roads.some(r => r.name === 'Street 2')).toBe(true);
    });

    it('should get a specific road by ID', () => {
      roadDataManager.addRoad(mockRoadData('Specific Road'));
      const road = roadDataManager.getRoad('uuid-1');
      expect(road).toBeDefined();
      expect(road?.name).toBe('Specific Road');
    });

    it('should return undefined if road not found by ID', () => {
      const road = roadDataManager.getRoad('non-existent-id');
      expect(road).toBeUndefined();
    });

    it('should update a road', () => {
      roadDataManager.addRoad(mockRoadData('Old Name'));
      const updateSuccess = roadDataManager.updateRoad('uuid-1', { name: 'New Name', chainageOffset: 100 });
      expect(updateSuccess).toBe(true);
      const updatedRoad = roadDataManager.getRoad('uuid-1');
      expect(updatedRoad?.name).toBe('New Name');
      expect(updatedRoad?.chainageOffset).toBe(100);
    });

    it('should return false if road not found for update', () => {
      const updateSuccess = roadDataManager.updateRoad('non-existent-id', { name: 'Test' });
      expect(updateSuccess).toBe(false);
    });

    it('should delete a road', () => {
      roadDataManager.addRoad(mockRoadData('Road to Delete'));
      const deleteSuccess = roadDataManager.deleteRoad('uuid-1');
      expect(deleteSuccess).toBe(true);
      expect(roadDataManager.getRoad('uuid-1')).toBeUndefined();
    });

    it('should return false if road not found for deletion', () => {
      const deleteSuccess = roadDataManager.deleteRoad('non-existent-id');
      expect(deleteSuccess).toBe(false);
    });
  });

  // --- Alignment Management ---
  describe('Alignment Management', () => {
    let roadId: string;
    beforeEach(() => {
      roadId = roadDataManager.addRoad(mockRoadData('Test Road for Alignments')) as string;
    });

    it('should add an alignment to a road', () => {
      const newAlignmentId = roadDataManager.addAlignmentToRoad(roadId, mockAlignmentData('Pavement'));
      expect(newAlignmentId).toBe('uuid-2');
      const road = roadDataManager.getRoad(roadId);
      expect(road?.alignments.length).toBe(1);
      expect(road?.alignments[0].name).toBe('Pavement');
      expect(road?.alignments[0].roadId).toBe(roadId);
    });

    it('should get an alignment by road and alignment ID', () => {
      const alignmentId = roadDataManager.addAlignmentToRoad(roadId, mockAlignmentData('Drainage'));
      const alignment = roadDataManager.getAlignment(roadId, alignmentId!);
      expect(alignment).toBeDefined();
      expect(alignment?.name).toBe('Drainage');
    });

    it('should return undefined if road or alignment not found', () => {
      roadDataManager.addAlignmentToRoad(roadId, mockAlignmentData('Footpath'));
      expect(roadDataManager.getAlignment('non-existent-road', 'uuid-2')).toBeUndefined();
      expect(roadDataManager.getAlignment(roadId, 'non-existent-align')).toBeUndefined();
    });
  });

  // --- Structure Management ---
  describe('Structure Management', () => {
    let roadId: string;
    beforeEach(() => {
      roadId = roadDataManager.addRoad(mockRoadData('Test Road for Structures')) as string;
    });

    it('should add a structure to a road', () => {
      const newStructureId = roadDataManager.addStructureToRoad(roadId, mockStructureData('Culvert 1'));
      expect(newStructureId).toBe('uuid-2');
      const road = roadDataManager.getRoad(roadId);
      expect(road?.structures.length).toBe(1);
      expect(road?.structures[0].name).toBe('Culvert 1');
      expect(road?.structures[0].roadId).toBe(roadId);
    });

    it('should get a structure by road and structure ID', () => {
      const structureId = roadDataManager.addStructureToRoad(roadId, mockStructureData('Bridge A'));
      const structure = roadDataManager.getStructure(roadId, structureId!);
      expect(structure).toBeDefined();
      expect(structure?.name).toBe('Bridge A');
    });

    it('should return undefined if road or structure not found', () => {
      roadDataManager.addStructureToRoad(roadId, mockStructureData('Bridge A'));
      expect(roadDataManager.getStructure('non-existent-road', 'uuid-2')).toBeUndefined();
      expect(roadDataManager.getStructure(roadId, 'non-existent-struct')).toBeUndefined();
    });
  });

  // --- Validation Tasks ---
  describe('Validation', () => {
    let roadId: string;
    let alignmentId: string;
    let structureId: string;

    beforeEach(() => {
      roadId = roadDataManager.addRoad(mockRoadData('Validation Road')) as string; // uuid-1

      // Add a valid alignment
      alignmentId = roadDataManager.addAlignmentToRoad(roadId, {
        name: 'Valid Alignment', 
        type: 'pavement',
        coordinates: [[0, 0], [1, 1], [2, 2]],
        chainagePoints: [
          { distance: 0, chainage: '0+000', point: { lat: 0, lng: 0 } },
          { distance: 500, chainage: '0+500', point: { lat: 1, lng: 1 } },
          { distance: 1000, chainage: '1+000', point: { lat: 2, lng: 2 } }
        ], 
        totalLength: 1000
      }) as string; // uuid-2

      // Add a structure
      structureId = roadDataManager.addStructureToRoad(roadId, mockStructureData('Test Structure', 'culvert', '0+300')) as string; // uuid-3
    });

    it('should validate alignment chainage sequence (valid)', () => {
      expect(roadDataManager.validateChainage(roadId, alignmentId)).toBe(true);
    });

    it('should fail validation if alignment chainage sequence is decreasing', () => {
      const alignment = roadDataManager.getAlignment(roadId, alignmentId)!;
      alignment.chainagePoints.push({ distance: 1400, chainage: '0+400', point: { lat: 1.5, lng: 1.5 } }); // Incorrect order
      expect(roadDataManager.validateChainage(roadId, alignmentId)).toBe(false);
    });

    it('should fail validation if alignment chainage is invalid string', () => {
      const alignment = roadDataManager.getAlignment(roadId, alignmentId)!;
      alignment.chainagePoints[1].chainage = 'abc'; // Invalid chainage
      expect(roadDataManager.validateChainage(roadId, alignmentId)).toBe(false);
    });

    it('should validate structure chainage (valid within bounds)', () => {
      expect(roadDataManager.validateChainage(roadId, undefined, structureId)).toBe(true);
    });

    it('should warn if structure chainage is outside road bounds', () => {
      const farStructureId = roadDataManager.addStructureToRoad(roadId, { ...mockStructureData('Far Structure', 'bridge', '10+000') }) as string; // uuid-4
      roadDataManager.updateRoad(roadId, { geometry: [{ lat: 0, lng: 0 }, { lat: 1, lng: 1 }] });
      const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      expect(roadDataManager.validateChainage(roadId, undefined, farStructureId)).toBe(true);
      expect(consoleWarnSpy).toHaveBeenCalled();
      consoleWarnSpy.mockRestore();
    });

    it('should fail validation if structure chainage is an invalid string', () => {
      const structure = roadDataManager.getStructure(roadId, structureId)!;
      structure.chainage = 'invalid';
      expect(roadDataManager.validateChainage(roadId, undefined, structureId)).toBe(false);
    });

    it('should return false if road not found for validation', () => {
      expect(roadDataManager.validateChainage('non-existent-road')).toBe(false);
    });
  });

  // --- Querying Tasks ---
  describe('Querying', () => {
    let road1Id: string, road2Id: string, road3Id: string;

    beforeEach(() => {
      road1Id = roadDataManager.addRoad(mockRoadData('Road Alpha')) as string;
      road2Id = roadDataManager.addRoad(mockRoadData('Road Beta')) as string;
      road3Id = roadDataManager.addRoad(mockRoadData('Road Gamma')) as string;

      roadDataManager.addStructureToRoad(road1Id, { ...mockStructureData('Struct A1', 'culvert', '0+250') });
      roadDataManager.addAlignmentToRoad(road1Id, { name: 'Align A1', type: 'pavement', coordinates: [], chainagePoints: [
        { distance: 0, chainage: '0+000', point: { lat: 0, lng: 0 } },
        { distance: 500, chainage: '0+500', point: { lat: 1, lng: 1 } },
        { distance: 1000, chainage: '1+000', point: { lat: 2, lng: 2 } }
      ], totalLength: 1000 });

      roadDataManager.addStructureToRoad(road2Id, { ...mockStructureData('Struct B1', 'bridge', '0+800') });
      roadDataManager.addAlignmentToRoad(road2Id, { name: 'Align B1', type: 'drainage', coordinates: [], chainagePoints: [
        { distance: 700, chainage: '0+700', point: { lat: 7, lng: 7 } },
        { distance: 900, chainage: '0+900', point: { lat: 9, lng: 9 } }
      ], totalLength: 1000 });

      roadDataManager.addStructureToRoad(road3Id, { ...mockStructureData('Struct C1', 'bridge', '5+000') });
      roadDataManager.addAlignmentToRoad(road3Id, { name: 'Align C1', type: 'pavement', coordinates: [], chainagePoints: [
        { distance: 4500, chainage: '4+500', point: { lat: 45, lng: 45 } },
        { distance: 5500, chainage: '5+500', point: { lat: 55, lng: 55 } }
      ], totalLength: 10000 });
    });

    describe('findRoadsByChainageRange', () => {
      it('should find roads containing elements within the range', () => {
        const roads = roadDataManager.findRoadsByChainageRange('0+100', '0+400');
        expect(roads.length).toBe(1);
        expect(roads[0].id).toBe(road1Id);
      });

      it('should find roads with elements spanning across the range', () => {
        const roads = roadDataManager.findRoadsByChainageRange('0+400', '0+600');
        expect(roads.length).toBe(1);
        expect(roads[0].id).toBe(road1Id);
      });

      it('should find roads with elements at the start/end of the range', () => {
        const roads = roadDataManager.findRoadsByChainageRange('0+000', '0+500');
        expect(roads.length).toBe(1);
        expect(roads[0].id).toBe(road1Id);
      });

      it('should return an empty array if no elements are within the range', () => {
        const roads = roadDataManager.findRoadsByChainageRange('2+000', '3+000');
        expect(roads.length).toBe(0);
      });

      it('should handle invalid chainage range', () => {
        const roads = roadDataManager.findRoadsByChainageRange('1+000', '0+000');
        expect(roads.length).toBe(0);
        // We don't expect it to throw, just return empty
        const roads2 = roadDataManager.findRoadsByChainageRange('abc', '0+500');
        expect(roads2.length).toBe(0);
      });
    });

    describe('findStructuresByRoadIdAndChainageRange', () => {
      it('should find structures for a given road within the range', () => {
        const structures = roadDataManager.findStructuresByRoadIdAndChainageRange(road1Id, '0+100', '0+400');
        expect(structures.length).toBe(1);
      });

      it('should find multiple structures within the range if they exist', () => {
        roadDataManager.addStructureToRoad(road1Id, { ...mockStructureData('Struct A2', 'bridge', '0+350') });
        const structures = roadDataManager.findStructuresByRoadIdAndChainageRange(road1Id, '0+100', '0+400');
        expect(structures.length).toBe(2);
      });

      it('should return an empty array if no structures are within range for the road', () => {
        const structures = roadDataManager.findStructuresByRoadIdAndChainageRange(road1Id, '1+000', '2+000');
        expect(structures.length).toBe(0);
      });

      it('should return empty array if road ID is not found', () => {
        const structures = roadDataManager.findStructuresByRoadIdAndChainageRange('non-existent-road', '0+000', '1+000');
        expect(structures.length).toBe(0);
      });

      it('should handle invalid chainage range', () => {
        const structures = roadDataManager.findStructuresByRoadIdAndChainageRange(road1Id, '1+000', '0+000');
        expect(structures.length).toBe(0);
      });
    });
  });
});
