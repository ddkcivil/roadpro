import xml2js from 'xml2js';
import * as turf from '@turf/turf';
import type { Feature, LineString, Point as TurfPoint, Polygon as TurfPolygon } from '@turf/helpers';
import { Road, Alignment, Structure, ChainagePoint, Point as ProjectPoint } from '../models/roadTypes'; // Assuming ProjectPoint is the same as our Point interface

// Helper to convert Leaflet-like LatLngExpression ([lat, lng]) to Turf's [lng, lat]
function toTurfCoords(coords: ProjectPoint | [number, number]): turf.Position {
  if (Array.isArray(coords)) {
    return [coords[1], coords[0]]; // [lng, lat]
  }
  return [coords.lng, coords.lat]; // [lng, lat]
}

// Helper to convert Turf's [lng, lat] to our ProjectPoint {lat, lng}
function fromTurfCoords(coords: turf.Position): ProjectPoint {
  return { lat: coords[1], lng: coords[0] };
}

// Helper to extract coordinates from different Turf geometry types
function extractCoordinates(geometry: turf.GeoJSONGeometry): turf.Position[] | turf.Position | turf.Position[][] {
  if (!geometry) return [];
  switch (geometry.type) {
    case 'Point':
      return geometry.coordinates;
    case 'LineString':
      return geometry.coordinates;
    case 'Polygon':
      return geometry.coordinates[0]; // Assuming outer ring for simplicity
    default:
      return [];
  }
}

// Function to determine geometry type from XML placemark
function getGeometryType(placemark: any): 'Point' | 'LineString' | 'Polygon' | null {
  if (placemark.Point?.[0]?.coordinates?.[0]) return 'Point';
  if (placemark.LineString?.[0]?.coordinates?.[0]) return 'LineString';
  if (placemark.Polygon?.[0]?.outerBoundaryIs?.[0]?.LinearRing?.[0]?.coordinates?.[0]) return 'Polygon';
  return null;
}

// Function to parse coordinates from KML string format
function parseKmlCoordinates(coordStr: string): turf.Position[] {
  return coordStr.trim().split(/\s+/).map(coord => {
    const parts = coord.split(',');
    if (parts.length >= 2) {
      const lng = parseFloat(parts[0]);
      const lat = parseFloat(parts[1]);
      return [lng, lat];
    }
    return [NaN, NaN]; // Invalid coordinate
  }).filter(coord => !isNaN(coord[0]));
}

/**
 * Parses KML text to extract Road, Alignments, and Structures.
 * Assumes a primary LineString defines the main road geometry for chainage reference.
 * Other LineStrings are treated as Alignments, and Points/Polygons as Structures.
 * Placemark names are used for type inference (e.g., "Pavement", "Culvert").
 *
 * @param kmlText The KML content as a string.
 * @param roadName The name to assign to the Road entity.
 * @returns A Promise resolving to a Road object with associated alignments and structures.
 */
