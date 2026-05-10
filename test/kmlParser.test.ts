import { describe, it, expect, vi } from 'vitest';
import { parseKML } from '../utils/kmlParser';
import { Road, Alignment, Structure, parseChainage } from '../utils/roadTypes';

// Helper to create a basic KML string
const createBasicKml = (roadName: string): string => `
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
    </Document>
  </kml>
`;

describe('kmlParser', () => {
  it('should parse a basic KML string', async () => {
    const kmlContent = createBasicKml('Sample Road');
    
    const parsed = parseKML(kmlContent);

    // Basic structure checks
    expect(parsed).toBeDefined();
    expect(parsed.placemarks.length).toBe(3);
    
    // Check main road placemark
    const mainRoad = parsed.placemarks[0];
    expect(mainRoad.name).toBe('Main Road Line');
    expect(mainRoad.points.length).toBe(3);
    expect(mainRoad.points[0].lat).toBeCloseTo(37.422);
    expect(mainRoad.points[0].lng).toBeCloseTo(-122.084);
  });

  it('should handle invalid KML gracefully', () => {
    const kmlContent = `not a kml`;
    const result = parseKML(kmlContent);
    expect(result.hasErrors).toBe(true);
  });
});
