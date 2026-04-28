import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import React from 'react';

// Increase global timeout for this file
vi.setConfig({ testTimeout: 30000 });

// Mock UI components first to avoid issues
vi.mock('~/components/ui/button', () => ({ Button: ({ children, ...props }: any) => <button {...props}>{children}</button> }));
vi.mock('~/components/ui/card', () => ({ Card: ({ children }: any) => <div>{children}</div>, CardHeader: ({ children }: any) => <div>{children}</div>, CardContent: ({ children }: any) => <div>{children}</div>, CardTitle: ({ children }: any) => <h3>{children}</h3> }));
vi.mock('~/components/ui/badge', () => ({ Badge: ({ children }: any) => <span>{children}</span> }));
vi.mock('~/components/ui/switch', () => ({ Switch: ({ checked, onCheckedChange }: any) => <input type="checkbox" checked={checked} onChange={() => onCheckedChange(!checked)} /> }));
vi.mock('~/components/ui/label', () => ({ Label: ({ children }: any) => <label>{children}</label> }));
vi.mock('~/components/ui/scroll-area', () => ({ ScrollArea: ({ children }: any) => <div>{children}</div> }));
vi.mock('~/components/ui/accordion', () => ({ Accordion: ({ children }: any) => <>{children}</>, AccordionItem: ({ children }: any) => <div>{children}</div>, AccordionTrigger: ({ children }: any) => <button>{children}</button>, AccordionContent: ({ children }: any) => <div>{children}</div> }));
vi.mock('sonner', () => ({ toast: { loading: vi.fn(), success: vi.fn(), error: vi.fn(), dismiss: vi.fn() } }));
vi.mock('~/lib/utils', () => ({ cn: (...classes: any[]) => classes.filter(Boolean).join(' ') }));

// Hoist Leaflet/Map mocks
const { 
  mockMap, 
  mockMarker, 
  mockPolyline, 
  mockCircleMarker, 
  mockLayerGroup,
  mockLatLng,
  mockLayersControl
} = vi.hoisted(() => {
  const layersControl: any = ({ children }: any) => <>{children}</>;
  layersControl.BaseLayer = ({ children }: any) => <>{children}</>;
  layersControl.Overlay = ({ children }: any) => <>{children}</>;

  return {
    mockMap: {
      addControl: vi.fn(),
      removeControl: vi.fn(),
      on: vi.fn(),
      off: vi.fn(),
      setView: vi.fn(),
      fitBounds: vi.fn(),
      removeLayer: vi.fn(),
      getContainer: () => ({ style: { cursor: '' } }),
    },
    mockMarker: vi.fn(() => ({ addTo: vi.fn(() => ({ bindPopup: vi.fn().mockReturnThis() })), getLatLng: vi.fn(), remove: vi.fn() })),
    mockPolyline: vi.fn(() => ({ addTo: vi.fn(() => ({ bindTooltip: vi.fn().mockReturnThis(), bindPopup: vi.fn().mockReturnThis() })), getLatLngs: vi.fn(), remove: vi.fn() })),
    mockCircleMarker: vi.fn(() => ({ addTo: vi.fn(() => ({ bindPopup: vi.fn().mockReturnThis() })), getLatLng: vi.fn(), remove: vi.fn() })),
    mockLayerGroup: vi.fn(({ children }) => <>{children}</>),
    mockLatLng: vi.fn((lat, lng) => ({ lat, lng, distanceTo: vi.fn(() => 0) })),
    mockLayersControl: layersControl
  };
});

vi.mock('react-leaflet', () => ({
  MapContainer: ({ children }: any) => <div data-testid="map-container">{children}</div>,
  TileLayer: () => null,
  Marker: mockMarker,
  Popup: ({ children }: any) => <div data-testid="popup">{children}</div>,
  Polyline: mockPolyline,
  Polygon: ({ children }: any) => <>{children}</>,
  useMap: () => mockMap,
  LayerGroup: mockLayerGroup,
  CircleMarker: mockCircleMarker,
  LayersControl: mockLayersControl,
  Tooltip: ({ children }: any) => <div>{children}</div>,
}));