export async function parseKML(kmlText: string, roadName: string): Promise<Road> {
  const parser = new xml2js.Parser({ explicitArray: false }); // Use explicitArray: false for simpler parsing
  const result = await parser.parseStringPromise(kmlText);

  const placemarks = result.kml?.Document?.Placemark || [];

  let mainRoadLine: Feature<LineString> | null = null;
  let mainRoadLength = 0;
  const road: Road = {
    id: crypto.randomUUID(),
    name: roadName,
    geometry: [], // Main road geometry as array of ProjectPoint
    chainageOffset: 0, // Default to 0, could be derived if KML provides it
    alignments: [],
    structures: [],
  };

  const parsedPlacemarks = [];

  // First pass: Extract all geometries and identify the main road line
  for (const placemark of placemarks) {
    const geometryType = getGeometryType(placemark);
    let coordinates: turf.Position[] = [];
    let turfGeometry: turf.GeoJSONGeometry | null = null;
    let placemarkName = placemark.name || 'Unnamed Placemark';

    if (geometryType === 'LineString' && placemark.LineString?.coordinates) {
      coordinates = parseKmlCoordinates(placemark.LineString.coordinates);
      if (coordinates.length > 1) {
        turfGeometry = turf.lineString(coordinates);
      }
    } else if (geometryType === 'Point' && placemark.Point?.coordinates) {
      const pos = parseKmlCoordinates(placemark.Point.coordinates);
      if (pos.length > 0) {
        coordinates = pos;
        turfGeometry = turf.point(pos[0]);
      }
    } else if (geometryType === 'Polygon' && placemark.Polygon?.outerBoundaryIs?.LinearRing?.coordinates) {
      coordinates = parseKmlCoordinates(placemark.Polygon.outerBoundaryIs.LinearRing.coordinates);
      if (coordinates.length > 1) {
        turfGeometry = turf.polygon([coordinates]);
      }
    }

    if (turfGeometry) {
      parsedPlacemarks.push({
        name: placemarkName,
        type: geometryType,
        geometry: turfGeometry,
        originalKml: placemark // Store original for potential detailed property extraction later
      });

      // Tentatively identify the main road line. Use the first LineString encountered.
      if (geometryType === 'LineString' && !mainRoadLine) {
        mainRoadLine = turfGeometry as Feature<LineString>;
        mainRoadLength = turf.length(mainRoadLine, { units: 'kilometers' }) * 1000; // in meters
        road.geometry = mainRoadLine.geometry.coordinates.map(fromTurfCoords);
        // TODO: Extract road.chainageOffset if available in KML properties (e.g., from ExtendedData)
      }
    }
  }

  if (!mainRoadLine) {
    throw new Error('No main road LineString found in KML for chainage reference.');
  }

  // Second pass: Process placemarks, assigning them to road, alignments, or structures
  for (const parsedPlacemark of parsedPlacemarks) {
    const placemarkName = parsedPlacemark.name;
    const geometryType = parsedPlacemark.type;
    const turfGeometry = parsedPlacemark.geometry;

    // Infer type based on name and geometry
    // This is a simplified inference, might need refinement based on actual KML naming conventions
    let entityType = 'other';
    if (placemarkName.toLowerCase().includes('road') && geometryType === 'LineString') {
      // This placemark was already identified as main road, skip to avoid duplication if named 'road'
      // If multiple 'road' lines exist, this logic needs to be more sophisticated (e.g., choose longest, or based on explicit tags)
      if (mainRoadLine.geometry.coordinates.every((coord, i) => coord[0] === parsedPlacemark.geometry.coordinates[i][0] && coord[1] === parsedPlacemark.geometry.coordinates[i][1])) {
        continue; // Already processed as main road
      }
      entityType = 'main_road_duplicate'; // Indicate a potential issue or a second road line
    } else if (['pavement', 'drainage', 'footpath', 'kerb', 'shoulder', 'median', 'lane'].some(type => placemarkName.toLowerCase().includes(type)) && geometryType === 'LineString') {
      entityType = 'alignment';
    } else if (['culvert', 'bridge', 'box culvert', 'manhole', 'guardrail', 'sign', 'traffic light', 'structure', 'junction'].some(type => placemarkName.toLowerCase().includes(type)) && (geometryType === 'Point' || geometryType === 'Polygon')) {
      entityType = 'structure';
    } else if (geometryType === 'LineString') {
      // Default to alignment if it's a LineString and not main road or structure
      entityType = 'alignment';
    } else if (geometryType === 'Point') {
      // Default to structure if it's a Point and not explicitly categorized otherwise
      entityType = 'structure';
    }

    // --- Process Alignments ---
    if (entityType === 'alignment' && geometryType === 'LineString') {
      const alignmentLine = turfGeometry as Feature<LineString>;
      const alignmentName = placemarkName;
      const alignmentType = ((): Alignment['type'] => {
        if (placemarkName.toLowerCase().includes('pavement')) return 'pavement';
        if (placemarkName.toLowerCase().includes('drainage')) return 'drainage';
        if (placemarkName.toLowerCase().includes('footpath')) return 'footpath';
        if (placemarkName.toLowerCase().includes('kerb')) return 'kerb';
        if (placemarkName.toLowerCase().includes('shoulder')) return 'shoulder';
        if (placemarkName.toLowerCase().includes('median')) return 'median';
        if (placemarkName.toLowerCase().includes('lane')) return 'lane';
        return 'other'; // Default
      })();

      const chainagePoints: ChainagePoint[] = [];
      // Iterate through points of the alignment line
      for (const pointCoords of alignmentLine.geometry.coordinates) {
        const turfPoint = turf.point(pointCoords);
        // Find the closest point on the main road line to get its chainage
        const snappedPointFeature = turf.nearestPointOnLine(mainRoadLine, turfPoint);

        if (snappedPointFeature && snappedPointFeature.properties?.dist !== undefined) {
          const snappedChainageMeters = snappedPointFeature.properties.dist * 1000; // dist is in km by default

          chainagePoints.push({
            chainage: snappedChainageMeters,
            point: fromTurfCoords(snappedPointFeature.geometry.coordinates),
          });
        } else {
          // Fallback: If snapping fails (e.g., alignment deviates far from main road),
          // push the point with an approximate chainage based on its position along the alignment itself.
          // This is less accurate but prevents data loss.
          const approxChainage = turf.length(turf.lineString(alignmentLine.geometry.coordinates.slice(0, alignmentLine.geometry.coordinates.indexOf(pointCoords) + 1)), { units: 'kilometers' }) * 1000;
          chainagePoints.push({
            chainage: approxChainage,
            point: fromTurfCoords(pointCoords),
          });
        }
      }

      // Ensure chainage points are sorted by chainage and unique
      const sortedUniqueChainagePoints = Array.from(new Map(chainagePoints.map(cp => [cp.chainage, cp])).values())
        .sort((a, b) => a.chainage - b.chainage);

      road.alignments.push({
        id: crypto.randomUUID(),
        roadId: road.id,
        type: alignmentType,
        chainagePoints: sortedUniqueChainagePoints,
      });

    }
    // --- Process Structures ---
    else if (entityType === 'structure' && (geometryType === 'Point' || geometryType === 'Polygon')) {
      const structureName = placemarkName;
      const structureType = ((): Structure['type'] => {
        if (placemarkName.toLowerCase().includes('culvert')) return 'Culvert';
        if (placemarkName.toLowerCase().includes('box culvert')) return 'Box Culvert';
        if (placemarkName.toLowerCase().includes('bridge')) return 'Bridge';
        if (placemarkName.toLowerCase().includes('manhole')) return 'Manhole';
        if (placemarkName.toLowerCase().includes('guardrail')) return 'Guardrail';
        if (placemarkName.toLowerCase().includes('sign')) return 'Sign';
        if (placemarkName.toLowerCase().includes('traffic light')) return 'Traffic Light';
        if (placemarkName.toLowerCase().includes('junction')) return 'Junction';
        return 'Other'; // Default
      })();

      let structureGeometryTurf: turf.GeoJSONGeometry | null = null;
      let structurePointCoords: turf.Position | null = null; // The point used for chainage calculation

      if (geometryType === 'Point') {
        structureGeometryTurf = turfGeometry as Feature<TurfPoint>;
        structurePointCoords = structureGeometryTurf.geometry.coordinates;
      } else if (geometryType === 'Polygon') {
        structureGeometryTurf = turfGeometry as Feature<TurfPolygon>;
        // For polygons, use the centroid to determine chainage
        const centroid = turf.centroid(structureGeometryTurf);
        structurePointCoords = centroid.geometry.coordinates;
      }

      let structureChainage: number | null = null;
      if (structurePointCoords) {
        // Find the closest point on the main road line to determine chainage
        const snappedPointFeature = turf.nearestPointOnLine(mainRoadLine, turf.point(structurePointCoords));
        if (snappedPointFeature && snappedPointFeature.properties?.dist !== undefined) {
          structureChainage = snappedPointFeature.properties.dist * 1000; // in meters
        } else {
          // Fallback: if snapping fails, try to estimate chainage based on distance to main road line
          const distToMainRoad = turf.pointToLineDistance(turf.point(structurePointCoords), mainRoadLine, { units: 'meters' });
          if (distToMainRoad < 30) { // Arbitrary threshold for "close enough" to be considered related
            // Simple fallback: use the distance from the start of the main road line to the nearest point on the main road line
            // This is a rough estimate and assumes the structure point is roughly aligned with the road's progression
            const nearestPointOnMainRoad = turf.pointOnLine(mainRoadLine, turf.point(structurePointCoords));
            if (nearestPointOnMainRoad.geometry) {
              // Calculate distance along the main road line to the nearest point
              const pathLengthToNearest = turf.length(turf.lineString(mainRoadLine.geometry.coordinates.slice(0, mainRoadLine.geometry.coordinates.findIndex(coord => coord[0] === nearestPointOnMainRoad.geometry.coordinates[0] && coord[1] === nearestPointOnMainRoad.geometry.coordinates[1]))), { units: 'kilometers' }) * 1000;
              structureChainage = pathLengthToNearest;
            }
          }
        }
      }

      if (structureChainage !== null) {
        // Map turf geometry to our ProjectPoint or array of ProjectPoints/LineStrings
        let mappedGeometry: ProjectPoint | ProjectPoint[] | ProjectPoint[][];
        if (structureGeometryTurf) {
          if (structureGeometryTurf.type === 'Point') {
            mappedGeometry = fromTurfCoords(structureGeometryTurf.geometry.coordinates);
          } else if (structureGeometryTurf.type === 'Polygon') {
            // Map coordinates from [lng, lat] to {lat, lng} for Polygon
            mappedGeometry = structureGeometryTurf.geometry.coordinates[0].map(fromTurfCoords);
          } else {
            // Handle LineString if structures could be LineStrings, though unlikely for typical structures
            mappedGeometry = structureGeometryTurf.geometry.coordinates.map(fromTurfCoords);
          }
        } else {
          // Fallback geometry if structurePointCoords was derived and original geometry failed
          mappedGeometry = fromTurfCoords(structurePointCoords!);
        }


        road.structures.push({
          id: crypto.randomUUID(),
          roadId: road.id,
          type: structureType,
          chainage: structureChainage,
          geometry: mappedGeometry as any, // Type assertion, needs careful handling if complex geometries like LineString are intended for structures
          properties: {
            name: structureName,
            originalKmlType: geometryType, // Store original geometry type
            // Optionally, store original KML properties here
            // e.g., from placemark.ExtendedData if available
          }
        });
      }
    }
  }

  return road;
}

