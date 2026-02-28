import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polygon, Polyline, useMap, LayerGroup, CircleMarker } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { Project, StructureAsset, Vehicle, StaffLocation, LandParcel, MapOverlay, SitePhoto, LinearWorkLog, KMLData } from '../../types';
import { Button } from '~/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '~/components/ui/card';
import { Badge } from '~/components/ui/badge';
import { Switch } from '~/components/ui/switch';
import { Label } from '~/components/ui/label';
import { ScrollArea } from '~/components/ui/scroll-area';
import { Separator } from '~/components/ui/separator';
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
  Eye,
  EyeOff,
  Loader2,
  Maximize,
  Minimize
} from 'lucide-react';
import { cn } from '~/lib/utils';

import omnivore from 'leaflet-omnivore';
import { GeoSearchControl, OpenStreetMapProvider } from 'leaflet-geosearch';
import 'leaflet-geosearch/dist/geosearch.css';

// Fix for default markers in react-leaflet
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

interface MapModuleProps {
  project: Project;
  onProjectUpdate: (project: Partial<Project>) => void;
  settings?: AppSettings;
}

// KML Layer Component
/**
 * Component to render and sync KML data from XML content using leaflet-omnivore.
 * Since leaflet-omnivore is not a React component, we use a custom useEffect
 * to handle the direct leaflet layer manipulation on the map instance.
 */
const KMLDataLayer: React.FC<{ kmlData: KMLData[] }> = ({ kmlData }) => {
  const map = useMap();

  useEffect(() => {
    const layers: L.Layer[] = [];
    
    kmlData.forEach(kml => {
      if (kml.visible && kml.content) {
        try {
          // leaflet-omnivore parses KML directly into a leaflet layer
          const kmlLayer = omnivore.kml.parse(kml.content);
          kmlLayer.addTo(map);
          layers.push(kmlLayer);
        } catch (error) {
          console.error(`Failed to parse KML: ${kml.name}`, error);
        }
      }
    });

    // Clean up all layers when component unmounts or data changes
    return () => {
      layers.forEach(layer => map.removeLayer(layer));
    };
  }, [kmlData, map]);

  return null;
};

// Search Field Component
const SearchField: React.FC = () => {
  const map = useMap();
  useEffect(() => {
    const provider = new OpenStreetMapProvider();
    const searchControl = new (GeoSearchControl as any)({
      provider: provider,
      style: 'bar',
      showMarker: true,
      showPopup: true,
      autoClose: true,
      retainZoomLevel: false,
      animateZoom: true,
      keepResult: true,
    });

    map.addControl(searchControl);
    return () => {
      map.removeControl(searchControl);
    };
  }, [map]);

  return null;
};

// Custom hook for map center updates
const MapCenterUpdater: React.FC<{ center: [number, number]; zoom: number }> = ({ center, zoom }) => {
  const map = useMap();
  useEffect(() => {
    map.setView(center, zoom);
  }, [center, zoom, map]);
  return null;
};

/**
 * A simple distance measurement tool (Ruler) that allows users to click
 * consecutive points on the map to calculate the cumulative distance.
 */
const MapRuler: React.FC<{ 
  active: boolean; 
  onClose: () => void;
}> = ({ active, onClose }) => {
  const map = useMap();
  const [points, setPoints] = useState<L.LatLng[]>([]);
  const [totalDistance, setTotalDistance] = useState(0);

  useEffect(() => {
    if (!active) {
      setPoints([]);
      setTotalDistance(0);
      return;
    }

    const onClick = (e: L.LeafletMouseEvent) => {
      setPoints(prev => {
        const newPoints = [...prev, e.latlng];
        // Only calculate distance if there are at least two points
        if (newPoints.length > 1) {
          let dist = 0;
          for (let i = 0; i < newPoints.length - 1; i++) {
            dist += newPoints[i].distanceTo(newPoints[i+1]);
          }
          setTotalDistance(dist);
        }
        return newPoints;
      });
    };

    // Change cursor to indicate measurement mode
    map.getContainer().style.cursor = 'crosshair';
    map.on('click', onClick);
    
    return () => {
      map.getContainer().style.cursor = '';
      map.off('click', onClick);
    };
  }, [active, map]);

  if (!active || points.length === 0) return null;

  return (
    <LayerGroup>
      <Polyline positions={points} pathOptions={{ color: '#ef4444', weight: 3, dashArray: '5, 5' }} />
      {points.map((p, i) => (
        <CircleMarker key={i} center={p} radius={4} pathOptions={{ color: '#ef4444', fillOpacity: 1 }} />
      ))}
      {points.length > 0 && (
        <Marker position={points[points.length - 1]} icon={L.divIcon({
          className: 'bg-white border-2 border-red-500 rounded px-2 py-1 text-xs font-bold text-red-500 shadow-lg whitespace-nowrap',
          html: `${(totalDistance / 1000).toFixed(3)} km`,
          iconAnchor: [-10, 10]
        })} />
      )}
    </LayerGroup>
  );
};

