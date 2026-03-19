import { describe, it, expect, vi, beforeEach } from 'vitest';
import { RoadDataManager } from '../services/roadManager';
import { Road, Alignment, Structure, Chainage } from '../models/roadTypes';
import RoadModel from '../services/database/roadModels';
import connectToDatabase from '../services/database/mongodb';

// Mocking dependencies
vi.mock('../services/database/roadModels');
vi.mock('../services/database/mongodb');
vi.mock('uuid', () => ({
  v4: vi.fn(() => 'mock-uuid'),
}));

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
    vi.mocked(connectToDatabase).mockResolvedValue({} as any);
  });

  describe('addRoad', () => {
    it('should save a new road and return its ID', async () => {
      const roadData = mockRoadData('Test Road');
      const saveMock = vi.fn().mockResolvedValue({});
      
      // Mock RoadModel as a constructor
      (RoadModel as any).mockImplementation(function(data: any) {
        return {
          ...data,
          save: saveMock,
        };
      });

      const id = await roadDataManager.addRoad(roadData);

      expect(id).toBe('mock-uuid');
      expect(RoadModel).toHaveBeenCalledWith(expect.objectContaining({
        name: 'Test Road',
        id: 'mock-uuid',
      }));
      expect(saveMock).toHaveBeenCalled();
    });

    it('should return null if saving fails', async () => {
      vi.mocked(RoadModel).mockImplementation(function(data: any) {
        return {
          ...data,
          save: vi.fn().mockRejectedValue(new Error('Save failed')),
        };
      } as any);

      const id = await roadDataManager.addRoad(mockRoadData('Fail Road'));
      expect(id).toBeNull();
    });
  });

  describe('getRoad', () => {
    it('should return a road by ID', async () => {
      const mockRoad = { id: 'road-1', name: 'Road 1', toObject: () => ({ id: 'road-1', name: 'Road 1' }) };
      vi.mocked(RoadModel.findOne).mockResolvedValue(mockRoad as any);

      const road = await roadDataManager.getRoad('road-1');

      expect(road).toEqual({ id: 'road-1', name: 'Road 1' });
      expect(RoadModel.findOne).toHaveBeenCalledWith({ id: 'road-1' });
    });

    it('should return null if road not found', async () => {
      vi.mocked(RoadModel.findOne).mockResolvedValue(null);
      const road = await roadDataManager.getRoad('missing');
      expect(road).toBeNull();
    });
  });

  describe('updateRoad', () => {
    it('should update and return true if road exists', async () => {
      vi.mocked(RoadModel.findOneAndUpdate).mockResolvedValue({ id: 'road-1' } as any);
      const result = await roadDataManager.updateRoad('road-1', { name: 'Updated' });
      expect(result).toBe(true);
      expect(RoadModel.findOneAndUpdate).toHaveBeenCalledWith({ id: 'road-1' }, { name: 'Updated' }, { new: true });
    });

    it('should return false if road not found', async () => {
      vi.mocked(RoadModel.findOneAndUpdate).mockResolvedValue(null);
      const result = await roadDataManager.updateRoad('missing', { name: 'None' });
      expect(result).toBe(false);
    });
  });

  describe('deleteRoad', () => {
    it('should delete and return true if road exists', async () => {
      vi.mocked(RoadModel.findOneAndDelete).mockResolvedValue({ id: 'road-1' } as any);
      const result = await roadDataManager.deleteRoad('road-1');
      expect(result).toBe(true);
      expect(RoadModel.findOneAndDelete).toHaveBeenCalledWith({ id: 'road-1' });
    });
  });

  describe('addAlignmentToRoad', () => {
    it('should add an alignment to an existing road', async () => {
      const mockDoc = {
        alignments: { push: vi.fn() },
        save: vi.fn().mockResolvedValue({}),
      };
      vi.mocked(RoadModel.findOne).mockResolvedValue(mockDoc as any);

      const alignData = mockAlignmentData('Align 1');
      const id = await roadDataManager.addAlignmentToRoad('road-1', alignData);

      expect(id).toBe('mock-uuid');
      expect(mockDoc.alignments.push).toHaveBeenCalledWith(expect.objectContaining({
        name: 'Align 1',
        id: 'mock-uuid',
        roadId: 'road-1',
      }));
      expect(mockDoc.save).toHaveBeenCalled();
    });
  });

  describe('addStructureToRoad', () => {
    it('should add a structure to an existing road', async () => {
      const mockDoc = {
        structures: { push: vi.fn() },
        save: vi.fn().mockResolvedValue({}),
      };
      vi.mocked(RoadModel.findOne).mockResolvedValue(mockDoc as any);

      const structData = mockStructureData('Struct 1');
      const id = await roadDataManager.addStructureToRoad('road-1', structData);

      expect(id).toBe('mock-uuid');
      expect(mockDoc.structures.push).toHaveBeenCalledWith(expect.objectContaining({
        name: 'Struct 1',
        id: 'mock-uuid',
        roadId: 'road-1',
      }));
      expect(mockDoc.save).toHaveBeenCalled();
    });
  });

  describe('Querying', () => {
    it('should find roads by chainage range', async () => {
      const mockRoads = [
        {
          id: 'road-1',
          structures: [{ distance: 200, chainage: '0+200' }],
          alignments: [],
          toObject: () => ({ id: 'road-1', structures: [{ distance: 200, chainage: '0+200' }], alignments: [] })
        },
        {
          id: 'road-2',
          structures: [],
          alignments: [{ chainagePoints: [{ distance: 800, chainage: '0+800' }] }],
          toObject: () => ({ id: 'road-2', structures: [], alignments: [{ chainagePoints: [{ distance: 800, chainage: '0+800' }] }] })
        }
      ];
      vi.mocked(RoadModel.find).mockResolvedValue(mockRoads as any);

      const results = await roadDataManager.findRoadsByChainageRange('0+100', '0+300');

      expect(results).toHaveLength(1);
      expect(results[0].id).toBe('road-1');
    });
  });
});
