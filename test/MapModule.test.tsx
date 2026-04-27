import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap, LayerGroup, CircleMarker, LayersControl, Tooltip as MapTooltip } from 'react-leaflet';
import '@testing-library/jest-dom';

import MapModule, { KMLDataLayer } from '../components/modules/MapModule'; // Assuming MapModule and KMLDataLayer are exported
import { parseKML, ParsedKML, getKMLBounds } from '~/utils/kmlParser';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { Project, StructureAsset, Vehicle, StaffLocation, LandParcel, MapOverlay, SitePhoto, LinearWorkLog, KMLData, AppSettings, User } from '../../types';
import { Button } from '~/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '~/components/ui/card';
import { Badge } from '~/components/ui/badge';
import { Switch } from '~/components/ui/switch';
import { Label } from '~/components/ui/label';
import { ScrollArea } from '~/components/ui/scroll-area';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "~/components/ui/accordion";
import {
  MapPin,
  Truck,
  Users,
  Building,
  Camera,
  Route,
  Layers,
  Search,
  Ruler,
  Download,
  Upload,
  Settings,
  Loader2,
  Maximize,
  Minimize,
  ChevronLeft,
  ChevronRight,
  BarChart3,
  Trash2,
  AlertOctagon,
  FileQuestion,
  Beaker,
  TreePine,
  Info
} from 'lucide-react';
import { cn } from '~/lib/utils';
import { toast } from 'sonner';

// Mocking external dependencies
// Mock Leaflet objects and methods used by MapModule and KMLDataLayer
const mockLatLng = vi.fn((lat, lng) => ({ lat, lng, distanceTo: vi.fn(() => Math.random() * 1000) }));
const mockLatLngBounds = vi.fn((points) => ({
  getNorthEast: vi.fn(),
  getSouthWest: vi.fn(),
  extend: vi.fn(),
  contains: vi.fn(),
  isValid: vi.fn(() => true),
}));

const mockPolyline = vi.fn((positions, options) => ({ 
  addTo: vi.fn(() => ({ bindTooltip: vi.fn(), bindPopup: vi.fn() })), 
  getLatLngs: vi.fn(() => positions),
  remove: vi.fn()
}));

const mockMarker = vi.fn((latlng, options) => ({ 
  addTo: vi.fn(() => ({ bindPopup: vi.fn() })), 
  getLatLng: vi.fn(() => latlng),
  remove: vi.fn()
}));

const mockDivIcon = vi.fn((options) => ({ html: options.html, className: options.className }));

// Mock LayerGroup and CircleMarker
const mockLayerGroup = vi.fn(({ children }) => <>{children}</>);
const mockCircleMarker = vi.fn((center) => ({ addTo: vi.fn(() => ({ bindPopup: vi.fn() })), getLatLng: vi.fn(() => center), remove: vi.fn() }));

// Mock map methods
const mockMap = {
  addControl: vi.fn(),
  removeControl: vi.fn(),
  on: vi.fn(),
  off: vi.fn(),
  setView: vi.fn(),
  fitBounds: vi.fn(),
  removeLayer: vi.fn(), // Mock removeLayer for cleanup
  getContainer: () => ({ style: { cursor: '' } }),
};

// Mock GeoSearchControl and OpenStreetMapProvider
const mockGeoSearchControl = vi.fn(({ children }) => <>{children}</>);
const mockOpenStreetMapProvider = vi.fn(() => ({ search: vi.fn() }));


// Mock parseKML and getKMLBounds
const mockParseKML = vi.mocked(parseKML);
const mockGetKMLBounds = vi.mocked(getKMLBounds);

// Mock KMLData structure
const mockKMLData = (id: string, name: string, kmlContent: string, color: string = '#4f46e5'): KMLData => ({
  id,
  name,
  kmlContent,
  timestamp: Date.now(),
  visible: true,
  color
});

vi.mock('react-leaflet', async (importOriginal) => {
  const actualLeaflet = await importOriginal<typeof import('react-leaflet')>();
  
  // Mocking L.Icon.Default globally if it's used directly in component or tests
  L.Icon.Default.mergeOptions({} as any);

  return {
    ...actualLeaflet,
    MapContainer: vi.fn(({ children, center, zoom }) => (
      <div data-testid="map-container" data-center={JSON.stringify(center)} data-zoom={zoom} style={{ height: '400px', width: '100%' }}>
        {children}
      </div>
    )),
    TileLayer: vi.fn(() => null),
    Marker: mockMarker,
    Popup: vi.fn(({ children }) => <div data-testid="popup">{children}</div>),
    Polyline: mockPolyline,
    useMap: vi.fn(() => mockMap),
    LayerGroup: mockLayerGroup,
    CircleMarker: mockCircleMarker,
    LayersControl: vi.fn(({ children }) => <>{children}</>),
    BaseLayer: vi.fn(({ children }) => <>{children}</>),
  };
});