/**
 * Simple drawing tool for site hindrances or new map overlays.
 * Allows users to draw a sequence of points that will be saved as a new MapOverlay.
 */
const MapDrawingTool: React.FC<{ 
  active: boolean; 
  onComplete: (coords: { lat: number, lng: number }[]) => void;
  onCancel: () => void;
}> = ({ active, onComplete, onCancel }) => {
  const map = useMap();
  const [points, setPoints] = useState<L.LatLng[]>([]);

  useEffect(() => {
    if (!active) {
      setPoints([]);
      return;
    }

    const onClick = (e: L.LeafletMouseEvent) => {
      setPoints(prev => [...prev, e.latlng]);
    };

    // Change cursor to indicate drawing mode
    map.getContainer().style.cursor = 'cell';
    map.on('click', onClick);
    
    return () => {
      map.getContainer().style.cursor = '';
      map.off('click', onClick);
    };
  }, [active, map]);

  if (!active) return null;

  return (
    <LayerGroup>
      {points.length > 1 && <Polyline positions={points} pathOptions={{ color: '#f97316', weight: 3 }} />}
      {points.map((p, i) => (
        <CircleMarker key={i} center={p} radius={5} pathOptions={{ color: '#f97316', fillOpacity: 1 }} />
      ))}
      {points.length > 0 && (
        <Popup position={points[points.length - 1]}>
          <div className="p-2 flex flex-col gap-2">
            <p className="text-xs font-bold uppercase text-slate-500">New Hindrance/Overlay</p>
            <div className="flex gap-2">
              <Button size="sm" variant="default" className="h-7 text-xs" onClick={() => onComplete(points.map(p => ({ lat: p.lat, lng: p.lng })))}>
                Save
              </Button>
              <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => { setPoints([]); onCancel(); }}>
                Cancel
              </Button>
            </div>
          </div>
        </Popup>
      )}
    </LayerGroup>
  );
};

// Layer visibility state
interface LayerVisibility {
  structures: boolean;
  vehicles: boolean;
  staff: boolean;
  landParcels: boolean;
  overlays: boolean;
  sitePhotos: boolean;
  linearWorks: boolean;
  kml: boolean;
}

