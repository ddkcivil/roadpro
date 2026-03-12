import { describe, it, expect } from 'vitest';
import { parseKML } from './kmlParser';
import L from 'leaflet';

describe('kmlParser', () => {
  it('should parse a simple KML with one Placemark and LineString', () => {
    const kmlContent = `
      <?xml version="1.0" encoding="UTF-8"?>
      <kml xmlns="http://www.opengis.net/kml/2.2">
        <Document>
          <Placemark>
            <name>Test Road</name>
            <LineString>
              <coordinates>
                83.44,27.70,0
                83.45,27.71,0
              </coordinates>
            </LineString>
          </Placemark>
        </Document>
      </kml>
    `;

    const result = parseKML(kmlContent);

    expect(result.hasErrors).toBe(false);
    expect(result.placemarks).toHaveLength(1);
    expect(result.placemarks[0].name).toBe('Test Road');
    expect(result.placemarks[0].points).toHaveLength(2);
    expect(result.placemarks[0].points[0].lat).toBe(27.70);
    expect(result.placemarks[0].points[0].lng).toBe(83.44);
    expect(result.placemarks[1]?.points[0].lat).toBeUndefined(); // Safety check
  });

  it('should handle multiple Placemarks', () => {
    const kmlContent = `
      <kml>
        <Placemark><name>Point A</name><coordinates>83.1,27.1</coordinates></Placemark>
        <Placemark><name>Point B</name><coordinates>83.2,27.2</coordinates></Placemark>
      </kml>
    `;
    // Note: The parser requires <?xml and <kml tags based on its implementation
    const fullContent = '<?xml version="1.0" encoding="UTF-8"?>' + kmlContent;

    const result = parseKML(fullContent);

    expect(result.placemarks).toHaveLength(2);
    expect(result.placemarks[0].name).toBe('Point A');
    expect(result.placemarks[1].name).toBe('Point B');
  });

  it('should handle invalid KML gracefully', () => {
    const result = parseKML('not a kml');
    expect(result.hasErrors).toBe(true);
    expect(result.placemarks).toHaveLength(0);
  });

  it('should handle Placemarks without names', () => {
    const kmlContent = `
      <?xml version="1.0" encoding="UTF-8"?>
      <kml>
        <Placemark>
          <coordinates>83.44,27.70</coordinates>
        </Placemark>
      </kml>
    `;
    const result = parseKML(kmlContent);
    expect(result.placemarks).toHaveLength(1);
    expect(result.placemarks[0].name).toBeUndefined();
  });
});