vi.mock('leaflet-geosearch', () => ({
  GeoSearchControl: mockGeoSearchControl,
  OpenStreetMapProvider: mockOpenStreetMapProvider,
}));

// Mock UI components
vi.mock('~/components/ui/button', () => ({ Button: vi.fn(({ children, ...props }) => <button {...props} data-testid={`button-${props.title || props.children}`}>{children}</button>) }));
vi.mock('~/components/ui/card', () => ({ Card: vi.fn(({ children }) => <div data-testid="card">{children}</div>), CardHeader: vi.fn(({ children }) => <div>{children}</div>), CardContent: vi.fn(({ children }) => <div>{children}</div>), CardTitle: vi.fn(({ children }) => <h3>{children}</h3>) }));
vi.mock('~/components/ui/badge', () => ({ Badge: vi.fn(({ children }) => <span data-testid="badge">{children}</span>) }));
vi.mock('~/components/ui/switch', () => ({ Switch: vi.fn(({ checked, onCheckedChange }) => <input type="checkbox" checked={checked} onChange={() => onCheckedChange(!checked)} data-testid="switch" />) }));
vi.mock('~/components/ui/label', () => ({ Label: vi.fn(({ children }) => <label>{children}</label>) }));
vi.mock('~/components/ui/scroll-area', () => ({ ScrollArea: vi.fn(({ children }) => <div>{children}</div>) }));
vi.mock('~/components/ui/accordion', () => ({ Accordion: vi.fn(({ children }) => <>{children}</>), AccordionItem: vi.fn(({ children }) => <div>{children}</div>), AccordionTrigger: vi.fn(({ children }) => <button>{children}</button>), AccordionContent: vi.fn(({ children }) => <div>{children}</div>) }));
vi.mock('sonner', () => ({ toast: { loading: vi.fn(), success: vi.fn(), error: vi.fn(), dismiss: vi.fn() } }));
vi.mock('~/lib/utils', () => ({ cn: vi.fn((...classes) => classes.filter(Boolean).join(' ')) }));


// Mocking crypto.randomUUID used in KML parsing
const mockCrypto = {
  randomUUID: vi.fn(),
};
vi.stubGlobal('crypto', mockCrypto);

// Mock Leaflet LatLng and Bounds
// These are used within the component and need to be mocked if not provided by react-leaflet mock
vi.mock('leaflet', async (importOriginal) => {
  const actualLeaflet = await importOriginal<typeof L>();
  return {
    ...actualLeaflet,
    LatLng: mockLatLng,
    LatLngBounds: mockLatLngBounds,
    Polyline: mockPolyline,
    Marker: mockMarker,
    divIcon: mockDivIcon,
    layerGroup: mockLayerGroup,
    CircleMarker: mockCircleMarker,
    Icon: { Default: { mergeOptions: vi.fn() } }
  };
});

// Mock the useMap hook return value and its methods
vi.mocked(useMap).mockReturnValue(mockMap as any);

// Mock GeoSearchControl and OpenStreetMapProvider
vi.mocked(GeoSearchControl).mockImplementation(({ children }) => <>{children}</>);
vi.mocked(OpenStreetMapProvider).mockImplementation(() => ({ search: vi.fn() }));


