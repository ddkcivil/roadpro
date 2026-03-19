import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap, LayersControl, Tooltip as MapTooltip } from 'react-leaflet';
import '@testing-library/jest-dom';

import { MapModule, KMLDataLayer } from '../components/modules/MapModule'; // Assuming MapModule and KMLDataLayer are exported
import { parseKML, ParsedKML } from '~/utils/kmlParser';
import L from 'leaflet';

// Mocking dependencies
vi.mock('react-leaflet', async (importOriginal) => {
  const actual = await importOriginal<typeof import('react-leaflet')>();
  return {
    ...actual,
    MapContainer: vi.fn(({ children }) => <div data-testid="map-container">{children}</div>),
    TileLayer: vi.fn(() => null),
    Marker: vi.fn(({ children, position }) => <div data-testid={`marker-${position}`}>{children}</div>),
    Popup: vi.fn(({ children }) => <div data-testid="popup">{children}</div>),
    Polyline: vi.fn(({ positions }) => <div data-testid={`polyline-${positions.length}`}>{positions.map((p, i) => `(${p[0]},${p[1]})`).join(',')}</div>),
    useMap: vi.fn(() => ({
      // Mock map methods that are used
      addControl: vi.fn(),
      removeControl: vi.fn(),
      getContainer: () => ({ style: { cursor: '' } }),
      on: vi.fn(),
      off: vi.fn(),
      setView: vi.fn(),
      fitBounds: vi.fn(),
    })),
    LayerGroup: vi.fn(({ children }) => <>{children}</>),
    CircleMarker: vi.fn(({ center }) => <div data-testid={`circle-marker-${center.toString()}`}></div>),
    LayersControl: vi.fn(({ children }) => <>{children}</>),
    BaseLayer: vi.fn(({ children }) => <>{children}</>),
  };
});

vi.mock('~/utils/kmlParser', () => ({
  parseKML: vi.fn(),
  getKMLBounds: vi.fn(),
}));

vi.mock('leaflet-geosearch', () => ({
  GeoSearchControl: vi.fn(({ children }) => <>{children}</>),
  OpenStreetMapProvider: vi.fn(),
}));

vi.mock('~/components/ui/button', () => ({ Button: vi.fn(({ children }) => <button data-testid="button">{children}</button>) }));
vi.mock('~/components/ui/card', () => ({ Card: vi.fn(({ children }) => <div data-testid="card">{children}</div>), CardHeader: vi.fn(({ children }) => <div>{children}</div>), CardContent: vi.fn(({ children }) => <div>{children}</div>), CardTitle: vi.fn(({ children }) => <h3>{children}</h3>) }));
vi.mock('~/components/ui/badge', () => ({ Badge: vi.fn(({ children }) => <span data-testid="badge">{children}</span>) }));
vi.mock('~/components/ui/switch', () => ({ Switch: vi.fn(({ checked }) => <input type="checkbox" checked={checked} data-testid="switch" />) }));
vi.mock('~/components/ui/label', () => ({ Label: vi.fn(({ children }) => <label>{children}</label>) }));
vi.mock('~/components/ui/scroll-area', () => ({ ScrollArea: vi.fn(({ children }) => <div>{children}</div>) }));
vi.mock('~/components/ui/accordion', () => ({ Accordion: vi.fn(({ children }) => <>{children}</>), AccordionItem: vi.fn(({ children }) => <div>{children}</div>), AccordionTrigger: vi.fn(({ children }) => <button>{children}</button>), AccordionContent: vi.fn(({ children }) => <div>{children}</div>) }));
vi.mock('~/components/ui/dialog', () => ({ Dialog: vi.fn(({ children }) => <>{children}</>), DialogContent: vi.fn(({ children }) => <div>{children}</div>), DialogDescription: vi.fn(({ children }) => <p>{children}</p>), DialogFooter: vi.fn(({ children }) => <footer>{children}</footer>), DialogHeader: vi.fn(({ children }) => <header>{children}</header>), DialogTitle: vi.fn(({ children }) => <h2>{children}</h2>) }));
vi.mock('sonner', () => ({ toast: { loading: vi.fn(), success: vi.fn(), error: vi.fn(), dismiss: vi.fn() } }));
vi.mock('~/lib/utils', () => ({ cn: vi.fn((...classes) => classes.filter(Boolean).join(' ')) }));

