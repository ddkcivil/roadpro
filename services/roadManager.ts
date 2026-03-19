import { Road, Alignment, Structure, ChainagePoint, ProjectPoint, RoadProject, Chainage, parseChainage, formatChainage } from '../models/roadTypes';
import { v4 as uuidv4 } from 'uuid';
import RoadModel, { RoadDocument } from './database/roadModels';
import connectToDatabase from './database/mongodb';
import { parseKML } from './kmlParser';

export class RoadDataManager {
  private mongoose: typeof import('mongoose') | null = null;

  constructor() {
    // MongoDB connection will be established on first operation
  }

  private async ensureConnected(): Promise<typeof import('mongoose')> {
    if (!this.mongoose) {
      this.mongoose = await connectToDatabase();
    }
    return this.mongoose;
  }

  /**
   * Adds a new road to the manager.
   * @param road The road object to add.
   * @returns The ID of the added road, or null if a road with the same ID already exists.
   */
  public async addRoad(road: Omit<Road, 'id'>): Promise<string | null> {
    await this.ensureConnected();
    const id = uuidv4();
    const newRoad: Road & { _id?: any } = { ...road, id };
    try {
      const doc = new RoadModel(newRoad);
      await doc.save();
      console.log(`Road "${road.name}" added with ID: ${id}`);
      return id;
    } catch (error) {
      console.error(`Failed to add road "${road.name}":`, error);
      return null;
    }
  }

  /**
   * Retrieves a road by its ID.
   * @param roadId The ID of the road to retrieve.
   * @returns The road object, or null if not found.
   */
  public async getRoad(roadId: string): Promise<Road | null> {
    await this.ensureConnected();
    try {
      const doc = await RoadModel.findOne({ id: roadId });
      return doc ? doc.toObject() as Road : null;
    } catch (error) {
      console.error(`Failed to get road ${roadId}:`, error);
      return null;
    }
  }

  /**
   * Retrieves all roads managed by this instance.
   * @returns An array of all road objects.
   */
  public async getAllRoads(): Promise<Road[]> {
    await this.ensureConnected();
    try {
      const docs = await RoadModel.find({});
      return docs.map(doc => doc.toObject() as Road);
    } catch (error) {
      console.error('Failed to get all roads:', error);
      return [];
    }
  }

  /**
   * Updates an existing road.
   * @param roadId The ID of the road to update.
   * @param updatedRoadData The partial road data to update.
   * @returns True if the road was updated, false otherwise.
   */
  public async updateRoad(roadId: string, updatedRoadData: Partial<Road>): Promise<boolean> {
    await this.ensureConnected();
    try {
      const result = await RoadModel.findOneAndUpdate({ id: roadId }, updatedRoadData, { new: true });
      if (result) {
        console.log(`Road with ID ${roadId} updated.`);
        return true;
      }
      console.error(`Road with ID ${roadId} not found for update.`);
      return false;
    } catch (error) {
      console.error(`Failed to update road ${roadId}:`, error);
      return false;
    }
  }

  /**
   * Deletes a road by its ID.
   * @param roadId The ID of the road to delete.
   * @returns True if the road was deleted, false otherwise.
   */
  public async deleteRoad(roadId: string): Promise<boolean> {
    await this.ensureConnected();
    try {
      const result = await RoadModel.findOneAndDelete({ id: roadId });
      if (result) {
        console.log(`Road with ID ${roadId} deleted.`);
        return true;
      }
      console.error(`Road with ID ${roadId} not found for deletion.`);
      return false;
    } catch (error) {
      console.error(`Failed to delete road ${roadId}:`, error);
      return false;
    }
  }

  // --- Alignment Management ---

  /**
   * Adds an alignment to a specific road.
   * @param roadId The ID of the road to add the alignment to.
   * @param alignment The alignment object to add.
   * @returns The ID of the added alignment, or null if road not found or alignment ID exists.
   */
  public async addAlignmentToRoad(roadId: string, alignment: Omit<Alignment, 'id' | 'roadId'>): Promise<string | null> {
    await this.ensureConnected();
    try {
      const roadDoc = await RoadModel.findOne({ id: roadId });
      if (!roadDoc) {
        console.error(`Road with ID ${roadId} not found.`);
        return null;
      }
      const id = uuidv4();
      const newAlignment: Alignment = { ...alignment, id, roadId };
      roadDoc.alignments.push(newAlignment as any);
      await roadDoc.save();
      console.log(`Alignment "${alignment.name}" added to road ${roadId} with ID: ${id}`);
      return id;
    } catch (error) {
      console.error(`Failed to add alignment to road ${roadId}:`, error);
      return null;
    }
  }

  /**
   * Retrieves an alignment by its ID and associated road ID.
   * @param roadId The ID of the road.
   * @param alignmentId The ID of the alignment.
   * @returns The alignment object, or undefined if not found.
   */
  public async getAlignment(roadId: string, alignmentId: string): Promise<Alignment | undefined> {
    const road = await this.getRoad(roadId);
    return road?.alignments.find(a => a.id === alignmentId);
  }