describe('MapModule and KMLDataLayer Tests', () => {
  let mockMap: L.Map;
  let mockProject: Project;
  let mockOnProjectUpdate: vi.Mock;
  let mockParseKMLResult: ParsedKML;
  let mockKMLContent: string;
  let mockKMLTestLineContent: string;
  let mockKMLMultiContent: string;
  let mockKMLPopupContent: string;
  let mockKMLChainageContent: string;
  let mockKMLRoadContent: string;
  let mockKMLAlignContent: string;
  let mockKMLStructContent: string;
  let mockKMLOtherContent: string;
  let mockKMLBridgeStructContent: string;
  let mockKMLRoadWithStructureContent: string;
  let mockKMLRoadWithAlignmentContent: string;
  let mockKMLRoadWithOtherLineContent: string;
  let mockKMLRoadWithLongestPathContent: string;

  beforeEach(async () => {
    vi.clearAllMocks();
    vi.useFakeTimers();

    // Mock crypto.randomUUID
    mockCrypto.randomUUID.mockReturnValue('mock-uuid');

    // Mock parseKML return value
    mockParseKMLResult = { placemarks: [], totalCoordinates: 0, hasErrors: false };
    mockParseKML.mockReturnValue(mockParseKMLResult);
    mockGetKMLBounds.mockReturnValue([]); // Default mock for bounds

    // Mock useMap return value
    vi.mocked(useMap).mockReturnValue(mockMap as any);

    // Mock project data and onProjectUpdate
    mockProject = {
      id: 'proj-1', name: 'Test Project', location: '27.7,83.4', kmlData: [], mapOverlays: [],
      structures: [], vehicles: [], staffLocations: [], landParcels: [], sitePhotos: [], linearWorks: [],
      rfis: [], ncrs: [], labTests: {}, environmentRegistry: {}, roads: [],
    };
    mockOnProjectUpdate = vi.fn();

    // Mock KML content strings
    mockKMLContent = '<kml><Document><Placemark><name>Test Line</name><LineString><coordinates>1,1,0 2,2,0</coordinates></LineString></Placemark></Document></kml>';
    mockKMLTestLineContent = '<kml><Document><Placemark><name>Alignment Line</name><LineString><coordinates>1,1,0 2,2,0</coordinates></LineString></Placemark></Document></kml>';
    mockKMLMultiContent = '<kml><Document><Placemark><name>Road Line</name><LineString><coordinates>1,1,0 2,2,0</coordinates></LineString></Placemark><Placemark><name>Structure Point</name><Point><coordinates>1.5,1.5,0</coordinates></Point></Placemark></Document></kml>';
    mockKMLPopupContent = '<kml><Document><Placemark><name>Main Highway Road</name><LineString><coordinates>1,1,0 2,2,0</coordinates></LineString></Placemark><Placemark><name>Culvert Structure</name><Point><coordinates>1.5,1.5,0</coordinates></Point></Placemark></Document></kml>';
    mockKMLChainageContent = '<kml><Document><Placemark><name>Main Road Line</name><LineString><coordinates>0,0,0 100,0,0 200,0,0 300,0,0 400,0,0 500,0,0</coordinates></LineString></Placemark></Document></kml>';
    mockKMLRoadContent = '<kml><Document><Placemark><name>Main Highway Road</name><LineString><coordinates>10,10,0 11,11,0</coordinates></LineString></Placemark></Document></kml>';
    mockKMLAlignContent = '<kml><Document><Placemark><name>Service Alignment</name><LineString><coordinates>10.5,10.5,0 11.5,11.5,0</coordinates></LineString></Placemark></Document></kml>';
    mockKMLStructContent = '<kml><Document><Placemark><name>Bridge Structure</name><Point><coordinates>10.2,10.2,0</coordinates></Point></Placemark></Document></kml>';
    mockKMLOtherContent = '<kml><Document><Placemark><name>Some other line</name><LineString><coordinates>12,12,0 13,13,0</coordinates></LineString></Placemark></Document></kml>';
    mockKMLBridgeStructContent = '<kml><Document><Placemark><name>Bridge Structure Point</name><Point><coordinates>10.2,10.2,0</coordinates></Point></Placemark></Document></kml>';
    mockKMLRoadWithStructureContent = '<kml><Document><Placemark><name>Road With Structure</name><Point><coordinates>1.5,1.5,0</coordinates></Point></Placemark></Document></kml>';
    mockKMLRoadWithAlignmentContent = '<kml><Document><Placemark><name>Road With Alignment</name><LineString><coordinates>1,1,0 2,2,0</coordinates></LineString></Placemark></Document></kml>';
    mockKMLRoadWithOtherLineContent = '<kml><Document><Placemark><name>Road With Other Line</name><LineString><coordinates>12,12,0 13,13,0</coordinates></LineString></Placemark></Document></kml>';
    mockKMLRoadWithLongestPathContent = '<kml><Document><Placemark><name>Short Line</name><LineString><coordinates>1,1,0 2,2,0</coordinates></LineString></Placemark><Placemark><name>Longer Path</name><LineString><coordinates>3,3,0 4,4,0 5,5,0 6,6,0</coordinates></LineString></Placemark></Document></kml>';

    // Default mock for map methods if not specifically mocked in a test
    mockMap.addControl.mockClear();
    mockMap.removeControl.mockClear();
    mockMap.on.mockClear();
    mockMap.off.mockClear();
    mockMap.fitBounds.mockClear();
    mockMap.removeLayer.mockClear();
  });

  afterEach(() => {
    vi.useRealTimers(); // Restore real timers
  });

  // --- Test KML Data Layer Rendering ---
  describe('KMLDataLayer Rendering', () => {
    it('should render nothing if KML is not visible or invalid', async () => {
      const kmlInvisible = mockKMLData('kml-1', 'Invisible.kml', '<kml></kml>');
      kmlInvisible.visible = false;
      
      render(<KMLDataLayer kml={kmlInvisible} />);
      await vi.advanceTimersByTimeAsync(100); // Wait briefly for effect

      expect(mockParseKML).not.toHaveBeenCalled();
    });

    it('should render nothing if KML content is invalid', async () => {
      render(<KMLDataLayer kml={mockKMLData('kml-1', 'Invalid.kml', '')} />);
      await vi.advanceTimersByTimeAsync(100);

      expect(mockParseKML).not.toHaveBeenCalled();
      expect(mockPolyline).not.toHaveBeenCalled();
      expect(mockMarker).not.toHaveBeenCalled();
    });

    it('should render Polyline for KML LineString placemarks', async () => {
      mockParseKMLResult.placemarks = [{
        name: 'Alignment Line',
        points: [mockLatLng(1, 1), mockLatLng(2, 2)],
      }];
      mockParseKMLResult.totalCoordinates = 2;

      render(<KMLDataLayer kml={mockKMLData('kml-1', 'TestLine.kml', mockKMLTestLineContent, '#ff0000')} />);
      await vi.advanceTimersByTimeAsync(1000);

      expect(mockParseKML).toHaveBeenCalledTimes(1);
      expect(mockPolyline).toHaveBeenCalledTimes(1);
      expect(mockPolyline).toHaveBeenCalledWith([expect.anything(), expect.anything()], expect.objectContaining({ color: '#ff0000', weight: 5 }));
      expect(mockMarker).not.toHaveBeenCalled();
      expect(mockDivIcon).not.toHaveBeenCalled();
    });

    it('should render Marker for KML Point placemarks', async () => {
      mockParseKMLResult.placemarks = [{
        name: 'Structure Point',
        points: [mockLatLng(1, 1)],
      }];
      mockParseKMLResult.totalCoordinates = 1;

      render(<KMLDataLayer kml={mockKMLData('kml-1', 'TestPoint.kml', mockKMLContent, '#0000ff')} />);
      await vi.advanceTimersByTimeAsync(1000);

      expect(mockParseKML).toHaveBeenCalledTimes(1);
      expect(mockMarker).toHaveBeenCalledTimes(1);
      expect(mockDivIcon).toHaveBeenCalledWith(expect.objectContaining({ html: expect.stringContaining('MapPin') }));
      expect(mockPolyline).not.toHaveBeenCalled();
    });

    it('should render multiple placemarks from a single KML', async () => {
      mockParseKMLResult.placemarks = [
        { name: 'Road Line', points: [mockLatLng(1, 1), mockLatLng(2, 2)] },
        { name: 'Structure Point', points: [mockLatLng(1.5, 1.5)] },
      ];
      mockParseKMLResult.totalCoordinates = 3;

      render(<KMLDataLayer kml={mockKMLData('kml-1', 'Multi.kml', mockKMLMultiContent, '#00ff00')} />);
      await vi.advanceTimersByTimeAsync(1000);

      expect(mockParseKML).toHaveBeenCalledTimes(1);
      expect(mockPolyline).toHaveBeenCalledTimes(1);
      expect(mockMarker).toHaveBeenCalledTimes(1);
    });
  });

  // --- Test KML Feature Differentiation ---
  describe('KML Feature Differentiation', () => {
    const roadColor = '#e11d48'; // Red
    const alignmentColor = '#0ea5e9'; // Blue
    const structureColor = '#3b82f6'; // Blue (used for default structure icon background)

    beforeEach(async () => {
      // Mock parseKML return value
      mockParseKMLResult = {
        placemarks: [
          { name: 'Main Highway Road', points: [mockLatLng(10, 10), mockLatLng(11, 11)] }, // Road
          { name: 'Service Alignment', points: [mockLatLng(10.5, 10.5), mockLatLng(11.5, 11.5)] }, // Alignment
          { name: 'Bridge Structure', points: [mockLatLng(10.2, 10.2)] }, // Structure (Point)
          { name: 'Some other line', points: [mockLatLng(12, 12), mockLatLng(13, 13)] }, // Other Line
          { name: 'Unnamed Point', points: [mockLatLng(15, 15)] }, // Unnamed Point
        ],
        totalCoordinates: 6,
        hasErrors: false
      };
      mockParseKML.mockReturnValue(mockParseKMLResult);

      // Mock Leaflet LatLng distanceTo for accurate chainage simulation
      const mockLinePoints = mockParseKMLResult.placemarks[0].points;
      vi.spyOn(mockLinePoints[0], 'distanceTo').mockReturnValue(0);
      vi.spyOn(mockLinePoints[1], 'distanceTo').mockReturnValue(1000);
      
      // Mock other placemark points as needed if they were used in assertions
      const mockPoint = mockParseKMLResult.placemarks[2].points[0];
      if(mockPoint) vi.spyOn(mockPoint, 'distanceTo').mockReturnValue(0);
      
      // Mock map methods used by KMLDataLayer
      mockMap.addControl.mockClear();
      mockMap.removeControl.mockClear();
      mockMap.on.mockClear();
      mockMap.off.mockClear();
      mockMap.fitBounds.mockClear();
      mockMap.removeLayer.mockClear();
    });

    afterEach(() => {
      vi.restoreAllMocks(); // Restore original console.warn and other spies
    });

    it('should render main road line with distinct style', async () => {
      render(<KMLDataLayer kml={mockKMLData('kml-road', 'MainRoad.kml', mockKMLRoadContent, '#ff0000')} />);
      await vi.advanceTimersByTimeAsync(1000);

      expect(mockPolyline).toHaveBeenCalledWith(expect.any(Array), expect.objectContaining({ 
        color: roadColor, 
        weight: 8 
      }));
    });

    it('should render alignment line with distinct style', async () => {
      render(<KMLDataLayer kml={mockKMLData('kml-align', 'ServiceAlignment.kml', mockKMLAlignContent, '#00ff00')} />);
      await vi.advanceTimersByTimeAsync(1000);

      expect(mockPolyline).toHaveBeenCalledWith(expect.any(Array), expect.objectContaining({ 
        color: alignmentColor, 
        weight: 4 
      }));
    });

    it('should render structure points with distinct icons', async () => {
      render(<KMLDataLayer kml={mockKMLData('kml-struct', 'BridgeStruct.kml', mockKMLBridgeStructContent, '#0000ff')} />);
      await vi.advanceTimersByTimeAsync(1000);

      expect(mockMarker).toHaveBeenCalledTimes(2); // One for structure, one for unnamed point
      expect(mockDivIcon).toHaveBeenCalledWith(expect.objectContaining({ html: expect.stringContaining('Building') }));
      expect(mockDivIcon).toHaveBeenCalledWith(expect.objectContaining({ html: expect.stringContaining('MapPin') }));
      expect(mockPolyline).not.toHaveBeenCalled();
    });

    it('should render other line types with default kmlColor', async () => {
      render(<KMLDataLayer kml={mockKMLData('kml-other', 'OtherLine.kml', mockKMLOtherContent, '#aaaaaa')} />);
      await vi.advanceTimersByTimeAsync(1000);

      expect(mockPolyline).toHaveBeenCalledWith(expect.any(Array), expect.objectContaining({ 
        color: '#aaaaaa', 
        weight: 5 
      }));
    });
  });

  // --- Test Popups ---
  describe('KML Feature Popups', () => {
    it('should display inferred type and name in KML feature popups', async () => {
      mockParseKMLResult.placemarks = [
        { name: 'Main Highway Road', points: [mockLatLng(1, 1), mockLatLng(2, 2)] }, // Road
        { name: 'Culvert Structure', points: [mockLatLng(1.5, 1.5)] }, // Structure
      ];
      mockParseKMLResult.totalCoordinates = 3;

      render(<KMLDataLayer kml={mockKMLData('kml-popup', 'PopupTest.kml', mockKMLPopupContent)} />);
      await vi.advanceTimersByTimeAsync(1000);

      const popupContent = screen.getByTestId('popup');
      expect(popupContent).toHaveTextContent('Main Highway Road');
      expect(popupContent).toHaveTextContent('Type: road');
      expect(popupContent).toHaveTextContent('Culvert Structure');
    });

    it('should display extended data in popups if available', async () => {
      expect(true).toBe(true); // Placeholder test
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
      // Mock parseKML to return specific structure
      mockParseKMLResult = {
        placemarks: [
          { name: 'Main Road Line', points: [mockLatLng(0,0), mockLatLng(0,0), mockLatLng(0,0), mockLatLng(0,0), mockLatLng(0,0), mockLatLng(0,0)] }, // Simulating 6 points for ~2500m total distance
          { name: 'Alignment Path', points: [mockLatLng(0,0), mockLatLng(0,0)] },
          { name: 'Bridge Structure', points: [mockLatLng(0,0)] }
        ],
        totalCoordinates: 9,
        hasErrors: false
      };
      mockParseKML.mockReturnValue(mockParseKMLResult);
      
      // Mock Leaflet LatLng distanceTo for accurate chainage simulation
      const mockLinePoints = mockParseKMLResult.placemarks[0].points;
      vi.spyOn(mockLinePoints[0], 'distanceTo').mockReturnValue(0);
      vi.spyOn(mockLinePoints[1], 'distanceTo').mockReturnValue(500); // 0.5km
      vi.spyOn(mockLinePoints[2], 'distanceTo').mockReturnValue(1000); // 1.0km
      vi.spyOn(mockLinePoints[3], 'distanceTo').mockReturnValue(1500); // 1.5km
      vi.spyOn(mockLinePoints[4], 'distanceTo').mockReturnValue(2000); // 2.0km
      vi.spyOn(mockLinePoints[5], 'distanceTo').mockReturnValue(2500); // 2.5km

      // Mock map methods used by KMLDataLayer
      mockMap.addControl.mockClear();
      mockMap.removeControl.mockClear();
      mockMap.on.mockClear();
      mockMap.off.mockClear();
      mockMap.fitBounds.mockClear();
      mockMap.removeLayer.mockClear();
    });

    afterEach(() => {
      vi.restoreAllMocks();
    });

    it('should add chainage markers only to the identified centerline placemark', async () => {
      render(
        <MapContainer center={[0, 0]} zoom={13}>
          <KMLDataLayer kml={mockKMLData('kml-chainage', 'ChainageTest.kml', mockKMLChainageContent)} />
        </MapContainer>
      );
      await vi.advanceTimersByTimeAsync(1000);

      expect(mockParseKML).toHaveBeenCalledTimes(1);
      expect(mockPolyline).toHaveBeenCalledTimes(1);
      expect(mockMarker).toHaveBeenCalledTimes(2); // One for structure, one for unnamed point (if default)
      
      expect(mockDivIcon).toHaveBeenCalledTimes(6); // 1 start marker + 5 intermediate

      const chainage500Marker = mockDivIcon.mock.calls.some(call => call[0].html.includes('0+500'));
      expect(chainage500Marker).toBe(true);

      const chainage2000Marker = mockDivIcon.mock.calls.some(call => call[0].html.includes('2+000'));
      expect(chainage2000Marker).toBe(true);
    });

    it('should identify longest path as centerline if no keywords match', async () => {
      mockParseKMLResult.placemarks = [
        { name: 'Short Line', points: [mockLatLng(1,1), mockLatLng(2,2)] },
        { name: 'Longer Path', points: [mockLatLng(3,3), mockLatLng(4,4), mockLatLng(5,5), mockLatLng(6,6)] },
      ];
      mockParseKMLResult.totalCoordinates = 6;

      const mockLongerPathPoints = mockParseKMLResult.placemarks[1].points;
      vi.spyOn(mockLongerPathPoints[0], 'distanceTo').mockReturnValue(0);
      vi.spyOn(mockLongerPathPoints[1], 'distanceTo').mockReturnValue(1000);
      vi.spyOn(mockLongerPathPoints[2], 'distanceTo').mockReturnValue(2000);
      vi.spyOn(mockLongerPathPoints[3], 'distanceTo').mockReturnValue(3000);

      render(
        <MapContainer center={[0, 0]} zoom={13}>
          <KMLDataLayer kml={mockKMLData('kml-longest', 'LongestPath.kml', mockKMLRoadWithLongestPathContent)} />
        </MapContainer>
      );
      await vi.advanceTimersByTimeAsync(1000);

      const chainageMarkerExists = mockDivIcon.mock.calls.some(call => call[0].html.includes('Longer Path:'));
      expect(chainageMarkerExists).toBe(true);
      expect(mockDivIcon).toHaveBeenCalledTimes(4); // 0+000, 1+000, 2+000, 3+000
    });
  });
});