// Example usage (for testing/demonstration, not part of the final parser function)
/*
async function testParser() {
  const kmlContent = `
    <kml xmlns="http://www.opengis.net/kml/2.2">
      <Document>
        <Placemark>
          <name>Main Road Line</name>
          <LineString>
            <coordinates>-122.084,37.422,0 -122.085,37.423,0 -122.086,37.424,0</coordinates>
          </LineString>
        </Placemark>
        <Placemark>
          <name>Pavement Alignment</name>
          <LineString>
            <coordinates>-122.0841,37.4221,0 -122.0859,37.4239,0</coordinates>
          </LineString>
        </Placemark>
        <Placemark>
          <name>Culvert Structure</name>
          <Point>
            <coordinates>-122.085,37.4235,0</coordinates>
          </Point>
        </Placemark>
        <Placemark>
          <name>Bridge Structure</name>
          <Polygon>
            <outerBoundaryIs>
              <LinearRing>
                <coordinates>-122.0855,37.423,0 -122.0858,37.423,0 -122.0858,37.4232,0 -122.0855,37.4232,0 -122.0855,37.423,0</coordinates>
              </LinearRing>
            </outerBoundaryIs>
          </Polygon>
        </Placemark>
      </Document>
    </kml>
  `;
  try {
    const roadData = await parseKML(kmlContent, "Sample Road");
    console.log(JSON.stringify(roadData, null, 2));
  } catch (error) {
    console.error("Error parsing KML:", error);
  }
}

// testParser();
*/
