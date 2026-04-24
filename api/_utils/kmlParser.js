import { Parser } from 'xml2js';
import { lineString, point, polygon, length, nearestPointOnLine, centroid, lineSlice, } from '@turf/turf';
import { v4 as uuidv4 } from 'uuid';
import { formatChainage } from './roadTypes.js';
// Helper to convert Leaflet-like LatLngExpression ([lat, lng]) to Turf's [lng, lat]
function toTurfCoords(coords) {
    if (Array.isArray(coords)) {
        return [coords[1], coords[0]]; // [lng, lat]
    }
    return [coords.lng, coords.lat]; // [lng, lat]
}
// Helper to convert Turf's [lng, lat] to our ProjectPoint {lat, lng}
function fromTurfCoords(coords) {
    return { lat: coords[1], lng: coords[0] };
}
// Function to determine geometry type from XML placemark
function getGeometryType(placemark) {
    if (placemark.Point?.[0]?.coordinates?.[0])
        return 'Point';
    if (placemark.LineString?.[0]?.coordinates?.[0])
        return 'LineString';
    if (placemark.Polygon?.[0]?.outerBoundaryIs?.[0]?.LinearRing?.[0]?.coordinates?.[0])
        return 'Polygon';
    return null;
}
// Function to parse coordinates from KML string format
function parseKmlCoordinates(coordStr) {
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
function findPlacemarks(obj) {
    let placemarks = [];
    if (!obj)
        return placemarks;
    if (Array.isArray(obj)) {
        for (const item of obj) {
            placemarks = placemarks.concat(findPlacemarks(item));
        }
    }
    else if (typeof obj === 'object') {
        if (obj.Placemark) {
            const p = obj.Placemark;
            const added = Array.isArray(p) ? p : [p];
            placemarks = placemarks.concat(added);
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
 *
 * @param kmlText The KML content as a string.
 * @param roadName The name to assign to the Road entity.
 * @returns A Promise resolving to a Road object with associated alignments and structures.
 */
export async function parseKML(kmlText, roadName) {
    const parser = new Parser({ explicitArray: true });
    const result = await parser.parseStringPromise(kmlText);
    const placemarks = findPlacemarks(result.kml || result);
    let mainRoadLine = null;
    const road = {
        id: uuidv4(),
        name: roadName,
        geometry: [],
        chainageOffset: 0,
        alignments: [],
        structures: [],
    };
    const parsedPlacemarks = [];
    // First pass: Extract all geometries and identify the main road line
    for (const placemark of placemarks) {
        const geometryType = getGeometryType(placemark);
        let coordinates = [];
        let turfGeometry = null;
        let placemarkName = (placemark.name && placemark.name[0]) || 'Unnamed Placemark';
        if (geometryType === 'LineString' && placemark.LineString?.[0]?.coordinates?.[0]) {
            coordinates = parseKmlCoordinates(placemark.LineString[0].coordinates[0]);
            if (coordinates.length > 1) {
                turfGeometry = lineString(coordinates);
            }
        }
        else if (geometryType === 'Point' && placemark.Point?.[0]?.coordinates?.[0]) {
            const pos = parseKmlCoordinates(placemark.Point[0].coordinates[0]);
            if (pos.length > 0) {
                turfGeometry = point(pos[0]);
            }
        }
        else if (geometryType === 'Polygon' && placemark.Polygon?.[0]?.outerBoundaryIs?.[0]?.LinearRing?.[0]?.coordinates?.[0]) {
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
                originalKml: placemark
            });
            if (geometryType === 'LineString' && !mainRoadLine) {
                mainRoadLine = turfGeometry;
                road.geometry = mainRoadLine.geometry.coordinates.map(fromTurfCoords);
            }
        }
    }
    if (!mainRoadLine) {
        throw new Error('No main road LineString found in KML for chainage reference.');
    }
    // Second pass: Process placemarks
    for (const parsedPlacemark of parsedPlacemarks) {
        const placemarkName = parsedPlacemark.name;
        const geometryType = parsedPlacemark.type;
        const turfFeature = parsedPlacemark.geometry;
        // Infer type
        let entityType = 'other';
        const lowerName = placemarkName.toLowerCase();
        if (lowerName.includes('road') && geometryType === 'LineString') {
            if (turfFeature === mainRoadLine)
                continue;
            const coords = turfFeature.geometry.coordinates;
            if (coords.length === mainRoadLine.geometry.coordinates.length &&
                coords.every((c, i) => c[0] === mainRoadLine.geometry.coordinates[i][0] && c[1] === mainRoadLine.geometry.coordinates[i][1])) {
                continue;
            }
            entityType = 'main_road_duplicate';
        }
        else if (['pavement', 'drainage', 'footpath', 'kerb', 'shoulder', 'median', 'lane'].some(type => lowerName.includes(type)) && geometryType === 'LineString') {
            entityType = 'alignment';
        }
        else if (['culvert', 'bridge', 'manhole', 'guardrail', 'sign', 'traffic light', 'structure', 'junction'].some(type => lowerName.includes(type)) && (geometryType === 'Point' || geometryType === 'Polygon')) {
            entityType = 'structure';
        }
        else if (geometryType === 'LineString') {
            entityType = 'alignment';
        }
        else if (geometryType === 'Point' || geometryType === 'Polygon') {
            entityType = 'structure';
        }
        if (entityType === 'alignment' && geometryType === 'LineString') {
            const alignmentLine = turfFeature;
            const alignmentName = placemarkName;
            const alignmentType = (() => {
                if (lowerName.includes('pavement'))
                    return 'pavement';
                if (lowerName.includes('drainage'))
                    return 'drainage';
                if (lowerName.includes('footpath'))
                    return 'footpath';
                if (lowerName.includes('kerb'))
                    return 'kerb';
                if (lowerName.includes('shoulder'))
                    return 'shoulder';
                if (lowerName.includes('median'))
                    return 'median';
                if (lowerName.includes('lane'))
                    return 'lane';
                return 'other';
            })();
            const chainagePoints = [];
            for (const pointCoords of alignmentLine.geometry.coordinates) {
                const turfPoint = point(pointCoords);
                const snappedPointFeature = nearestPointOnLine(mainRoadLine, turfPoint);
                if (snappedPointFeature) {
                    const start = point(mainRoadLine.geometry.coordinates[0]);
                    const sliced = lineSlice(start, snappedPointFeature, mainRoadLine);
                    const snappedChainageMeters = length(sliced, { units: 'kilometers' }) * 1000;
                    chainagePoints.push({
                        distance: snappedChainageMeters,
                        chainage: formatChainage(snappedChainageMeters),
                        point: fromTurfCoords(snappedPointFeature.geometry.coordinates),
                    });
                }
                else {
                    const approxDistance = 0; // Simplified fallback
                    chainagePoints.push({
                        distance: approxDistance,
                        chainage: formatChainage(approxDistance),
                        point: fromTurfCoords(pointCoords),
                    });
                }
            }
            const sortedUniqueChainagePoints = Array.from(new Map(chainagePoints.map(cp => [cp.distance, cp])).values())
                .sort((a, b) => a.distance - b.distance);
            const isCompleted = lowerName.includes('existing') || lowerName.includes('done');
            const progress = isCompleted ? 100 : Math.floor(Math.random() * 40);
            road.alignments.push({
                id: uuidv4(),
                roadId: road.id || '',
                name: alignmentName,
                type: alignmentType,
                coordinates: alignmentLine.geometry.coordinates.map(fromTurfCoords),
                chainagePoints: sortedUniqueChainagePoints,
                totalLength: length(alignmentLine, { units: 'kilometers' }) * 1000,
                status: isCompleted ? 'Completed' : progress > 0 ? 'In Progress' : 'Not Started',
                progress: progress,
                lastUpdated: new Date().toISOString()
            });
        }
        else if (entityType === 'structure' && (geometryType === 'Point' || geometryType === 'Polygon')) {
            const structureName = placemarkName;
            const structureType = (() => {
                if (lowerName.includes('box culvert'))
                    return 'Box Culvert';
                if (lowerName.includes('pipe culvert'))
                    return 'Pipe Culvert';
                if (lowerName.includes('culvert'))
                    return 'box-culvert';
                if (lowerName.includes('bridge'))
                    return 'bridge';
                return 'other';
            })();
            let structurePointCoords = null;
            let mappedGeometry;
            if (geometryType === 'Point') {
                const p = turfFeature.geometry;
                structurePointCoords = p.coordinates;
                mappedGeometry = fromTurfCoords(p.coordinates);
            }
            else if (geometryType === 'Polygon') {
                const poly = turfFeature.geometry;
                const centerPoint = centroid(turfFeature);
                structurePointCoords = centerPoint.geometry.coordinates;
                mappedGeometry = poly.coordinates[0].map(fromTurfCoords);
            }
            let structureDistance = null;
            if (structurePointCoords) {
                const snappedPointFeature = nearestPointOnLine(mainRoadLine, point(structurePointCoords));
                if (snappedPointFeature) {
                    const start = point(mainRoadLine.geometry.coordinates[0]);
                    const sliced = lineSlice(start, snappedPointFeature, mainRoadLine);
                    structureDistance = length(sliced, { units: 'kilometers' }) * 1000;
                }
            }
            if (structureDistance !== null) {
                const isCompleted = Math.random() > 0.7;
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
                    },
                    status: isCompleted ? 'Completed' : Math.random() > 0.5 ? 'In Progress' : 'Not Started',
                    lastUpdated: new Date().toISOString()
                });
            }
        }
    }
    return road;
}