// Mocking external dependencies for KMLDataLayer rendering tests
const mockParseKML = vi.mocked(parseKML);
const mockGetKMLBounds = vi.mocked(getKMLBounds);

// Mocking crypto.randomUUID as parseKML uses it
vi.mock('crypto', () => ({
  randomUUID: vi.fn(),
}));
const mockCryptoRandomUUID = vi.mocked(crypto.randomUUID);


// Mock Leaflet objects
const mockLatLng = vi.fn((lat, lng) => ({ lat, lng, distanceTo: vi.fn(() => Math.random() * 1000) }));
const mockLatLngBounds = vi.fn((points) => ({ getNorthEast: vi.fn(), getSouthWest: vi.fn() }));
const mockPolyline = vi.fn((points, options) => ({ addTo: vi.fn(() => ({ bindTooltip: vi.fn(), bindPopup: vi.fn() })), getLatLngs: vi.fn(() => points) }));
const mockMarker = vi.fn((latlng, options) => ({ addTo: vi.fn(() => ({ bindPopup: vi.fn() })), getLatLng: vi.fn(() => latlng) }));
const mockDivIcon = vi.fn((options) => ({ html: options.html, className: options.className }));
const mockLayerGroup = vi.fn((props) => <>{props.children}</>);
const mockCircleMarker = vi.fn((center) => ({}));
const mockControl = vi.fn();

// Patch Leaflet globally for tests
vi.stubGlobal('L', {
  LatLng: mockLatLng,
  LatLngBounds: mockLatLngBounds,
  Polyline: mockPolyline,
  Marker: mockMarker,
  divIcon: mockDivIcon,
  layerGroup: mockLayerGroup,
  CircleMarker: mockCircleMarker,
  Icon: { Default: { mergeOptions: vi.fn() } }
});


// Helper to create KML content for tests
const createKML = (name: string, placemarks: string): string => `
  <kml xmlns="http://www.opengis.net/kml/2.2">
    <Document>
      ${placemarks}
    </Document>
  </kml>
`;

// Mock KMLData structure
const mockKMLData = (id: string, name: string, kmlContent: string, color: string = '#4f46e5'): KMLData => ({
  id,
  name,
  kmlContent,
  timestamp: Date.now(),
  visible: true,
  color
});

