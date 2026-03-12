import L from 'leaflet';

/**
 * Pure regex-based KML parser - No DOMParser for Vercel compatibility
 * Extracts Placemarks → name → coordinates → LatLng points
 */
export interface ParsedKML {
  placemarks: Array<{
    name?: string;
    points: L.LatLng[];
  }>;
  totalCoordinates: number;
  hasErrors: boolean;
}

export function parseKML(kmlContent: string): ParsedKML {
  console.log('[GIS] Parsing KML with pure regex parser...');
  
  const result: ParsedKML = {
    placemarks: [],
    totalCoordinates: 0,
    hasErrors: false
  };

  try {
    // Validate KML header
    if (!kmlContent.includes('<?xml') || !kmlContent.includes('<kml')) {
      console.warn('[GIS] Invalid KML: Missing XML/KML header');
      result.hasErrors = true;
      return result;
    }

    // Extract all Placemark blocks: <Placemark>....</Placemark>
    const placemarkRegex = /<Placemark[^>]*>(.*?)<\/Placemark>/gs;
    const placemarkMatches = kmlContent.matchAll(placemarkRegex);
    
    let placemarkIndex = 0;
    for (const match of placemarkMatches) {
      const placemarkContent = match[1] || '';
      placemarkIndex++;

      // Extract name: <name>text</name>
      const nameMatch = placemarkContent.match(/<name[^>]*>(.*?)<\/name[^>]*>/s);
      const name = nameMatch ? nameMatch[1].trim() : undefined;

      // Extract coordinates: <coordinates>...</coordinates>
      const coordRegex = /<coordinates[^>]*>(.*?)<\/coordinates[^>]*>/gs;
      const coordMatches = placemarkContent.matchAll(coordRegex);

      const points: L.LatLng[] = [];
      
      for (const coordMatch of coordMatches) {
        const coordStr = coordMatch[1].trim();
        if (!coordStr) continue;

        // Split coordinate tuples: lng,lat,alt by whitespace
        const tuples = coordStr.split(/[\s\n\r\t]+/).filter(t => t.trim());
        
        tuples.forEach(tuple => {
          const parts = tuple.split(',');
          if (parts.length >= 2) {
            const lng = parseFloat(parts[0].trim());
            const lat = parseFloat(parts[1].trim());
            if (!isNaN(lat) && !isNaN(lng) && Math.abs(lat) <= 90 && Math.abs(lng) <= 180) {
              points.push(L.latLng(lat, lng));
            }
          }
        });
      }

      if (points.length > 0) {
        result.placemarks.push({ name, points });
        result.totalCoordinates += points.length;
        console.log(`[GIS] Placemark ${placemarkIndex}: "${name || 'Unnamed'}" → ${points.length} points`);
      }
    }

    if (result.totalCoordinates > 0) {
      console.log(`[GIS] Parsed ✓ ${result.totalCoordinates} coordinates from LineString`);
    } else {
      console.warn('[GIS] No valid coordinates found in KML');
      result.hasErrors = true;
    }

  } catch (error) {
    console.error('[GIS] KML Parse Error:', error);
    result.hasErrors = true;
  }

  return result;
}

// Legacy compat: Return first path's points for zoomToKML
export function getKMLBounds(kmlContent: string): L.LatLng[] | null {
  const parsed = parseKML(kmlContent);
  if (parsed.placemarks.length > 0 && parsed.placemarks[0].points.length > 0) {
    return parsed.placemarks[0].points;
  }
  return null;
}
