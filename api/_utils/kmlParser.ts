import pkg from 'xml2js';
const { Parser } = pkg;
import { 
  lineString, 
  point, 
  polygon, 
  length, 
  nearestPointOnLine, 
  centroid, 
  pointToLineDistance,
  type Feature,
  type LineString,
  type Point as TurfPoint,
  type Polygon as TurfPolygon,
  type Position
} from '@turf/turf';
import { v4 as uuidv4 } from 'uuid';
import { Road, Alignment, Structure, ChainagePoint, Point as ProjectPoint, formatChainage } from '../../models/roadTypes';

// Helper to convert Leaflet-like LatLngExpression ([lat, lng]) to Turf's [lng, lat]
function toTurfCoords(coords: ProjectPoint | [number, number]): Position {
  if (Array.isArray(coords)) {
    return [coords[1], coords[0]]; // [lng, lat]
  }
  return [coords.lng, coords.lat]; // [lng, lat]
}

// Helper to convert Turf's [lng, lat] to our ProjectPoint {lat, lng}
function fromTurfCoords(coords: Position): ProjectPoint {
  return { lat: coords[1], lng: coords[0] };
}

// Helper to extract coordinates from different Turf geometry types
function extractCoordinates(geometry: any): Position[] | Position | Position[][] {
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
function parseKmlCoordinates(coordStr: string): Position[] {
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
 * Recursively finds all Placemark elements in a parsed KML object.
 */
function findPlacemarks(obj: any): any[] {
  let placemarks: any[] = [];
  if (!obj) return placemarks;
  if (Array.isArray(obj)) {
    for (const item of obj) {
      placemarks = placemarks.concat(findPlacemarks(item));
    }
  } else if (typeof obj === 'object') {
    if (obj.Placemark) {
      const p = obj.Placemark;
      placemarks = placemarks.concat(Array.isArray(p) ? p : [p]);
    }
    for (const key in obj) {
      if (key !== 'Placemark') {
        placemarks = placemarks.concat(findPlacemarks(obj[key]));
      }
    }
  }
  return placemarks;
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
  const parser = new xml2js.Parser({ explicitArray: true }); // Use explicitArray: true for consistent array handling
  const result = await parser.parseStringPromise(kmlText);

  const placemarks = findPlacemarks(result.kml || result);

  if (placemarks.length === 0) {
    console.warn('No Placemarks found in KML.');
  }

  let mainRoadLine: Feature<LineString> | null = null;
  let mainRoadLength = 0;
  const road: Road = {
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
    let coordinates: Position[] = [];
    let turfGeometry: GeoJSONGeometry | null = null;
    let placemarkName = (placemark.name && placemark.name[0]) || 'Unnamed Placemark';

    if (geometryType === 'LineString' && placemark.LineString?.[0]?.coordinates?.[0]) {
      coordinates = parseKmlCoordinates(placemark.LineString[0].coordinates[0]);
      if (coordinates.length > 1) {
        turfGeometry = lineString(coordinates);
      }
    } else if (geometryType === 'Point' && placemark.Point?.[0]?.coordinates?.[0]) {
      const pos = parseKmlCoordinates(placemark.Point[0].coordinates[0]);
      if (pos.length > 0) {
        coordinates = pos;
        turfGeometry = point(pos[0]);
      }
    } else if (geometryType === 'Polygon' && placemark.Polygon?.[0]?.outerBoundaryIs?.[0]?.LinearRing?.[0]?.coordinates?.[0]) {
      coordinates = parseKmlCoordinates(placemark.Polygon[0].outerBoundaryIs[0].LinearRing[0].coordinates[0]);
      if (coordinates.length > 1) {
        turfGeometry = polygon([coordinates]);
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
        mainRoadLength = length(mainRoadLine, { units: 'kilometers' }) * 1000; // in meters
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
      // This placemark was already identified as main road, skip to avoid duplication
      const feature = parsedPlacemark.geometry as Feature<LineString>;
      if (feature === mainRoadLine) {
        continue;
      }
      // Or if coordinates match exactly
      const coords = feature.geometry.coordinates;
      if (coords.length === mainRoadLine.geometry.coordinates.length && 
          coords.every((c, i) => c[0] === mainRoadLine.geometry.coordinates[i][0] && c[1] === mainRoadLine.geometry.coordinates[i][1])) {
        continue;
      }
      entityType = 'main_road_duplicate';
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
        const turfPoint = point(pointCoords);
        // Find the closest point on the main road line to get its chainage
        const snappedPointFeature = nearestPointOnLine(mainRoadLine, turfPoint);

        if (snappedPointFeature && snappedPointFeature.properties?.dist !== undefined) {
          const snappedChainageMeters = snappedPointFeature.properties.dist * 1000; // dist is in km by default

          chainagePoints.push({
            distance: snappedChainageMeters,
            chainage: formatChainage(snappedChainageMeters),
            point: fromTurfCoords(snappedPointFeature.geometry.coordinates),
          });
        } else {
          // Fallback: If snapping fails (e.g., alignment deviates far from main road),
          // push the point with an approximate chainage based on its position along the alignment itself.
          // This is less accurate but prevents data loss.
          const approxDistance = length(lineString(alignmentLine.geometry.coordinates.slice(0, alignmentLine.geometry.coordinates.indexOf(pointCoords) + 1)), { units: 'kilometers' }) * 1000;
          chainagePoints.push({
            distance: approxDistance,
            chainage: formatChainage(approxDistance),
            point: fromTurfCoords(pointCoords),
          });
        }
      }

      // Ensure chainage points are sorted by distance and unique
      const sortedUniqueChainagePoints = Array.from(new Map(chainagePoints.map(cp => [cp.distance, cp])).values())
        .sort((a, b) => a.distance - b.distance);

      road.alignments.push({
        id: uuidv4(),
        roadId: road.id || '',
        name: alignmentName,
        type: alignmentType,
        coordinates: alignmentLine.geometry.coordinates.map(fromTurfCoords) as any,
        chainagePoints: sortedUniqueChainagePoints,
        totalLength: length(alignmentLine, { units: 'kilometers' }) * 1000
      });

    }
    // --- Process Structures ---
    else if (entityType === 'structure' && (geometryType === 'Point' || geometryType === 'Polygon')) {
      const structureName = placemarkName;
      const structureType = ((): Structure['type'] => {
        const lowerName = placemarkName.toLowerCase();
        if (lowerName.includes('box culvert')) return 'Box Culvert';
        if (lowerName.includes('pipe culvert')) return 'Pipe Culvert';
        if (lowerName.includes('culvert')) return 'box-culvert';
        if (lowerName.includes('bridge')) return 'bridge';
        return 'Other' as any; // Default
      })();

      let structureGeometryTurf: GeoJSONGeometry | null = null;
      let structurePointCoords: Position | null = null; // The point used for chainage calculation

      if (geometryType === 'Point') {
        structureGeometryTurf = turfGeometry as Feature<TurfPoint>;
        structurePointCoords = structureGeometryTurf.geometry.coordinates;
      } else if (geometryType === 'Polygon') {
        structureGeometryTurf = turfGeometry as Feature<TurfPolygon>;
        // For polygons, use the centroid to determine chainage
        const centroid = centroid(structureGeometryTurf);
        structurePointCoords = centroid.geometry.coordinates;
      }

      let structureDistance: number | null = null;
      if (structurePointCoords) {
        // Find the closest point on the main road line to determine chainage
        const snappedPointFeature = nearestPointOnLine(mainRoadLine, point(structurePointCoords));
        if (snappedPointFeature && snappedPointFeature.properties?.dist !== undefined) {
          structureDistance = snappedPointFeature.properties.dist * 1000; // in meters
        } else {
          // Fallback: if snapping fails, try to estimate distance based on distance to main road line
          const distToMainRoad = pointToLineDistance(point(structurePointCoords), mainRoadLine, { units: 'meters' });
          if (distToMainRoad < 30) {
            const nearestPointOnMainRoad = nearestPointOnLine(mainRoadLine, point(structurePointCoords));
            if (nearestPointOnMainRoad.geometry) {
              const pathLengthToNearest = length(lineString(mainRoadLine.geometry.coordinates.slice(0, mainRoadLine.geometry.coordinates.findIndex(coord => coord[0] === nearestPointOnMainRoad.geometry.coordinates[0] && coord[1] === nearestPointOnMainRoad.geometry.coordinates[1]))), { units: 'kilometers' }) * 1000;
              structureDistance = pathLengthToNearest;
            }
          }
        }
      }

      if (structureDistance !== null) {
        // Map turf geometry to our ProjectPoint or array of ProjectPoints/LineStrings
        let mappedGeometry: any;
        if (structureGeometryTurf) {
          if (structureGeometryTurf.type === 'Point') {
            mappedGeometry = fromTurfCoords(structureGeometryTurf.geometry.coordinates);
          } else if (structureGeometryTurf.type === 'Polygon') {
            mappedGeometry = structureGeometryTurf.geometry.coordinates[0].map(fromTurfCoords);
          } else {
            mappedGeometry = structureGeometryTurf.geometry.coordinates.map(fromTurfCoords);
          }
        } else {
          mappedGeometry = fromTurfCoords(structurePointCoords!);
        }


        road.structures.push({
          id: uuidv4(),
          roadId: road.id || '',
          name: structureName,
          type: structureType,
          chainage: formatChainage(structureDistance),
          distance: structureDistance,
          geometry: mappedGeometry,
          alignments: [],
          properties: {
            originalKmlType: geometryType,
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