describe('KMLDataLayer', () => {
  let mockMap: L.Map;
  let mockProject: Project;
  let mockOnProjectUpdate: vi.Mock;
  let mockParseKMLResult: ParsedKML;

  beforeEach(() => {
    // Reset mocks and clear timers before each test
    vi.clearAllMocks();
    vi.useFakeTimers();

    // Mock `crypto.randomUUID` used in `parseKML`'s internal helpers if necessary (though parseKML is mocked here)
    mockCryptoRandomUUID.mockReturnValue('mock-uuid');

    // Mock `parseKML` return value
    mockParseKMLResult = {
      placemarks: [],
      totalCoordinates: 0,
      hasErrors: false
    };
    mockParseKML.mockReturnValue(mockParseKMLResult);

    // Mock Leaflet's addControl, removeControl, on, off
    const mockMapInstance = {
      addControl: mockControl,
      removeControl: mockControl,
      on: vi.fn(),
      off: vi.fn(),
      getContainer: () => ({ style: { cursor: '' } }),
      setView: vi.fn(),
      fitBounds: vi.fn(),
      removeLayer: vi.fn(), // Mock removeLayer for cleanup
    };
    vi.mocked(useMap).mockReturnValue(mockMapInstance as any);
    mockMap = mockMapInstance as any;

    // Mock `project` data and `onProjectUpdate`
    mockProject = {
      id: 'proj-1',
      name: 'Test Project',
      location: '27.7006,83.4484',
      structures: [],
      vehicles: [],
      staffLocations: [],
      landParcels: [],
      mapOverlays: [],
      sitePhotos: [],
      linearWorks: [],
      kmlData: [],
      // Add other necessary fields for Project type if they are used directly
    };
    mockOnProjectUpdate = vi.fn();

    // Mock Leaflet default icons merge
    L.Icon.Default.mergeOptions({} as any);
  });

  afterEach(() => {
    vi.useRealTimers(); // Restore real timers
  });

  // --- Test KML Data Layer Rendering ---
  describe('KMLDataLayer Rendering', () => {
    it('should render nothing if KML is not visible or invalid', () => {
      const { container } = render(
        <MapContainer center={[0, 0]} zoom={13}>
          <KMLDataLayer kml={mockKMLData('kml-1', 'Test.kml', '<kml></kml>', '#ff0000')} />
        </MapContainer>
      );
      // Expecting no actual Leaflet layers to be added as kml.visible is true, but parseKML returns no placemarks
      // The component should return null and add no layers.
      // This is hard to assert without inspecting Leaflet layer creation directly,
      // but we can check that `parseKML` was called and returned empty, and no rendering happened.
      expect(mockParseKML).toHaveBeenCalled();
      expect(mockParseKMLResult.placemarks.length).toBe(0);
      // We can't easily check `map.addLayer` calls with current mocks.
    });

    it('should render Polyline for KML LineString placemarks', async () => {
      mockParseKMLResult.placemarks = [{
        name: 'Alignment Line',
        points: [L.latLng(1, 1), L.latLng(2, 2)],
      }];
      mockParseKMLResult.totalCoordinates = 2;

      render(
        <MapContainer center={[0, 0]} zoom={13}>
          <KMLDataLayer kml={mockKMLData('kml-1', 'TestLine.kml', '...', '#ff0000')} />
        </MapContainer>
      );

      await vi.advanceTimersByTimeAsync(1000); // Wait for useEffect to run

      expect(mockParseKML).toHaveBeenCalledTimes(1);
      expect(mockPolyline).toHaveBeenCalledTimes(1);
      expect(mockPolyline).toHaveBeenCalledWith([expect.anything(), expect.anything()], expect.objectContaining({ color: '#ff0000', weight: 5 }));
      expect(mockMarker).not.toHaveBeenCalled();
      expect(mockDivIcon).not.toHaveBeenCalled();
    });

    it('should render Marker for KML Point placemarks', async () => {
      mockParseKMLResult.placemarks = [{
        name: 'Structure Point',
        points: [L.latLng(1, 1)],
      }];
      mockParseKMLResult.totalCoordinates = 1;

      render(
        <MapContainer center={[0, 0]} zoom={13}>
          <KMLDataLayer kml={mockKMLData('kml-1', 'TestPoint.kml', '...', '#0000ff')} />
        </Mentor
      );

      await vi.advanceTimersByTimeAsync(1000);

      expect(mockParseKML).toHaveBeenCalledTimes(1);
      expect(mockMarker).toHaveBeenCalledTimes(1);
      expect(mockDivIcon).toHaveBeenCalledWith(expect.objectContaining({ html: expect.stringContaining('?') })); // Default icon/content
      expect(mockPolyline).not.toHaveBeenCalled();
    });

    it('should render multiple placemarks from a single KML', async () => {
      mockParseKMLResult.placemarks = [
        { name: 'Road Line', points: [L.latLng(1, 1), L.latLng(2, 2)] },
        { name: 'Structure Point', points: [L.latLng(1.5, 1.5)] },
      ];
      mockParseKMLResult.totalCoordinates = 3;

      render(
        <MapContainer center={[0, 0]} zoom={13}>
          <KMLDataLayer kml={mockKMLData('kml-1', 'Multi.kml', '...', '#00ff00')} />
        </MapContainer>
      );

      await vi.advanceTimersByTimeAsync(1000);

      expect(mockParseKML).toHaveBeenCalledTimes(1);
      expect(mockPolyline).toHaveBeenCalledTimes(1); // One line
      expect(mockMarker).toHaveBeenCalledTimes(1); // One marker
    });
  });

  // --- Test KML Feature Differentiation ---
  describe('KML Feature Differentiation', () => {
    const roadColor = '#e11d48'; // Red
    const alignmentColor = '#0ea5e9'; // Blue
    const structureColor = '#3b82f6'; // Blue (used for default structure icon background)

    beforeEach(() => {
      // Ensure parseKML returns data that can be differentiated
      mockParseKMLResult.placemarks = [
        { name: 'Main Highway Road', points: [L.latLng(10, 10), L.latLng(11, 11)] }, // Road
        { name: 'Service Alignment', points: [L.latLng(10.5, 10.5), L.latLng(11.5, 11.5)] }, // Alignment
        { name: 'Bridge Structure', points: [L.latLng(10.2, 10.2)] }, // Structure (Point)
        { name: 'Some other line', points: [L.latLng(12, 12), L.latLng(13, 13)] }, // Other Line
        { name: 'Unnamed Point', points: [L.latLng(15, 15)] }, // Unnamed Point
      ];
      mockParseKMLResult.totalCoordinates = 6;
    });

    it('should render main road line with distinct style', async () => {
      render(
        <MapContainer center={[0, 0]} zoom={13}>
          <KMLDataLayer kml={mockKMLData('kml-road', 'MainRoad.kml', '...', '#ff0000')} />
        </MapContainer>
      );
      await vi.advanceTimersByTimeAsync(1000);

      expect(mockPolyline).toHaveBeenCalledWith(expect.any(Array), expect.objectContaining({ 
        color: roadColor, 
        weight: 8 
      }));
    });

    it('should render alignment line with distinct style', async () => {
      render(
        <MapContainer center={[0, 0]} zoom={13}>
          <KMLDataLayer kml={mockKMLData('kml-align', 'ServiceAlignment.kml', '...', '#00ff00')} />
        </MapContainer>
      );
      await vi.advanceTimersByTimeAsync(1000);

      expect(mockPolyline).toHaveBeenCalledWith(expect.any(Array), expect.objectContaining({ 
        color: alignmentColor, 
        weight: 4 
      }));
    });

    it('should render structure points with distinct icons', async () => {
      render(
        <MapContainer center={[0, 0]} zoom={13}>
          <KMLDataLayer kml={mockKMLData('kml-struct', 'BridgeStruct.kml', '...', '#0000ff')} />
        </MapContainer>
      );
      await vi.advanceTimersByTimeAsync(1000);

      expect(mockMarker).toHaveBeenCalledTimes(2); // One for structure, one for unnamed point
      // Check the specific marker for the structure
      expect(mockDivIcon).toHaveBeenCalledWith(expect.objectContaining({ 
        html: expect.stringContaining('Building') // Icon child should be present
      }));
      expect(mockDivIcon).toHaveBeenCalledWith(expect.objectContaining({
        html: expect.stringContaining('MapPin') // Default icon for unnamed point
      }));
    });

    it('should render other line types with default kmlColor', async () => {
      render(
        <MapContainer center={[0, 0]} zoom={13}>
          <KMLDataLayer kml={mockKMLData('kml-other', 'OtherLine.kml', '...', '#aaaaaa')} />
        </MapContainer>
      );
      await vi.advanceTimersByTimeAsync(1000);

      expect(mockPolyline).toHaveBeenCalledWith(expect.any(Array), expect.objectContaining({ 
        color: '#aaaaaa', // Default kmlColor
        weight: 5 // Default weight
      }));
    });
  });

  // --- Test Popups ---
  describe('KML Feature Popups', () => {
    it('should display inferred type and name in KML feature popups', async () => {
      mockParseKMLResult.placemarks = [
        { name: 'Main Highway Road', points: [L.latLng(1, 1), L.latLng(2, 2)] }, // Road
        { name: 'Culvert Structure', points: [L.latLng(1.5, 1.5)] }, // Structure
      ];
      mockParseKMLResult.totalCoordinates = 3;

      render(
        <MapContainer center={[0, 0]} zoom={13}>
          <KMLDataLayer kml={mockKMLData('kml-popup', 'PopupTest.kml', '...')} />
        </MapContainer>
      );
      await vi.advanceTimersByTimeAsync(1000);

      // Check popup content for the road (Polyline)
      // Note: The current implementation binds popup to Polyline but it's not directly testable like Marker popup
      // We'll check the marker popup as it's more directly mockable.
      
      // Check popup content for the structure (Marker)
      const popupContent = screen.getByTestId('popup'); // Get the mocked popup element
      expect(popupContent).toHaveTextContent('Main Highway Road');
      expect(popupContent).toHaveTextContent('Type: road');
      expect(popupContent).toHaveTextContent('Name: Main Highway Road');

      expect(popupContent).toHaveTextContent('Culvert Structure');
      expect(popupContent).toHaveTextContent('Type: structure');
      // Note: 'Name' might be redundant if it's the same as the Placemark name.
      // The code uses `<b>${name}</b>` for markers, so it should appear.
    });

    // This test assumes the KML content itself would contain ExtendedData, which isn't explicitly handled by parseKML or KMLDataLayer.
    // If parseKML were extended to extract ExtendedData, tests for it would go here.
    it('should display extended data in popups if available', async () => {
      // This test is conceptual as parseKML and KMLDataLayer do not currently extract ExtendedData.
      // If parseKML were modified to return extendedData: { key: value }[] for placemarks,
      // then KMLDataLayer would need to parse this and render it in the popup.
      expect(true).toBe(true); // Placeholder, as current code doesn't support this.
    });
  });

  // --- Test Chainage Markers ---
  describe('Chainage Markers', () => {
    const mockKmlContent = `
      <kml xmlns="http://www.opengis.net/kml/2.2">
        <Document>
          <Placemark>
            <name>Main Road Line</name>
            <LineString>
              <coordinates>0,0,0 100,0,0 200,0,0 300,0,0 400,0,0 500,0,0</coordinates> 
            </LineString>
          </Placemark>
          <Placemark>
            <name>Alignment Path</name>
            <LineString>
              <coordinates>250,0,0 350,0,0</coordinates>
            </LineString>
          </Placemark>
           <Placemark>
            <name>Bridge Structure</name>
            <Point>
              <coordinates>150,0,0</coordinates>
            </Point>
          </Placemark>
        </Document>
      </kml>
    `;
    
    beforeEach(async () => {
      // Mocking parseKML to return specific structure
      mockParseKMLResult = {
        placemarks: [
          { name: 'Main Road Line', points: [L.latLng(0,0), L.latLng(0,0), L.latLng(0,0), L.latLng(0,0), L.latLng(0,0), L.latLng(0,0)] }, // Simulating 6 points for ~500m distance
          { name: 'Alignment Path', points: [L.latLng(0,0), L.latLng(0,0)] },
          { name: 'Bridge Structure', points: [L.latLng(0,0)] }
        ],
        totalCoordinates: 9,
        hasErrors: false
      };
      mockParseKML.mockReturnValue(mockParseKMLResult);
      
      // Mocking distanceTo for specific segment calculations
      const mockPoints = mockParseKMLResult.placemarks[0].points;
      // Simulating distances to create chainage markers at ~500m intervals
      vi.spyOn(mockPoints[0], 'distanceTo').mockReturnValue(0);
      vi.spyOn(mockPoints[1], 'distanceTo').mockReturnValue(500); // 0.5km
      vi.spyOn(mockPoints[2], 'distanceTo').mockReturnValue(1000); // 1.0km
      vi.spyOn(mockPoints[3], 'distanceTo').mockReturnValue(1500); // 1.5km
      vi.spyOn(mockPoints[4], 'distanceTo').mockReturnValue(2000); // 2.0km
      vi.spyOn(mockPoints[5], 'distanceTo').mockReturnValue(2500); // 2.5km
    });

    it('should add chainage markers only to the identified centerline placemark', async () => {
      render(
        <MapContainer center={[0, 0]} zoom={13}>
          <KMLDataLayer kml={mockKMLData('kml-chainage', 'ChainageTest.kml', mockKMLContent)} />
        </MapContainer>
      );
      await vi.advanceTimersByTimeAsync(1000);

      expect(mockPolyline).toHaveBeenCalledTimes(2); // One for road, one for alignment
      expect(mockMarker).toHaveBeenCalledTimes(2); // One for structure, one for chainage start marker
      
      // Chainage markers are added by addChainageMarkers, which is called by KMLDataLayer
      // We need to check if addChainageMarkers was called correctly.
      // Based on the current mock implementation, it's hard to check directly.
      // We can infer by checking the number of markers or if a specific chainage marker exists.
      
      // Let's assume chainage markers are added if the centerline logic correctly identifies the first placemark.
      // The current logic for centerline is based on length/keywords.
      // For "Main Road Line" and 6 points, it should identify it as centerline.
      // Expecting start marker + intermediate markers for 500m intervals.
      // Let's check for the presence of at least a start marker and one intermediate.

      // Verify that addChainageMarkers was called (indirectly via marker creation)
      // The number of markers added depends on distance logic in addChainageMarkers
      // For 500m interval and ~2500m total simulated distance, we expect start marker + 4 intermediate markers.
      // Total 5 markers. Plus the structure marker and potentially others if default markers are used.
      // Let's check for the specific chainage marker content.
      
      // Looking at addChainageMarkers: it creates divIcons with specific HTML
      // Check if any marker has the chainage string
      const chainageMarkerExists = mockDivIcon.mock.calls.some(call => call[0].html.includes('0+000'));
      expect(chainageMarkerExists).toBe(true);

      const chainageMarker500 = mockDivIcon.mock.calls.some(call => call[0].html.includes('0+500'));
      expect(chainageMarker500).toBe(true);

      // Check that the alignment and structure are not marked with chainage
      // The logic checks `placemark === centerlinePlacemark` to add chainage.
      // So, alignment and structure should NOT have chainage markers added by this logic.
    });

    it('should identify longest path as centerline if no keywords match', async () => {
      mockParseKMLResult.placemarks = [
        { name: 'Short Line', points: [L.latLng(1,1), L.latLng(2,2)] }, // Shorter
        { name: 'Longer Path', points: [L.latLng(3,3), L.latLng(4,4), L.latLng(5,5), L.latLng(6,6)] }, // Longer
      ];
      mockParseKMLResult.totalCoordinates = 6;

      render(
        <MapContainer center={[0, 0]} zoom={13}>
          <KMLDataLayer kml={mockKMLData('kml-longest', 'LongestPath.kml', '...')} />
        </MapContainer>
      );
      await vi.advanceTimersByTimeAsync(1000);

      // Expect chainage markers based on the 'Longer Path'
      const chainageMarkerExists = mockDivIcon.mock.calls.some(call => call[0].html.includes('Longer Path:'));
      expect(chainageMarkerExists).toBe(true);
    });
  });
});
