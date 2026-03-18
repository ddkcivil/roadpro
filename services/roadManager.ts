import { Road, Alignment, Structure, ChainagePoint, ProjectPoint, RoadProject, Chainage, parseChainage, formatChainage } from '../models/roadTypes';
import { v4 as uuidv4 } from 'uuid'; // Assuming uuid is available for generating IDs

// Interface for an in-memory store of roads
interface RoadStore {
  [roadId: string]: Road;
}

export class RoadDataManager {
  private roads: RoadStore = {};

  constructor() {
    // You might want to load existing data here from a persistent store
    // For now, it starts with an empty in-memory store
  }

  /**
   * Adds a new road to the manager.
   * @param road The road object to add.
   * @returns The ID of the added road, or null if a road with the same ID already exists.
   */
  public addRoad(road: Omit<Road, 'id'>): string | null {
    const id = uuidv4();
    if (this.roads[id]) {
      console.warn(`Road with ID ${id} already exists.`);
      return null;
    }
    const newRoad: Road = { ...road, id };
    this.roads[id] = newRoad;
    console.log(`Road "${road.name}" added with ID: ${id}`);
    return id;
  }

  /**
   * Retrieves a road by its ID.
   * @param roadId The ID of the road to retrieve.
   * @returns The road object, or undefined if not found.
   */
  public getRoad(roadId: string): Road | undefined {
    return this.roads[roadId];
  }

  /**
   * Retrieves all roads managed by this instance.
   * @returns An array of all road objects.
   */
  public getAllRoads(): Road[] {
    return Object.values(this.roads);
  }

  /**
   * Updates an existing road.
   * @param roadId The ID of the road to update.
   * @param updatedRoadData The partial road data to update.
   * @returns True if the road was updated, false otherwise.
   */
  public updateRoad(roadId: string, updatedRoadData: Partial<Road>): boolean {
    if (!this.roads[roadId]) {
      console.error(`Road with ID ${roadId} not found for update.`);
      return false;
    }
    // Deep merge or selective update of properties
    this.roads[roadId] = { ...this.roads[roadId], ...updatedRoadData };
    console.log(`Road with ID ${roadId} updated.`);
    return true;
  }

  /**
   * Deletes a road by its ID.
   * @param roadId The ID of the road to delete.
   * @returns True if the road was deleted, false otherwise.
   */
  public deleteRoad(roadId: string): boolean {
    if (!this.roads[roadId]) {
      console.error(`Road with ID ${roadId} not found for deletion.`);
      return false;
    }
    delete this.roads[roadId];
    console.log(`Road with ID ${roadId} deleted.`);
    return true;
  }

  // --- Alignment Management ---

  /**
   * Adds an alignment to a specific road.
   * @param roadId The ID of the road to add the alignment to.
   * @param alignment The alignment object to add.
   * @returns The ID of the added alignment, or null if road not found or alignment ID exists.
   */
  public addAlignmentToRoad(roadId: string, alignment: Omit<Alignment, 'id' | 'roadId'>): string | null {
    const road = this.getRoad(roadId);
    if (!road) {
      console.error(`Road with ID ${roadId} not found.`);
      return null;
    }
    const id = uuidv4();
    if (road.alignments.some(a => a.id === id)) {
      console.warn(`Alignment with ID ${id} already exists for road ${roadId}.`);
      return null;
    }
    const newAlignment: Alignment = { ...alignment, id, roadId };
    road.alignments.push(newAlignment);
    console.log(`Alignment "${alignment.name}" added to road ${roadId} with ID: ${id}`);
    return id;
  }

  /**
   * Retrieves an alignment by its ID and associated road ID.
   * @param roadId The ID of the road.
   * @param alignmentId The ID of the alignment.
   * @returns The alignment object, or undefined if not found.
   */
  public getAlignment(roadId: string, alignmentId: string): Alignment | undefined {
    const road = this.getRoad(roadId);
    return road?.alignments.find(a => a.id === alignmentId);
  }

  // --- Structure Management ---

  /**
   * Adds a structure to a specific road.
   * @param roadId The ID of the road to add the structure to.
   * @param structure The structure object to add.
   * @returns The ID of the added structure, or null if road not found or structure ID exists.
   */
  public addStructureToRoad(roadId: string, structure: Omit<Structure, 'id' | 'roadId'>): string | null {
    const road = this.getRoad(roadId);
    if (!road) {
      console.error(`Road with ID ${roadId} not found.`);
      return null;
    }
    const id = uuidv4();
    if (road.structures.some(s => s.id === id)) {
      console.warn(`Structure with ID ${id} already exists for road ${roadId}.`);
      return null;
    }
    const newStructure: Structure = { ...structure, id, roadId };
    road.structures.push(newStructure);
    console.log(`Structure "${structure.name}" added to road ${roadId} with ID: ${id}`);
    return id;
  }