const MapModule: React.FC<MapModuleProps> = ({ project, onProjectUpdate, settings }) => {
  const [isLoading, setIsLoading] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isRulerActive, setIsRulerActive] = useState(false);
  const [isDrawing, setIsDrawing] = useState(false);
  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const [layerVisibility, setLayerVisibility] = useState<LayerVisibility>({
    structures: true,
    vehicles: true,
    staff: true,
    landParcels: true,
    overlays: true,
    sitePhotos: true,
    linearWorks: true,
    kml: true,
  });

  // Default center (Butwal, Nepal) - will be overridden by settings or project location
  const defaultCenter: [number, number] = [27.7006, 83.4484];
  const defaultZoom = 13;

  // Handle KML File Upload
  const handleKMLUpload = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      const content = e.target?.result as string;
      if (content) {
        const newKML: KMLData = {
          id: `kml-${Date.now()}`,
          name: file.name,
          content: content,
          timestamp: Date.now(),
          visible: true
        };

        onProjectUpdate({
          kmlData: [...(project.kmlData || []), newKML]
        });
      }
    };
    reader.readAsText(file);
    
    // Reset input
    if (event.target) {
      event.target.value = '';
    }
  }, [project.kmlData, onProjectUpdate]);

  // Save new drawing to overlays
  const handleSaveDrawing = useCallback((coords: { lat: number, lng: number }[]) => {
    const newOverlay: MapOverlay = {
      id: `hindrance-${Date.now()}`,
      name: `Hindrance ${new Date().toLocaleDateString()}`,
      type: 'Hindrance',
      coordinates: coords,
      color: '#ef4444',
      visible: true
    };
    
    onProjectUpdate({
      mapOverlays: [...(project.mapOverlays || []), newOverlay]
    });
    setIsDrawing(false);
  }, [project.mapOverlays, onProjectUpdate]);

  // Parse location string to [lat, lng]
  const parseLocation = (locStr?: string): [number, number] | null => {
    if (!locStr) return null;
    const coords = locStr.match(/(-?\d+\.?\d*),\s*(-?\d+\.?\d*)/);
    if (coords) {
      const lat = parseFloat(coords[1]);
      const lng = parseFloat(coords[2]);
      if (!isNaN(lat) && !isNaN(lng)) {
        return [lat, lng];
      }
    }
    return null;
  };

  // Parse project location or default from settings
  const mapCenter = useMemo((): [number, number] => {
    // 1. Try project location
    const projectLoc = parseLocation(project.location);
    if (projectLoc) return projectLoc;

    // 2. Try default location from settings
    const settingsLoc = parseLocation(settings?.defaultLocation);
    if (settingsLoc) return settingsLoc;

    // 3. Fallback to Butwal
    return defaultCenter;
  }, [project.location, settings?.defaultLocation]);

  // Simulate loading
  useEffect(() => {
    const timer = setTimeout(() => setIsLoading(false), 1000);
    return () => clearTimeout(timer);
  }, []);

  // Toggle layer visibility
  const toggleLayer = useCallback((layer: keyof LayerVisibility) => {
    setLayerVisibility(prev => ({ ...prev, [layer]: !prev[layer] }));
  }, []);

  // Find the alignment overlay to use as a reference for chainage mapping
  const alignmentOverlay = useMemo(() => {
    if (!project.mapOverlays) return null;
    return project.mapOverlays.find(o => o.type === 'Alignment' && o.visible) || 
           project.mapOverlays.find(o => o.type === 'Alignment');
  }, [project.mapOverlays]);

  /**
   * Helper to map a chainage range (start and end km) to geographic coordinates
   * by interpolating points along the reference road alignment.
   * 
   * @param startCh The start chainage in kilometers
   * @param endCh The end chainage in kilometers
   * @returns Array of [lat, lng] coordinates representing the segment
   */
  const getCoordinatesForChainage = useCallback((startCh: number, endCh: number) => {
    if (!alignmentOverlay || alignmentOverlay.coordinates.length < 2) return [];

    const coords = alignmentOverlay.coordinates;
    const points: [number, number][] = [];
    let currentChainage = 0; // Cumulative distance in meters along the alignment

    for (let i = 0; i < coords.length - 1; i++) {
      const p1 = L.latLng(coords[i].lat, coords[i].lng);
      const p2 = L.latLng(coords[i+1].lat, coords[i+1].lng);
      const segmentLen = p1.distanceTo(p2); // Physical distance in meters between these two vertices
      const nextChainage = currentChainage + segmentLen;

      // Map module uses km for chainage (e.g. 12.400 is 12km 400m)
      const segStartCh = currentChainage / 1000;
      const segEndCh = nextChainage / 1000;

      // Check if the requested range overlaps with this specific segment of the alignment
      if (segEndCh >= startCh && segStartCh <= endCh) {
        // Calculate the overlap bounds within this segment
        const segmentStart = Math.max(segStartCh, startCh);
        const segmentEnd = Math.min(segEndCh, endCh);

        // Calculate fractions for linear interpolation
        const startFraction = (segmentStart - segStartCh) / (segEndCh - segStartCh);
        const endFraction = (segmentEnd - segStartCh) / (segEndCh - segStartCh);

        // Interpolate the start and end points of the requested range within this segment
        const startLat = coords[i].lat + (coords[i+1].lat - coords[i].lat) * startFraction;
        const startLng = coords[i].lng + (coords[i+1].lng - coords[i].lng) * startFraction;
        const endLat = coords[i].lat + (coords[i+1].lat - coords[i].lat) * endFraction;
        const endLng = coords[i].lng + (coords[i+1].lng - coords[i].lng) * endFraction;

        if (points.length === 0) {
          points.push([startLat, startLng]);
        }
        
        // Add all intermediate vertices if the range spans multiple vertices
        // In this simplified version, we just add the end of each segment interpolation
        points.push([endLat, endLng]);
      }

      currentChainage = nextChainage;
    }

    return points;
  }, [alignmentOverlay]);

  // Custom icons for different markers
  const createCustomIcon = (color: string, icon: string) => {
    return L.divIcon({
      className: 'custom-marker',
      html: `<div style="
        background-color: ${color};
        width: 32px;
        height: 32px;
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        border: 3px solid white;
        box-shadow: 0 2px 6px rgba(0,0,0,0.3);
        font-size: 16px;
      ">${icon}</div>`,
      iconSize: [32, 32],
      iconAnchor: [16, 32],
      popupAnchor: [0, -32],
    });
  };

  // Structure markers
  const structureMarkers = useMemo(() => {
    if (!project.structures || !layerVisibility.structures) return [];
    return project.structures.map((structure: StructureAsset) => {
      if (!structure.coordinates) return null;
      const [lat, lng] = structure.coordinates.split(',').map(Number);
      if (isNaN(lat) || isNaN(lng)) return null;
      
      return (
        <Marker
          key={`structure-${structure.id}`}
          position={[lat, lng]}
          icon={createCustomIcon('#3b82f6', '🏗️')}
        >
          <Popup>
            <div className="p-2 min-w-[200px]">
              <h3 className="font-bold text-lg border-b pb-1 mb-2">{structure.name}</h3>
              <div className="space-y-1">
                <p className="text-sm flex justify-between">
                  <span className="text-gray-500">Type:</span>
                  <span className="font-medium">{structure.type}</span>
                </p>
                <p className="text-sm flex justify-between">
                  <span className="text-gray-500">Chainage:</span>
                  <span className="font-medium">{structure.chainage}</span>
                </p>
                <p className="text-sm flex justify-between">
                  <span className="text-gray-500">Status:</span>
                  <Badge variant={structure.status === 'Completed' ? 'default' : 'outline'}>
                    {structure.status}
                  </Badge>
                </p>
              </div>
            </div>
          </Popup>
        </Marker>
      );
    }).filter(Boolean);
  }, [project.structures, layerVisibility.structures]);

  // Vehicle markers
  const vehicleMarkers = useMemo(() => {
    if (!project.vehicles || !layerVisibility.vehicles) return [];
    return project.vehicles.map((vehicle: Vehicle) => {
      const location = vehicle.gpsLocation || vehicle.lastKnownLocation;
      if (!location) return null;
      
      return (
        <Marker
          key={`vehicle-${vehicle.id}`}
          position={[location.latitude, location.longitude]}
          icon={createCustomIcon('#10b981', '🚛')}
        >
          <Popup>
            <div className="p-2 min-w-[200px]">
              <h3 className="font-bold text-lg border-b pb-1 mb-2">{vehicle.name || vehicle.plateNumber}</h3>
              <div className="space-y-1">
                <p className="text-sm flex justify-between">
                  <span className="text-gray-500">Type:</span>
                  <span className="font-medium">{vehicle.type}</span>
                </p>
                <p className="text-sm flex justify-between">
                  <span className="text-gray-500">Driver:</span>
                  <span className="font-medium">{vehicle.driver}</span>
                </p>
                <p className="text-sm flex justify-between">
                  <span className="text-gray-500">Status:</span>
                  <Badge className={cn(
                    vehicle.status === 'Active' ? 'bg-green-500' : 
                    vehicle.status === 'Maintenance' ? 'bg-orange-500' : 'bg-gray-500'
                  )}>
                    {vehicle.status}
                  </Badge>
                </p>
                {vehicle.gpsLocation?.speed !== undefined && (
                  <p className="text-sm flex justify-between">
                    <span className="text-gray-500">Speed:</span>
                    <span className="font-medium">{vehicle.gpsLocation.speed} km/h</span>
                  </p>
                )}
              </div>
            </div>
          </Popup>
        </Marker>
      );
    }).filter(Boolean);
  }, [project.vehicles, layerVisibility.vehicles]);

  // Staff markers
  const staffMarkers = useMemo(() => {
    if (!project.staffLocations || !layerVisibility.staff) return [];
    return project.staffLocations.map((staff: StaffLocation) => {
      return (
        <Marker
          key={`staff-${staff.id}`}
          position={[staff.latitude, staff.longitude]}
          icon={createCustomIcon('#f59e0b', '👷')}
        >
          <Popup>
            <div className="p-2 min-w-[150px]">
              <h3 className="font-bold text-lg border-b pb-1 mb-2">{staff.userName}</h3>
              <p className="text-sm text-gray-600">{staff.role}</p>
              <Badge variant={staff.status === 'Active' ? 'default' : 'secondary'} className="mt-2">
                {staff.status}
              </Badge>
              <p className="text-[10px] text-gray-400 mt-2">
                Updated: {new Date(staff.timestamp).toLocaleTimeString()}
              </p>
            </div>
          </Popup>
        </Marker>
      );
    });
  }, [project.staffLocations, layerVisibility.staff]);

  // Land Parcel polygons
  const landParcelPolygons = useMemo(() => {
    if (!project.landParcels || !layerVisibility.landParcels) return [];
    return project.landParcels.map((parcel: LandParcel) => {
      if (!parcel.coordinates || parcel.coordinates.length < 3) return null;
      
      return (
        <Polygon
          key={`parcel-${parcel.id}`}
          positions={parcel.coordinates.map(c => [c.lat, c.lng])}
          pathOptions={{
            color: '#8b5cf6',
            fillColor: '#8b5cf6',
            fillOpacity: 0.2,
            weight: 2
          }}
        >
          <Popup>
            <div className="p-2 min-w-[180px]">
              <h3 className="font-bold text-lg border-b pb-1 mb-2">Parcel {parcel.parcelNumber}</h3>
              <p className="text-sm"><span className="text-gray-500">Owner:</span> {parcel.ownerName}</p>
              <p className="text-sm"><span className="text-gray-500">Area:</span> {parcel.area} {parcel.unit}</p>
              <Badge className="mt-2">{parcel.acquisitionStatus}</Badge>
            </div>
          </Popup>
        </Polygon>
      );
    }).filter(Boolean);
  }, [project.landParcels, layerVisibility.landParcels]);

  // Map Overlays (Alignment, Boundaries, etc.)
  const mapOverlayLayers = useMemo(() => {
    if (!project.mapOverlays || !layerVisibility.overlays) return [];
    return project.mapOverlays.map((overlay: MapOverlay) => {
      if (!overlay.visible) return null;
      
      return (
        <Polyline
          key={`overlay-${overlay.id}`}
          positions={overlay.coordinates.map(c => [c.lat, c.lng])}
          pathOptions={{
            color: overlay.color,
            weight: 4,
            opacity: 0.8
          }}
        >
          <Popup>
            <div className="p-1 font-bold">{overlay.name} ({overlay.type})</div>
          </Popup>
        </Polyline>
      );
    }).filter(Boolean);
  }, [project.mapOverlays, layerVisibility.overlays]);

  // Site Photo markers
  const sitePhotoMarkers = useMemo(() => {
    if (!project.sitePhotos || !layerVisibility.sitePhotos) return [];
    return project.sitePhotos.map((photo: SitePhoto) => {
      if (!photo.location) return null;
      const coords = photo.location.match(/(-?\d+\.?\d*),\s*(-?\d+\.?\d*)/);
      if (!coords) return null;
      const lat = parseFloat(coords[1]);
      const lng = parseFloat(coords[2]);
      
      return (
        <Marker
          key={`photo-${photo.id}`}
          position={[lat, lng]}
          icon={createCustomIcon('#ec4899', '📸')}
        >
          <Popup maxWidth={300}>
            <div className="p-1">
              <img 
                src={photo.url} 
                alt={photo.caption} 
                className="w-full h-32 object-cover rounded-md mb-2 shadow-sm" 
              />
              <h3 className="font-bold text-sm leading-tight mb-1">{photo.caption}</h3>
              <div className="flex justify-between items-center text-[10px] text-gray-400 font-bold uppercase tracking-wider">
                <span>{photo.category}</span>
                <span>{new Date(photo.date).toLocaleDateString()}</span>
              </div>
            </div>
          </Popup>
        </Marker>
      );
    }).filter(Boolean);
  }, [project.sitePhotos, layerVisibility.sitePhotos]);

  // Linear Works Layer
  const linearWorksLayers = useMemo(() => {
    if (!project.linearWorks || !layerVisibility.linearWorks || !alignmentOverlay) return [];
    
    return project.linearWorks.map((work: LinearWorkLog) => {
      const positions = getCoordinatesForChainage(work.startChainage, work.endChainage);
      if (positions.length < 2) return null;

      const color = work.status === 'Completed' ? '#10b981' : '#f59e0b';
      
      return (
        <Polyline
          key={`linear-${work.id}`}
          positions={positions}
          pathOptions={{
            color: color,
            weight: 8,
            opacity: 0.6,
            dashArray: work.side === 'Both' ? undefined : '10, 15'
          }}
        >
          <Popup>
            <div className="p-2 min-w-[150px]">
              <h3 className="font-bold text-lg border-b pb-1 mb-2">{work.layer}</h3>
              <p className="text-sm"><span className="text-gray-500 font-medium">Category:</span> {work.category}</p>
              <p className="text-sm"><span className="text-gray-500 font-medium">Chainage:</span> {work.startChainage.toFixed(3)} - {work.endChainage.toFixed(3)}</p>
              <p className="text-sm"><span className="text-gray-500 font-medium">Side:</span> {work.side}</p>
              <Badge className="mt-2" variant={work.status === 'Completed' ? 'default' : 'outline'}>
                {work.status}
              </Badge>
            </div>
          </Popup>
        </Polyline>
      );
    }).filter(Boolean);
  }, [project.linearWorks, layerVisibility.linearWorks, alignmentOverlay, getCoordinatesForChainage]);

  // Export to GeoJSON
  const exportGeoJSON = useCallback(() => {
    const featureCollection = {
      type: 'FeatureCollection',
      features: [
        ...(project.structures || []).map(s => {
          if (!s.coordinates) return null;
          const [lat, lng] = s.coordinates.split(',').map(Number);
          return {
            type: 'Feature',
            geometry: { type: 'Point', coordinates: [lng, lat] },
            properties: { name: s.name, type: s.type, chainage: s.chainage, status: s.status }
          };
        }),
        ...(project.mapOverlays || []).map(o => ({
          type: 'Feature',
          geometry: { 
            type: 'LineString', 
            coordinates: o.coordinates.map(c => [c.lng, c.lat]) 
          },
          properties: { name: o.name, type: o.type, color: o.color }
        }))
      ].filter(Boolean)
    };

    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(featureCollection));
    const downloadAnchorNode = document.createElement('a');
    downloadAnchorNode.setAttribute("href", dataStr);
    downloadAnchorNode.setAttribute("download", `${project.name.replace(/\s+/g, '_')}_gis_data.json`);
    document.body.appendChild(downloadAnchorNode);
    downloadAnchorNode.click();
    downloadAnchorNode.remove();
  }, [project]);

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center h-full bg-slate-50/50 rounded-xl border-2 border-dashed border-slate-200">
        <Loader2 className="h-10 w-10 animate-spin text-primary mb-4" />
        <p className="text-slate-500 font-medium">Initializing GIS Alignment Module...</p>
      </div>
    );
  }

  return (
    <div className={cn(
      "flex flex-col h-full bg-background transition-all duration-300",
      isFullscreen && "fixed inset-0 z-50 p-4"
    )}>
      <div className="flex items-center justify-between mb-4 shrink-0">
        <div>
          <h2 className="text-2xl font-black tracking-tight flex items-center gap-2">
            <MapPin className="text-primary" /> GIS ALIGNMENT CENTER
          </h2>
          <p className="text-muted-foreground text-sm font-medium uppercase tracking-wider">
            Spatial Intelligence & Progress Monitoring
          </p>
        </div>
        <div className="flex gap-2">
          <input
            type="file"
            accept=".kml"
            className="hidden"
            ref={fileInputRef}
            onChange={handleKMLUpload}
          />
          <Button variant="outline" size="sm" className="font-bold border-2" onClick={() => fileInputRef.current?.click()}>
            <Upload className="mr-2 h-4 w-4" /> Upload KML
          </Button>
          <Button variant="outline" size="sm" className="font-bold border-2" onClick={exportGeoJSON}>
            <Download className="mr-2 h-4 w-4" /> Export GeoJSON
          </Button>
          <Button 
            variant="outline" 
            size="sm" 
            className="font-bold border-2"
            onClick={() => setIsFullscreen(!isFullscreen)}
          >
            {isFullscreen ? <Minimize className="mr-2 h-4 w-4" /> : <Maximize className="mr-2 h-4 w-4" />}
            {isFullscreen ? 'Exit Fullscreen' : 'Fullscreen'}
          </Button>
        </div>
      </div>

      <div className="flex flex-1 gap-4 overflow-hidden">
        {/* Map Container */}
        <div className="flex-1 relative rounded-2xl overflow-hidden border-2 border-slate-200 shadow-inner bg-slate-100">
          <MapContainer
            center={mapCenter}
            zoom={defaultZoom}
            style={{ height: '100%', width: '100%' }}
            zoomControl={false}
            preferCanvas={true}
          >
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            <MapCenterUpdater center={mapCenter} zoom={defaultZoom} />
            <SearchField />
            
            {layerVisibility.structures && structureMarkers}
            {layerVisibility.vehicles && vehicleMarkers}
            {layerVisibility.staff && staffMarkers}
            {layerVisibility.landParcels && landParcelPolygons}
            {layerVisibility.overlays && mapOverlayLayers}
            {layerVisibility.sitePhotos && sitePhotoMarkers}
            {layerVisibility.linearWorks && linearWorksLayers}
            {layerVisibility.kml && project.kmlData && <KMLDataLayer kmlData={project.kmlData} />}

            <MapRuler active={isRulerActive} onClose={() => setIsRulerActive(false)} />
            <MapDrawingTool 
              active={isDrawing} 
              onComplete={handleSaveDrawing} 
              onCancel={() => setIsDrawing(false)} 
            />

            {/* Scale control and other leaflet defaults can be added here */}
          </MapContainer>
          
          {(isRulerActive || isDrawing) && (
            <div className="absolute top-4 left-1/2 -translate-x-1/2 z-[1000] bg-white border-2 border-slate-200 rounded-xl px-4 py-2 shadow-xl animate-bounce">
              <p className="text-xs font-black uppercase text-slate-800 flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-red-500 animate-pulse" />
                {isRulerActive ? 'Ruler Mode Active - Click Map to Measure' : 'Drawing Mode Active - Click to Draw Hindrance'}
              </p>
            </div>
          )}
          
          {/* Custom Map Controls */}
          <div className="absolute top-4 right-4 z-[1000] flex flex-col gap-2">
            <Button variant="secondary" size="icon" className="shadow-lg rounded-xl">
              <Search size={20} />
            </Button>
            <Button 
              variant={isRulerActive ? "default" : "secondary"} 
              size="icon" 
              className={cn("shadow-lg rounded-xl transition-all", isRulerActive && "bg-red-500 hover:bg-red-600")}
              onClick={() => { setIsRulerActive(!isRulerActive); setIsDrawing(false); }}
            >
              <Ruler size={20} />
            </Button>
            <Button 
              variant={isDrawing ? "default" : "secondary"} 
              size="icon" 
              className={cn("shadow-lg rounded-xl transition-all", isDrawing && "bg-orange-500 hover:bg-orange-600")}
              onClick={() => { setIsDrawing(!isDrawing); setIsRulerActive(false); }}
            >
              <Layers size={20} />
            </Button>
          </div>
        </div>

        {/* Sidebar Controls */}
        <Card className="w-80 shrink-0 border-2 shadow-sm flex flex-col">
          <CardHeader className="p-4 border-b">
            <CardTitle className="text-sm font-black flex items-center gap-2">
              <Layers size={16} /> LAYER CONTROLS
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0 flex-1 overflow-hidden">
            <ScrollArea className="h-full">
              <div className="p-4 space-y-6">
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="p-2 bg-blue-100 text-blue-600 rounded-lg">
                        <Building size={16} />
                      </div>
                      <div>
                        <Label className="font-bold text-sm">Structures</Label>
                        <p className="text-[10px] text-muted-foreground uppercase">Culverts & Walls</p>
                      </div>
                    </div>
                    <Switch 
                      checked={layerVisibility.structures} 
                      onCheckedChange={() => toggleLayer('structures')} 
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="p-2 bg-green-100 text-green-600 rounded-lg">
                        <Truck size={16} />
                      </div>
                      <div>
                        <Label className="font-bold text-sm">Fleet Tracking</Label>
                        <p className="text-[10px] text-muted-foreground uppercase">Live Vehicle GPS</p>
                      </div>
                    </div>
                    <Switch 
                      checked={layerVisibility.vehicles} 
                      onCheckedChange={() => toggleLayer('vehicles')} 
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="p-2 bg-amber-100 text-amber-600 rounded-lg">
                        <Users size={16} />
                      </div>
                      <div>
                        <Label className="font-bold text-sm">Site Personnel</Label>
                        <p className="text-[10px] text-muted-foreground uppercase">Staff Locations</p>
                      </div>
                    </div>
                    <Switch 
                      checked={layerVisibility.staff} 
                      onCheckedChange={() => toggleLayer('staff')} 
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="p-2 bg-purple-100 text-purple-600 rounded-lg">
                        <MapPin size={16} />
                      </div>
                      <div>
                        <Label className="font-bold text-sm">Land Parcels</Label>
                        <p className="text-[10px] text-muted-foreground uppercase">Property Boundaries</p>
                      </div>
                    </div>
                    <Switch 
                      checked={layerVisibility.landParcels} 
                      onCheckedChange={() => toggleLayer('landParcels')} 
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="p-2 bg-pink-100 text-pink-600 rounded-lg">
                        <Camera size={16} />
                      </div>
                      <div>
                        <Label className="font-bold text-sm">Site Photos</Label>
                        <p className="text-[10px] text-muted-foreground uppercase">Geotagged Media</p>
                      </div>
                    </div>
                    <Switch 
                      checked={layerVisibility.sitePhotos} 
                      onCheckedChange={() => toggleLayer('sitePhotos')} 
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="p-2 bg-slate-100 text-slate-600 rounded-lg">
                        <Route size={16} />
                      </div>
                      <div>
                        <Label className="font-bold text-sm">Alignments</Label>
                        <p className="text-[10px] text-muted-foreground uppercase">Road Design Layers</p>
                      </div>
                    </div>
                    <Switch 
                      checked={layerVisibility.overlays} 
                      onCheckedChange={() => toggleLayer('overlays')} 
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="p-2 bg-cyan-100 text-cyan-600 rounded-lg">
                        <Route size={16} />
                      </div>
                      <div>
                        <Label className="font-bold text-sm">Linear Works</Label>
                        <p className="text-[10px] text-muted-foreground uppercase">Progress by Chainage</p>
                      </div>
                    </div>
                    <Switch 
                      checked={layerVisibility.linearWorks} 
                      onCheckedChange={() => toggleLayer('linearWorks')} 
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="p-2 bg-indigo-100 text-indigo-600 rounded-lg">
                        <Layers size={16} />
                      </div>
                      <div>
                        <Label className="font-bold text-sm">KML Layers</Label>
                        <p className="text-[10px] text-muted-foreground uppercase">External Spatial Data</p>
                      </div>
                    </div>
                    <Switch 
                      checked={layerVisibility.kml} 
                      onCheckedChange={() => toggleLayer('kml')} 
                    />
                  </div>
                </div>

                <Separator />

                <div className="space-y-4">
                  <h4 className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Map Statistics</h4>
                  <div className="grid grid-cols-2 gap-2">
                    <div className="bg-slate-50 p-2 rounded-lg border">
                      <p className="text-[10px] text-slate-500 font-bold uppercase">Structures</p>
                      <p className="text-xl font-black">{project.structures?.length || 0}</p>
                    </div>
                    <div className="bg-slate-50 p-2 rounded-lg border">
                      <p className="text-[10px] text-slate-500 font-bold uppercase">Vehicles</p>
                      <p className="text-xl font-black">{project.vehicles?.length || 0}</p>
                    </div>
                    <div className="bg-slate-50 p-2 rounded-lg border">
                      <p className="text-[10px] text-slate-500 font-bold uppercase">Photos</p>
                      <p className="text-xl font-black">{project.sitePhotos?.length || 0}</p>
                    </div>
                    <div className="bg-slate-50 p-2 rounded-lg border">
                      <p className="text-[10px] text-slate-500 font-bold uppercase">Staff</p>
                      <p className="text-xl font-black">{project.staffLocations?.length || 0}</p>
                    </div>
                  </div>
                </div>
              </div>
            </ScrollArea>
          </CardContent>
          <div className="p-4 border-t bg-slate-50">
            <Button className="w-full font-bold h-11 shadow-md shadow-primary/10">
              <Settings className="mr-2 h-4 w-4" /> Map Settings
            </Button>
          </div>
        </Card>
      </div>
    </div>
  );
};

export default MapModule;
