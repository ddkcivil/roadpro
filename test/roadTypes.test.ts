// Mocking uuidv4 for predictable IDs in tests
jest.mock('uuid', () => ({
  v4: jest.fn(),
}));

// Mocking imports from roadTypes if necessary, or assuming they are available.
// For simplicity, we assume parseChainage and formatChainage are available.
// If they are part of the RoadDataManager's direct imports and need specific mocking,
// that would be added here. For now, we'll rely on them being correctly imported.

import { RoadDataManager } from '../services/roadManager';
import { Road, Alignment, Structure, Chainage, ProjectPoint } from '../models/roadTypes';
import { v4 as uuidv4 } from 'uuid'; // Import the mocked uuidv4

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
  chainagePoints: [{ chainage: '0+000', point: { lat: 20, lng: 20 } }, { chainage: '0+500', point: { lat: 21, lng: 21 } }],
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
  let mockUuidV4: jest.Mock;

  beforeEach(() => {
    // Reset mocks before each test
    jest.clearAllMocks();

    // Mock uuidv4 to return predictable IDs
    mockUuidV4 = uuidv4 as jest.Mock;
    mockUuidV4.mockReturnValueOnce('road-id-1').mockReturnValueOnce('road-id-2')
              .mockReturnValueOnce('align-id-1').mockReturnValueOnce('align-id-2')
              .mockReturnValueOnce('struct-id-1').mockReturnValueOnce('struct-id-2');

    roadDataManager = new RoadDataManager();
  });

  // --- Road CRUD Operations ---
  describe('Road CRUD Operations', () => {
    it('should add a road and return its ID', () => {
      const newRoadId = roadDataManager.addRoad(mockRoadData('Main Street'));
      expect(newRoadId).toBe('road-id-1');
      expect(roadDataManager.getRoad('road-id-1')).toBeDefined();
      expect(roadDataManager.getRoad('road-id-1')?.name).toBe('Main Street');
    });

    it('should return null if adding a road with an existing ID (though uuidv4 makes this unlikely)', () => {
      // This test scenario is hard to hit with uuidv4, but conceptually checks idempotency if IDs were controlled
      mockUuidV4.mockReturnValueOnce('fixed-road-id');
      roadDataManager.addRoad(mockRoadData('Street A'));
      mockUuidV4.mockReturnValueOnce('fixed-road-id'); // Same ID
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
      const road = roadDataManager.getRoad('road-id-1');
      expect(road).toBeDefined();
      expect(road?.name).toBe('Specific Road');
    });

    it('should return undefined if road not found by ID', () => {
      const road = roadDataManager.getRoad('non-existent-id');
      expect(road).toBeUndefined();
    });

    it('should update a road', () => {
      roadDataManager.addRoad(mockRoadData('Old Name'));
      const updateSuccess = roadDataManager.updateRoad('road-id-1', { name: 'New Name', chainageOffset: 100 });
      expect(updateSuccess).toBe(true);
      const updatedRoad = roadDataManager.getRoad('road-id-1');
      expect(updatedRoad?.name).toBe('New Name');
      expect(updatedRoad?.chainageOffset).toBe(100);
    });

    it('should return false if road not found for update', () => {
      const updateSuccess = roadDataManager.updateRoad('non-existent-id', { name: 'Test' });
      expect(updateSuccess).toBe(false);
    });

    it('should delete a road', () => {
      roadDataManager.addRoad(mockRoadData('Road to Delete'));
      const deleteSuccess = roadDataManager.deleteRoad('road-id-1');
      expect(deleteSuccess).toBe(true);
      expect(roadDataManager.getRoad('road-id-1')).toBeUndefined();
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
      roadId = roadDataManager.addRoad(mockRoadData('Test Road for Alignments'));
    });

    it('should add an alignment to a road', () => {
      const newAlignmentId = roadDataManager.addAlignmentToRoad(roadId!, mockAlignmentData('Pavement'));
      expect(newAlignmentId).toBe('align-id-1');
      const road = roadDataManager.getRoad(roadId!);
      expect(road?.alignments.length).toBe(1);
      expect(road?.alignments[0].name).toBe('Pavement');
      expect(road?.alignments[0].roadId).toBe(roadId);
    });

    it('should get an alignment by road and alignment ID', () => {
      roadDataManager.addAlignmentToRoad(roadId!, mockAlignmentData('Drainage'));
      const alignment = roadDataManager.getAlignment(roadId!, 'align-id-1');
      expect(alignment).toBeDefined();
      expect(alignment?.name).toBe('Drainage');
    });

    it('should return undefined if road or alignment not found', () => {
      roadDataManager.addAlignmentToRoad(roadId!, mockAlignmentData('Footpath'));
      expect(roadDataManager.getAlignment('non-existent-road', 'align-id-1')).toBeUndefined();
      expect(roadDataManager.getAlignment(roadId!, 'non-existent-align')).toBeUndefined();
    });
  });

  // --- Structure Management ---
  describe('Structure Management', () => {
    let roadId: string;
    beforeEach(() => {
      roadId = roadDataManager.addRoad(mockRoadData('Test Road for Structures'));
    });

    it('should add a structure to a road', () => {
      const newStructureId = roadDataManager.addStructureToRoad(roadId!, mockStructureData('Culvert 1'));
      expect(newStructureId).toBe('struct-id-1');
      const road = roadDataManager.getRoad(roadId!);
      expect(road?.structures.length).toBe(1);
      expect(road?.structures[0].name).toBe('Culvert 1');
      expect(road?.structures[0].roadId).toBe(roadId);
    });

    it('should get a structure by road and structure ID', () => {
      roadDataManager.addStructureToRoad(roadId!, mockStructureData('Bridge A'));
      const structure = roadDataManager.getStructure(roadId!, 'struct-id-1');
      expect(structure).toBeDefined();
      expect(structure?.name).toBe('Bridge A');
    });

    it('should return undefined if road or structure not found', () => {
      roadDataManager.addStructureToRoad(roadId!, mockStructureData('Manhole'));
      expect(roadDataManager.getStructure('non-existent-road', 'struct-id-1')).toBeUndefined();
      expect(roadDataManager.getStructure(roadId!, 'non-existent-struct')).toBeUndefined();
    });
  });

  // --- Validation Tasks ---
  describe('Validation', () => {
    let roadId: string;
    let road: Road;

    beforeEach(() => {
      roadId = roadDataManager.addRoad(mockRoadData('Validation Road'));
      road = roadDataManager.getRoad(roadId!)!;

      // Add a valid alignment
      const alignmentId = roadDataManager.addAlignmentToRoad(roadId!, {
        name: 'Valid Alignment', type: 'pavement',
        chainagePoints: [
          { chainage: '0+000', point: { lat: 0, lng: 0 } },
          { chainage: '0+500', point: { lat: 1, lng: 1 } },
          { chainage: '1+000', point: { lat: 2, lng: 2 } }
        ], totalLength: 1000
      });

      // Add a structure
      const structureId = roadDataManager.addStructureToRoad(roadId!, mockStructureData('Test Structure', 'culvert', '0+300'));
    });

    it('should validate alignment chainage sequence (valid)', () => {
      expect(roadDataManager.validateChainage(roadId!, 'align-id-1')).toBe(true);
    });

    it('should fail validation if alignment chainage sequence is decreasing', () => {
      // Manually corrupt alignment chainage for testing
      const alignment = roadDataManager.getAlignment(roadId!, 'align-id-1')!;
      alignment.chainagePoints.push({ chainage: '0+400', point: { lat: 1.5, lng: 1.5 } }); // Incorrect order
      expect(roadDataManager.validateChainage(roadId!, 'align-id-1')).toBe(false);
    });

    it('should fail validation if alignment chainage is invalid string', () => {
      const alignment = roadDataManager.getAlignment(roadId!, 'align-id-1')!;
      alignment.chainagePoints[1].chainage = 'abc'; // Invalid chainage
      expect(roadDataManager.validateChainage(roadId!, 'align-id-1')).toBe(false);
    });

    it('should validate structure chainage (valid within bounds)', () => {
      // Assumes road.geometry has length ~1000m from mockRoadData and structure chainage is '0+300'
      expect(roadDataManager.validateChainage(roadId!, undefined, 'struct-id-1')).toBe(true);
    });

    it('should warn if structure chainage is outside road bounds', () => {
      // Add a structure with a chainage far beyond the typical road length
      roadDataManager.addStructureToRoad(roadId!, { ...mockStructureData('Far Structure', 'bridge', '10+000'), chainage: '10+000' });
      // Mock the road's geometry to be shorter for this test
      roadDataManager.updateRoad(roadId!, { geometry: [{ lat: 0, lng: 0 }, { lat: 1, lng: 1 }] }); // ~100m road length
      const consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
      expect(roadDataManager.validateChainage(roadId!, undefined, 'struct-id-2')).toBe(true); // Should still return true, but with a warning
      expect(consoleWarnSpy).toHaveBeenCalled();
      consoleWarnSpy.mockRestore();
    });

    it('should fail validation if structure chainage is an invalid string', () => {
      const structure = roadDataManager.getStructure(roadId!, 'struct-id-1')!;
      structure.chainage = 'invalid';
      expect(roadDataManager.validateChainage(roadId!, undefined, 'struct-id-1')).toBe(false);
    });

    it('should return false if road not found for validation', () => {
      expect(roadDataManager.validateChainage('non-existent-road')).toBe(false);
    });
  });

  // --- Querying Tasks ---
  describe('Querying', () => {
    let road1Id: string, road2Id: string, road3Id: string;
    let road1: Road, road2: Road, road3: Road;

    beforeEach(() => {
      // Setup roads, alignments, and structures
      road1Id = roadDataManager.addRoad(mockRoadData('Road Alpha'));
      road2Id = roadDataManager.addRoad(mockRoadData('Road Beta'));
      road3Id = roadDataManager.addRoad(mockRoadData('Road Gamma'));
      road1 = roadDataManager.getRoad(road1Id!)!;
      road2 = roadDataManager.getRoad(road2Id!)!;
      road3 = roadDataManager.getRoad(road3Id!)!;

      // Road 1: Structure at 0+250, Alignment points at 0+000, 0+500, 1+000
      roadDataManager.addStructureToRoad(road1Id!, { ...mockStructureData('Struct A1', 'culvert', '0+250'), name: 'Struct A1' });
      roadDataManager.addAlignmentToRoad(road1Id!, { name: 'Align A1', type: 'pavement', chainagePoints: [
        { chainage: '0+000', point: { lat: 0, lng: 0 } },
        { chainage: '0+500', point: { lat: 1, lng: 1 } },
        { chainage: '1+000', point: { lat: 2, lng: 2 } }
      ], totalLength: 1000 });

      // Road 2: Structure at 0+800, Alignment points at 0+700, 0+900
      roadDataManager.addStructureToRoad(road2Id!, { ...mockStructureData('Struct B1', 'bridge', '0+800'), name: 'Struct B1' });
      roadDataManager.addAlignmentToRoad(road2Id!, { name: 'Align B1', type: 'drainage', chainagePoints: [
        { chainage: '0+700', point: { lat: 7, lng: 7 } },
        { chainage: '0+900', point: { lat: 9, lng: 9 } }
      ], totalLength: 1000 });

      // Road 3: No elements relevant to chainage range 0+000 to 0+500
      roadDataManager.addStructureToRoad(road3Id!, { ...mockStructureData('Struct C1', 'manhole', '5+000'), name: 'Struct C1' });
      roadDataManager.addAlignmentToRoad(road3Id!, { name: 'Align C1', type: 'pavement', chainagePoints: [
        { chainage: '4+500', point: { lat: 45, lng: 45 } },
        { chainage: '5+500', point: { lat: 55, lng: 55 } }
      ], totalLength: 10000 });
    });

    describe('findRoadsByChainageRange', () => {
      it('should find roads containing elements within the range', () => {
        const roads = roadDataManager.findRoadsByChainageRange('0+100', '0+400'); // Matches Struct A1 (0+250) and Align A1 (0+000) which is before, but the range starts at 0+100.
        // Rerun: Struct A1 (0+250) is within 0+100 to 0+400. road1 should be found.
        // Align A1 points: 0+000, 0+500, 1+000. 0+000 is before range, 0+500 is after.
        // Road 2: Struct B1 (0+800) is outside. Align B1 points: 0+700, 0+900. Both outside.
        expect(roads.length).toBe(1);
        expect(roads[0].id).toBe(road1Id);
      });

      it('should find roads with elements spanning across the range', () => {
        const roads = roadDataManager.findRoadsByChainageRange('0+400', '0+600'); // Matches Align A1 (0+500)
        expect(roads.length).toBe(1);
        expect(roads[0].id).toBe(road1Id);
      });

      it('should find roads with elements at the start/end of the range', () => {
        const roads = roadDataManager.findRoadsByChainageRange('0+000', '0+500'); // Matches Align A1 (0+000, 0+500), Struct A1 (0+250)
        expect(roads.length).toBe(1);
        expect(roads[0].id).toBe(road1Id);
      });

      it('should return an empty array if no elements are within the range', () => {
        const roads = roadDataManager.findRoadsByChainageRange('2+000', '3+000');
        expect(roads.length).toBe(0);
      });

      it('should handle invalid chainage range', () => {
        const roads = roadDataManager.findRoadsByChainageRange('1+000', '0+000'); // End < Start
        expect(roads.length).toBe(0);
        const roads2 = roadDataManager.findRoadsByChainageRange('abc', '0+500'); // Invalid start
        expect(roads2.length).toBe(0);
      });
    });

    describe('findStructuresByRoadIdAndChainageRange', () => {
      it('should find structures for a given road within the range', () => {
        const structures = roadDataManager.findStructuresByRoadIdAndChainageRange(road1Id!, '0+100', '0+400'); // Matches Struct A1 (0+250)
        expect(structures.length).toBe(1);
        expect(structures[0].id).toBe('struct-id-1');
      });

      it('should find multiple structures within the range if they exist', () => {
        roadDataManager.addStructureToRoad(road1Id!, { ...mockStructureData('Struct A2', 'bridge', '0+350'), name: 'Struct A2' });
        const structures = roadDataManager.findStructuresByRoadIdAndChainageRange(road1Id!, '0+100', '0+400');
        expect(structures.length).toBe(2);
        expect(structures.some(s => s.id === 'struct-id-1')).toBe(true);
        expect(structures.some(s => s.id === 'struct-id-2')).toBe(true); // Assuming struct-id-2 was added by the beforeEach call
      });

      it('should return an empty array if no structures are within range for the road', () => {
        const structures = roadDataManager.findStructuresByRoadIdAndChainageRange(road1Id!, '1+000', '2+000');
        expect(structures.length).toBe(0);
      });

      it('should return empty array if road ID is not found', () => {
        const structures = roadDataManager.findStructuresByRoadIdAndChainageRange('non-existent-road', '0+000', '1+000');
        expect(structures.length).toBe(0);
      });

      it('should handle invalid chainage range', () => {
        const structures = roadDataManager.findStructuresByRoadIdAndChainageRange(road1Id!, '1+000', '0+000'); // End < Start
        expect(structures.length).toBe(0);
        const structures2 = roadDataManager.findStructuresByRoadIdAndChainageRange(road1Id!, 'abc', '0+500'); // Invalid start
        expect(structures2.length).toBe(0);
      });
    });
  });
});