vi.mock('leaflet', () => {
  const MockIconDefault = vi.fn();
  (MockIconDefault as any).prototype.mergeOptions = vi.fn();
  (MockIconDefault as any).mergeOptions = vi.fn();

  const mockLayer = () => ({ 
    addTo: vi.fn().mockReturnThis(), 
    bindPopup: vi.fn().mockReturnThis(), 
    bindTooltip: vi.fn().mockReturnThis(),
    getLatLng: vi.fn(),
    getLatLngs: vi.fn(),
    remove: vi.fn()
  });

  return {
    default: {
      Icon: { Default: MockIconDefault },
      divIcon: vi.fn(() => ({})),
      latLng: mockLatLng,
      polyline: vi.fn(mockLayer),
      marker: vi.fn(mockLayer),
      circleMarker: vi.fn(mockLayer),
      layerGroup: vi.fn(() => ({ addTo: vi.fn() })),
      latLngBounds: vi.fn(() => ({ extend: vi.fn(), isValid: vi.fn(() => true) })),
      Control: {
        extend: vi.fn(() => {
          const Constructor: any = function() {
            return { addTo: vi.fn() };
          };
          Constructor.prototype.addTo = vi.fn();
          return Constructor;
        })
      }
    },
    Icon: { Default: MockIconDefault },
    divIcon: vi.fn(() => ({})),
    latLng: mockLatLng,
    polyline: vi.fn(mockLayer),
    marker: vi.fn(mockLayer),
    circleMarker: vi.fn(mockLayer),
    LatLngBounds: vi.fn(() => ({ extend: vi.fn(), isValid: vi.fn(() => true) })),
    latLngBounds: vi.fn(() => ({ extend: vi.fn(), isValid: vi.fn(() => true) })),
    Control: {
      extend: vi.fn(() => {
        const Constructor: any = function() {
          return { addTo: vi.fn() };
        };
        Constructor.prototype.addTo = vi.fn();
        return Constructor;
      })
    }
  };
});

vi.mock('~/components/ui/dialog', () => ({
  Dialog: ({ children, open }: any) => open ? <div data-testid="dialog">{children}</div> : null,
  DialogContent: ({ children }: any) => <div>{children}</div>,
  DialogHeader: ({ children }: any) => <div>{children}</div>,
  DialogTitle: ({ children }: any) => <h2>{children}</h2>,
  DialogDescription: ({ children }: any) => <p>{children}</p>,
  DialogFooter: ({ children }: any) => <div>{children}</div>,
}));

vi.mock('~/utils/kmlParser', () => ({
  parseKML: vi.fn(),
  getKMLBounds: vi.fn(),
}));

// Now import the rest
import MapModule, { KMLDataLayer } from '../components/modules/MapModule';
import { parseKML, getKMLBounds } from '~/utils/kmlParser';
import L from 'leaflet';

describe('MapModule Integration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders MapModule component', async () => {
    const mockProject = {
      id: 'p1', name: 'Test', roads: [], kmlData: [], mapOverlays: [],
      structures: [], vehicles: [], staffLocations: [], landParcels: [], sitePhotos: [], linearWorks: []
    } as any;
    
    render(<MapModule project={mockProject} onProjectUpdate={vi.fn()} settings={{} as any} users={[]} />);
    
    // Check for some static text that appears eventually
    await waitFor(() => {
       expect(screen.getByText(/Map Statistics/i)).toBeInTheDocument();
    }, { timeout: 10000 });
  });

  it('renders KMLDataLayer when KML is provided', async () => {
    const mockKml = {
      id: 'k1',
      name: 'test.kml',
      kmlContent: '<kml></kml>',
      visible: true,
      color: '#ff0000'
    } as any;

    vi.mocked(parseKML).mockReturnValue({
      placemarks: [
        { name: 'Road', points: [L.latLng(10, 10), L.latLng(11, 11)] }
      ],
      totalCoordinates: 2,
      hasErrors: false
    } as any);

    render(<KMLDataLayer kml={mockKml} />);
    expect(parseKML).toHaveBeenCalled();
  });
});