  // --- Structure Management ---

  /**
   * Adds a structure to a specific road.
   * @param roadId The ID of the road to add the structure to.
   * @param structure The structure object to add.
   * @returns The ID of the added structure, or null if road not found or structure ID exists.
   */
  public async addStructureToRoad(roadId: string, structure: Omit<Structure, 'id' | 'roadId'>): Promise<string | null> {
    await this.ensureConnected();
    try {
      const roadDoc = await RoadModel.findOne({ id: roadId });
      if (!roadDoc) {
        console.error(`Road with ID ${roadId} not found.`);
        return null;
      }
      const id = uuidv4();
      const newStructure: Structure = { ...structure, id, roadId };
      roadDoc.structures.push(newStructure as any);
      await roadDoc.save();
      console.log(`Structure "${structure.name}" added to road ${roadId} with ID: ${id}`);
      return id;
    } catch (error) {
      console.error(`Failed to add structure to road ${roadId}:`, error);
      return null;
    }
  }

  /**
   * Retrieves a structure by its ID and associated road ID.
   * @param roadId The ID of the road.
   * @param structureId The ID of the structure.
   * @returns The structure object, or undefined if not found.
   */
  public async getStructure(roadId: string, structureId: string): Promise<Structure | undefined> {
    const road = await this.getRoad(roadId);
    return road?.structures.find(s => s.id === structureId);
  }

/**
 * Imports KML data, parses it, and adds the resulting road to the manager.
 * @param kmlContent The KML content as a string.
 * @param roadName The desired name for the road.
 * @returns The ID of the added road, or null if an error occurred.
 */
public async importKml(kmlContent: string, roadName: string): Promise<string | null> {
  console.log(`Importing KML for road: "${roadName}"`);
  try {
    const parsedRoad = await parseKML(kmlContent, roadName);
    if (!parsedRoad) {
      console.error("KML parsing failed to return a road object.");
      return null;
    }
    
    // We pass it to addRoad which generates its own ID and saves to MongoDB.
    const newRoadId = await this.addRoad(parsedRoad);

    if (newRoadId) {
      console.log(`Successfully imported and added road "${roadName}" with ID: ${newRoadId}`);
      return newRoadId;
    } else {
      console.error(`Failed to add parsed road "${roadName}" to RoadDataManager.`);
      return null;
    }

  } catch (error) {
    console.error(`Error during KML import for road "${roadName}":`, error);
    return null;
  }
}

  /**
   * Retrieves all alignments for a specific road.
   * @param roadId The ID of the road.
   * @returns An array of all alignment objects for the road, or an empty array if the road is not found.
   */
  public async getAllAlignmentsForRoad(roadId: string): Promise<Alignment[]> {
    const road = await this.getRoad(roadId);
    return road ? road.alignments : [];
  }

  /**
   * Retrieves all structures for a specific road.
   * @param roadId The ID of the road.
   * @returns An array of all structure objects for the road, or an empty array if the road is not found.
   */
  public async getAllStructuresForRoad(roadId: string): Promise<Structure[]> {
    const road = await this.getRoad(roadId);
    return road ? road.structures : [];
  }

  // --- Validation Tasks (Task 3.2) ---

  /**
   * Validates if chainage points within an alignment are monotonically increasing
   * and if the chainage for a new structure is valid relative to the road.
   * This is a simplified validation; more complex checks might be needed.
   *
   * @param roadId The ID of the road.
   * @param alignmentId The ID of the alignment to validate (optional).
   * @param structureId The ID of the structure to validate (optional).
   * @returns True if validation passes, false otherwise.
   */
  public async validateChainage(roadId: string, alignmentId?: string, structureId?: string): Promise<boolean> {
    const road = await this.getRoad(roadId);
    if (!road) {
      console.error(`Road with ID ${roadId} not found for validation.`);
      return false;
    }

    // Validate alignment chainage points if alignmentId is provided
    if (alignmentId) {
      const alignment = road.alignments.find(a => a.id === alignmentId);
      if (!alignment) {
        console.error(`Alignment with ID ${alignmentId} not found for road ${roadId}.`);
        return false;
      }
      let lastDistanceValue = -1;
      for (const cp of alignment.chainagePoints) {
        try {
          // Use distance for numerical comparison if available, otherwise parse chainage string
          const currentDistanceValue = cp.distance !== undefined ? cp.distance : parseChainage(cp.chainage);
          if (currentDistanceValue < lastDistanceValue) {
            console.error(`Invalid chainage sequence in alignment ${alignmentId} of road ${roadId}: ${cp.chainage} follows ${formatChainage(lastDistanceValue)}`);
            return false;
          }
          lastDistanceValue = currentDistanceValue;
        } catch (e) {
          console.error(`Error parsing chainage "${cp.chainage}" in alignment ${alignmentId} of road ${roadId}:`, e);
          return false;
        }
      }
      console.log(`Alignment ${alignmentId} chainage validation passed for road ${roadId}.`);
    }

    // Validate structure chainage if structureId is provided
    if (structureId) {
      const structure = road.structures.find(s => s.id === structureId);
      if (!structure) {
        console.error(`Structure with ID ${structureId} not found for road ${roadId}.`);
        return false;
      }
      try {
        const structureDistanceValue = structure.distance !== undefined ? structure.distance : parseChainage(structure.chainage);
        // Basic check: ensure structure chainage falls within the road's geometry extent if available
        if (road.geometry && road.geometry.length > 0) {
          const minDistance = 0;
          const maxDistance = road.geometry.length * 1000; // Rough estimate if no total length
          if (structureDistanceValue < minDistance || structureDistanceValue > maxDistance) {
            console.warn(`Structure ${structureId} on road ${roadId} has chainage ${structure.chainage} which is outside the primary road geometry extent.`);
          }
        }
        console.log(`Structure ${structureId} chainage validation passed for road ${roadId}.`);
      } catch (e) {
        console.error(`Error parsing structure chainage "${structure.chainage}" for structure ${structureId} on road ${roadId}:`, e);
        return false;
      }
    }

    return true; // All checks passed
  }