  /**
   * Retrieves a structure by its ID and associated road ID.
   * @param roadId The ID of the road.
   * @param structureId The ID of the structure.
   * @returns The structure object, or undefined if not found.
   */
  public getStructure(roadId: string, structureId: string): Structure | undefined {
    const road = this.getRoad(roadId);
    return road?.structures.find(s => s.id === structureId);
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
  public validateChainage(roadId: string, alignmentId?: string, structureId?: string): boolean {
    const road = this.getRoad(roadId);
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
      let lastChainageValue = -1; // Initialize with a value less than any possible chainage
      for (const cp of alignment.chainagePoints) {
        try {
          const currentChainageValue = parseChainage(cp.chainage);
          if (currentChainageValue < lastChainageValue) {
            console.error(`Invalid chainage sequence in alignment ${alignmentId} of road ${roadId}: ${cp.chainage} follows ${formatChainage(lastChainageValue)}`);
            return false;
          }
          lastChainageValue = currentChainageValue;
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
        const structureChainageValue = parseChainage(structure.chainage);
        // Basic check: ensure structure chainage falls within the road's geometry extent if available
        if (road.geometry && road.geometry.length > 0) {
          const minChainage = parseChainage(formatChainage(0)); // Start of road geometry
          const maxChainage = parseChainage(formatChainage(road.geometry.length * 1000)); // Approx end of road geometry based on points count
          if (structureChainageValue < minChainage || structureChainageValue > maxChainage) {
            console.warn(`Structure ${structureId} on road ${roadId} has chainage ${structure.chainage} which is outside the primary road geometry extent.`);
            // Depending on requirements, this could be an error or a warning. For now, it's a warning.
          }
        }
        // More advanced validation could involve checking against alignment chainages, etc.
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
  public findRoadsByChainageRange(startChainageString: Chainage, endChainageString: Chainage): Road[] {
    const startChainage = parseChainage(startChainageString);
    const endChainage = parseChainage(endChainageString);

    if (isNaN(startChainage) || isNaN(endChainage) || startChainage > endChainage) {
      console.error("Invalid chainage range provided.");
      return [];
    }

    const matchingRoads: Road[] = [];

    for (const road of this.getAllRoads()) {
      let hasMatchingElement = false;

      // Check structures
      for (const structure of road.structures) {
        try {
          const structureChainage = parseChainage(structure.chainage);
          if (structureChainage >= startChainage && structureChainage <= endChainage) {
            hasMatchingElement = true;
            break;
          }
        } catch (e) {
          console.warn(`Skipping structure ${structure.id} on road ${road.id} due to invalid chainage: ${structure.chainage}`);
        }
      }

      if (hasMatchingElement) {
        matchingRoads.push(road);
        continue; // Move to the next road if a structure matched
      }

      // Check alignments (chainage points within alignments)
      for (const alignment of road.alignments) {
        for (const cp of alignment.chainagePoints) {
          try {
            const cpChainage = parseChainage(cp.chainage);
            if (cpChainage >= startChainage && cpChainage <= endChainage) {
              hasMatchingElement = true;
              break; // Found a matching chainage point in this alignment
            }
          } catch (e) {
            console.warn(`Skipping alignment ${alignment.id} chainage point for road ${road.id} due to invalid chainage: ${cp.chainage}`);
          }
        }
        if (hasMatchingElement) break; // Found a matching alignment, no need to check others for this road
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
  public findStructuresByRoadIdAndChainageRange(roadId: string, startChainageString: Chainage, endChainageString: Chainage): Structure[] {
    const road = this.getRoad(roadId);
    if (!road) {
      console.error(`Road with ID ${roadId} not found for structure query.`);
      return [];
    }

    const startChainage = parseChainage(startChainageString);
    const endChainage = parseChainage(endChainageString);

    if (isNaN(startChainage) || isNaN(endChainage) || startChainage > endChainage) {
      console.error("Invalid chainage range provided for structure query.");
      return [];
    }

    const matchingStructures: Structure[] = [];
    for (const structure of road.structures) {
      try {
        const structureChainage = parseChainage(structure.chainage);
        if (structureChainage >= startChainage && structureChainage <= endChainage) {
          matchingStructures.push(structure);
        }
      } catch (e) {
        console.warn(`Skipping structure ${structure.id} on road ${roadId} due to invalid chainage: ${structure.chainage}`);
      }
    }
    return matchingStructures;
  }

  // Additional query methods can be added here as needed, e.g.:
  // - getAlignmentsForRoad(roadId: string)
  // - getStructuresForRoad(roadId: string)
  // - findAlignmentById(roadId: string, alignmentId: string)
  // - etc.
}
