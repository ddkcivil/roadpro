import { describe, it, expect, vi } from 'vitest';
import { parseKML } from '../services/kmlParser';
import { Road, Alignment, Structure, parseChainage } from '../models/roadTypes';

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
  it('should parse a basic KML string into a Road object', async () => {
    const kmlContent = createBasicKml('Sample Road');
    const roadName = 'Sample Road';

    const road = await parseKML(kmlContent, roadName);

    // Basic structure checks
    expect(road).toBeDefined();
    expect(road.name).toBe(roadName);
    expect(road.geometry).toBeDefined();
    expect(road.geometry.length).toBeGreaterThan(0);
    expect(road.alignments).toBeDefined();
    expect(road.structures).toBeDefined();

    // Check main road geometry (first few points)
    expect(road.geometry[0].lat).toBeCloseTo(37.422);
    expect(road.geometry[0].lng).toBeCloseTo(-122.084);

    // Check alignment
    expect(road.alignments.length).toBe(1);
    const alignment = road.alignments[0];
    expect(alignment.id).toBeDefined();
    expect(alignment.type).toBe('pavement');
    expect(alignment.chainagePoints.length).toBe(2);
    expect(alignment.chainagePoints[0].distance).toBeGreaterThanOrEqual(0);
    expect(alignment.chainagePoints[0].chainage).toBeDefined();
    expect(typeof alignment.chainagePoints[0].chainage).toBe('string');

    // Check structure
    expect(road.structures.length).toBe(1);
    const structure = road.structures[0];
    expect(structure.id).toBeDefined();
    expect(structure.type).toBe('box-culvert'); // kmlParser maps "Culvert" to "box-culvert"
    expect(structure.chainage).toBeDefined();
    expect(typeof structure.chainage).toBe('string');
    expect(structure.distance).toBeGreaterThan(0);

    // Check chainage calculation for structure
    const structureChainageValue = parseChainage(structure.chainage);
    expect(structureChainageValue).toBeGreaterThan(0);
  });

  it('should throw an error if no main road LineString is found', async () => {
    const kmlContent = `
      <kml xmlns="http://www.opengis.net/kml/2.2">
        <Document>
          <Placemark>
            <name>Structure Point</name>
            <Point>
              <coordinates>1.5,1.5</coordinates>
            </Point>
          </Placemark>
        </Document>
      </kml>
    `;
    await expect(parseKML(kmlContent, 'Road Without Main Line')).rejects.toThrow('No main road LineString found in KML for chainage reference.');
  });
});