  // --- Querying Tasks (Task 3.3) ---

  /**
   * Finds roads that contain alignments or structures within a specified chainage range.
   * @param startChainageString The starting chainage (e.g., "0+000").
   * @param endChainageString The ending chainage (e.g., "5+500").
   * @returns An array of roads matching the criteria.
   */
  public async findRoadsByChainageRange(startChainageString: Chainage, endChainageString: Chainage): Promise<Road[]> {
    const startDistance = parseChainage(startChainageString);
    const endDistance = parseChainage(endChainageString);

    if (isNaN(startDistance) || isNaN(endDistance) || startDistance > endDistance) {
      console.error("Invalid chainage range provided.");
      return [];
    }

    const matchingRoads: Road[] = [];
    const allRoads = await this.getAllRoads();

    for (const road of allRoads) {
      let hasMatchingElement = false;

      // Check structures
      for (const structure of road.structures) {
        try {
          const structureDistance = structure.distance !== undefined ? structure.distance : parseChainage(structure.chainage);
          if (structureDistance >= startDistance && structureDistance <= endDistance) {
            hasMatchingElement = true;
            break;
          }
        } catch (e) {
          console.warn(`Skipping structure ${structure.id} on road ${road.id} due to invalid chainage: ${structure.chainage}`);
        }
      }

      if (hasMatchingElement) {
        matchingRoads.push(road);
        continue;
      }

      // Check alignments
      for (const alignment of road.alignments) {
        for (const cp of alignment.chainagePoints) {
          try {
            const cpDistance = cp.distance !== undefined ? cp.distance : parseChainage(cp.chainage);
            if (cpDistance >= startDistance && cpDistance <= endDistance) {
              hasMatchingElement = true;
              break;
            }
          } catch (e) {
            console.warn(`Skipping alignment ${alignment.id} chainage point for road ${road.id} due to invalid chainage: ${cp.chainage}`);
          }
        }
        if (hasMatchingElement) break;
      }

      if (hasMatchingElement) {
        matchingRoads.push(road);
      }
    }

    return matchingRoads;
  }

  /**
   * Finds all structures for a given road ID that fall within a specified chainage range.
   * @param roadId The ID of the road.
   * @param startChainageString The starting chainage (e.g., "0+000").
   * @param endChainageString The ending chainage (e.g., "5+500").
   * @returns An array of structures matching the criteria.
   */
  public async findStructuresByRoadIdAndChainageRange(roadId: string, startChainageString: Chainage, endChainageString: Chainage): Promise<Structure[]> {
    const road = await this.getRoad(roadId);
    if (!road) {
      console.error(`Road with ID ${roadId} not found for structure query.`);
      return [];
    }

    const startDistance = parseChainage(startChainageString);
    const endDistance = parseChainage(endChainageString);

    if (isNaN(startDistance) || isNaN(endDistance) || startDistance > endDistance) {
      console.error("Invalid chainage range provided for structure query.");
      return [];
    }

    const matchingStructures: Structure[] = [];
    for (const structure of road.structures) {
      try {
        const structureDistance = structure.distance !== undefined ? structure.distance : parseChainage(structure.chainage);
        if (structureDistance >= startDistance && structureDistance <= endDistance) {
          matchingStructures.push(structure);
        }
      } catch (e) {
        console.warn(`Skipping structure ${structure.id} on road ${roadId} due to invalid chainage: ${structure.chainage}`);
      }
    }
    return matchingStructures;
  }
}
