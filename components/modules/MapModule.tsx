import React, { useState, useEffect, useMemo, useCallback, startTransition } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polygon, Polyline, useMap, LayerGroup, CircleMarker } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { Project, StructureAsset, Vehicle, StaffLocation, LandParcel, MapOverlay, SitePhoto, LinearWorkLog, KMLData, AppSettings } from '../../types';
import { Button } from '~/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '~/components/ui/card';
import { Badge } from '~/components/ui/badge';
import { Switch } from '~/components/ui/switch';
import { Label } from '~/components/ui/label';
import { ScrollArea } from '~/components/ui/scroll-area';
import { Separator } from '~/components/ui/separator';
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
  Eye,
  EyeOff,
  Loader2,
  Maximize,
  Minimize,
  ChevronLeft,
  ChevronRight,
  BarChart3,
  Trash2
} from 'lucide-react';
import { cn } from '~/lib/utils';
import { toast } from 'sonner';

import * as omnivore from '@mapbox/leaflet-omnivore';
import { GeoSearchControl, OpenStreetMapProvider } from 'leaflet-geosearch';
import 'leaflet-geosearch/dist/geosearch.css';

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "~/components/ui/dialog";

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
 * Now includes 500m interval chainage markers with KML filename prefixing.
 */
const KMLDataLayer: React.FC<{ kml: KMLData }> = ({ kml }) => {
  const map = useMap();

  useEffect(() => {
    if (!kml.visible || !kml.content) return;

    let kmlLayer: L.Layer | null = null;
    const markers: L.Layer[] = [];
    const fallbackLayers: L.Layer[] = [];

    try {
      // 1. Try leaflet-omnivore first
      const omnivoreLib = (omnivore as any).default || omnivore;
      let hasFeatures = false;

      if (omnivoreLib && omnivoreLib.kml) {
        try {
          // Use parseStr for raw XML string content
          if (omnivoreLib.kml.parseStr) {
            kmlLayer = omnivoreLib.kml.parseStr(kml.content);
          } else {
            // Fallback to parse if parseStr is missing
            kmlLayer = omnivoreLib.kml.parse(kml.content);
          }
          
          if (kmlLayer) {
            kmlLayer.addTo(map);
            console.log(`KML Layer "${kml.name}" added successfully via omnivore.`);

            kmlLayer.eachLayer((layer: any) => {
              hasFeatures = true;
              
              // Apply styling
              if (layer.setStyle) {
                layer.setStyle({ color: '#4f46e5', weight: 4, opacity: 0.8 });
              }

              // Extract coordinates for chainage markers if it's a line
              if (layer instanceof L.Polyline && !(layer instanceof L.Polygon)) {
                const coords = layer.getLatLngs() as L.LatLng[];
                const flatCoords = Array.isArray(coords[0]) ? (coords as any).flat(Infinity) as L.LatLng[] : coords;
                
                if (flatCoords.length >= 2) {
                  // Add start marker
                  markers.push(L.marker(flatCoords[0], { 
                    icon: L.divIcon({
                      className: 'bg-black/80 text-white text-[9px] font-bold px-1.5 py-0.5 rounded border border-white whitespace-nowrap shadow-md',
                      html: `${kml.name.split('.')[0]}: 0+000`,
                      iconAnchor: [0, 0]
                    }) 
                  }).addTo(map));

                  // Add intermediate markers
                  let totalDist = 0;
                  let lastMarkerDist = 0;
                  const interval = 500; 

                  for (let i = 0; i < flatCoords.length - 1; i++) {
                    const p1 = flatCoords[i];
                    const p2 = flatCoords[i + 1];
                    if (!p1 || !p2) continue;
                    const segmentDist = p1.distanceTo(p2);
                    totalDist += segmentDist;

                    while (totalDist >= lastMarkerDist + interval) {
                      const markerDist = lastMarkerDist + interval;
                      const fraction = (markerDist - (totalDist - segmentDist)) / segmentDist;
                      const lat = p1.lat + (p2.lat - p1.lat) * fraction;
                      const lng = p1.lng + (p2.lng - p1.lng) * fraction;
                      
                      const chainageKm = Math.floor(markerDist / 1000);
                      const chainageM = Math.round(markerDist % 1000);
                      
                      markers.push(L.marker([lat, lng], { 
                        icon: L.divIcon({
                          className: 'bg-white/90 text-black text-[9px] font-bold px-1.5 py-0.5 rounded border border-black/20 shadow-sm whitespace-nowrap',
                          html: `${kml.name.split('.')[0]}: ${chainageKm}+${chainageM.toString().padStart(3, '0')}`,
                          iconAnchor: [0, 0]
                        }) 
                      }).addTo(map));
                      lastMarkerDist = markerDist;
                    }
                  }
                }
              }
            });
          }
        } catch (e) {
          console.warn("Omnivore failed", e);
        }
      }

      // 2. Manual Fallback: Search for all coordinates tags
      if (!hasFeatures) {
        const parser = new DOMParser();
        const xml = parser.parseFromString(kml.content, "text/xml");
        const coordTags = xml.getElementsByTagName("coordinates");
        
        for (let i = 0; i < coordTags.length; i++) {
          const coordStr = coordTags[i].textContent || "";
          const points: L.LatLng[] = [];
          
          // Split by whitespace
          const pairs = coordStr.trim().split(/\s+/);
          pairs.forEach((pair) => {
            const parts = pair.split(",");
            if (parts.length >= 2) {
              const lng = parseFloat(parts[0]);
              const lat = parseFloat(parts[1]);
              if (!isNaN(lat) && !isNaN(lng)) {
                points.push(L.latLng(lat, lng));
              }
            }
          });

          if (points.length >= 2) {
            const line = L.polyline(points, { color: '#4f46e5', weight: 4, opacity: 0.8 }).addTo(map);
            fallbackLayers.push(line);
            
            // Add start marker for fallback
            markers.push(L.marker(points[0], { 
              icon: L.divIcon({
                className: 'bg-black/80 text-white text-[9px] font-bold px-1.5 py-0.5 rounded border border-white whitespace-nowrap shadow-md',
                html: `${kml.name.split('.')[0]}: 0+000`,
                iconAnchor: [0, 0]
              }) 
            }).addTo(map));
          } else if (points.length === 1) {
            // It's a point feature
            markers.push(L.marker(points[0]).addTo(map));
          }
        }
      }

    } catch (error) {
      console.error("KML Layer Error:", error);
    }

    return () => {
      if (kmlLayer) map.removeLayer(kmlLayer);
      markers.forEach(m => map.removeLayer(m));
      fallbackLayers.forEach(l => map.removeLayer(l));
    };
  }, [kml, map]);

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

// Helper Component for Linear Monitoring Info
const LinearReferenceView: React.FC<{ info: { lineName: string, chainage: string, offset: number } | null }> = ({ info }) => {
  if (!info) return null;
  return (
    <div className="mt-2 pt-2 border-t border-indigo-100">
      <p className="text-[9px] font-black text-indigo-600 uppercase tracking-widest mb-1 flex items-center gap-1">
        <Route size={10} /> Linear Monitoring (GIS)
      </p>
      <div className="bg-indigo-50/50 rounded p-1.5 border border-indigo-100/50">
        <p className="text-[10px] flex justify-between">
          <span className="text-indigo-400 font-bold">ALIGN:</span>
          <span className="font-black text-indigo-900 truncate max-w-[100px]">{info.lineName}</span>
        </p>
        <p className="text-[10px] flex justify-between">
          <span className="text-indigo-400 font-bold">CHAIN:</span>
          <span className="font-black text-indigo-900">{info.chainage}</span>
        </p>
        <p className="text-[10px] flex justify-between">
          <span className="text-indigo-400 font-bold">OFFSET:</span>
          <span className="font-black text-indigo-900">{info.offset}m</span>
        </p>
      </div>
    </div>
  );
};

const MapModule: React.FC<MapModuleProps> = ({ project, onProjectUpdate, settings }) => {
  const [isLoading, setIsLoading] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isRulerActive, setIsRulerActive] = useState(false);
  const [isDrawing, setIsDrawing] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [targetBounds, setTargetBounds] = useState<L.LatLngBounds | null>(null);
  const fileInputRef = React.useRef<HTMLInputElement>(null);
  
  // States for non-blocking delete confirmation
  const [isDeletingKML, setIsDeletingKML] = useState(false);
  const [kmlToDelete, setKmlToDelete] = useState<string | null>(null);
  const [isPendingDelete, startDeleteTransition] = React.useTransition();

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

  const confirmDeleteKML = useCallback(() => {
    if (!kmlToDelete) return;
    
    startDeleteTransition(() => {
      const updatedKMLs = (project.kmlData || []).filter(item => item.id !== kmlToDelete);
      onProjectUpdate({ kmlData: updatedKMLs });
      setIsDeletingKML(false);
      setKmlToDelete(null);
    });
  }, [project.kmlData, onProjectUpdate, kmlToDelete]);

  const handleDeleteKML = useCallback((id: string) => {
    setKmlToDelete(id);
    setIsDeletingKML(true);
  }, []);

  // Default center (Butwal, Nepal) - will be overridden by settings or project location
  const defaultCenter: [number, number] = [27.7006, 83.4484];
  const defaultZoom = 13;

  // Function to zoom to specific KML alignment
  const zoomToKML = useCallback((kmlContent: string) => {
    try {
      const parser = new DOMParser();
      const xml = parser.parseFromString(kmlContent, "text/xml");
      const coordinates = xml.getElementsByTagName("coordinates");
      const allPoints: L.LatLng[] = [];

      for (let i = 0; i < coordinates.length; i++) {
        const coordStr = coordinates[i].textContent || "";
        coordStr.trim().split(/\s+/).forEach((p) => {
          const [lng, lat] = p.split(",").map(Number);
          if (!isNaN(lat) && !isNaN(lng)) {
            allPoints.push(L.latLng(lat, lng));
          }
        });
      }

      if (allPoints.length > 0) {
        const bounds = L.latLngBounds(allPoints);
        startTransition(() => {
          setTargetBounds(bounds);
        });
        // Clear target bounds after a short delay so it can be re-triggered
        setTimeout(() => {
          startTransition(() => {
            setTargetBounds(null);
          });
        }, 1000);
      }
    } catch (error) {
      console.error("Failed to calculate KML bounds:", error);
    }
  }, []);

  // Map Component to handle programmatic zooming
  const MapController: React.FC<{ bounds: L.LatLngBounds | null }> = ({ bounds }) => {
    const map = useMap();
    useEffect(() => {
      if (bounds) {
        map.fitBounds(bounds, { padding: [50, 50], maxZoom: 16 });
      }
    }, [bounds, map]);
    return null;
  };

  // Handle KML File Upload
  const handleKMLUpload = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.name.toLowerCase().endsWith('.kml')) {
      toast.error("Invalid File", { description: "Please upload a .kml file." });
      return;
    }

    const uploadToast = toast.loading(`Uploading ${file.name}...`);

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
        
        // Auto-zoom to the newly uploaded KML
        setTimeout(() => zoomToKML(content), 500);
        
        toast.dismiss(uploadToast);
        toast.success("KML Uploaded", { description: `${file.name} is now available on the map.` });
      }
    };
    reader.onerror = () => {
      toast.dismiss(uploadToast);
      toast.error("Upload Failed", { description: "Could not read the KML file." });
    };
    reader.readAsText(file);
    
    // Reset input
    if (event.target) {
      event.target.value = '';
    }
  }, [project.kmlData, onProjectUpdate, zoomToKML]);

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
    
    startTransition(() => {
      onProjectUpdate({
        mapOverlays: [...(project.mapOverlays || []), newOverlay]
      });
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
    startTransition(() => {
      setLayerVisibility(prev => ({ ...prev, [layer]: !prev[layer] }));
    });
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

  // Extract active KML lines for linear referencing monitoring
  const activeKMLLines = useMemo(() => {
    if (!layerVisibility.kml || !project.kmlData) return [];
    
    const lines: { name: string, coords: L.LatLng[] }[] = [];
    const parser = new DOMParser();

    project.kmlData.forEach(kml => {
      if (!kml.visible || !kml.content) return;
      
      const xml = parser.parseFromString(kml.content, 'text/xml');
      const coordinates = xml.getElementsByTagName('coordinates');
      
      for (let i = 0; i < coordinates.length; i++) {
        const coordStr = coordinates[i].textContent || '';
        const points = coordStr.trim().split(/\s+/).map(p => {
          const [lng, lat] = p.split(',').map(Number);
          return L.latLng(lat, lng);
        }).filter(p => !isNaN(p.lat) && !isNaN(p.lng));
        
        if (points.length >= 2) {
          lines.push({ name: kml.name.split('.')[0], coords: points });
        }
      }
    });
    
    return lines;
  }, [project.kmlData, layerVisibility.kml]);

  // Helper to find nearest chainage on any active KML line
  const getNearestChainage = useCallback((point: L.LatLng) => {
    let nearestInfo = null;
    let minDistance = Infinity;

    activeKMLLines.forEach(line => {
      let cumulativeDist = 0;
      for (let i = 0; i < line.coords.length - 1; i++) {
        const p1 = line.coords[i];
        const p2 = line.coords[i+1];
        
        // Find nearest point on this segment
        // Simple approximation: check distance to p1
        const d = point.distanceTo(p1);
        if (d < minDistance && d < 100) { // Only if within 100m
          minDistance = d;
          const chainageKm = Math.floor(cumulativeDist / 1000);
          const chainageM = Math.round(cumulativeDist % 1000);
          nearestInfo = {
            lineName: line.name,
            chainage: `${chainageKm}+${chainageM.toString().padStart(3, '0')}`,
            offset: Math.round(d)
          };
        }
        cumulativeDist += p1.distanceTo(p2);
      }
    });

    return nearestInfo;
  }, [activeKMLLines]);

  // Structure markers
  const structureMarkers = useMemo(() => {
    if (!project.structures || !layerVisibility.structures) return [];
    return project.structures.map((structure: StructureAsset) => {
      if (!structure.coordinates) return null;
      const [lat, lng] = structure.coordinates.split(',').map(Number);
      if (isNaN(lat) || isNaN(lng)) return null;
      
      const nearestKML = getNearestChainage(L.latLng(lat, lng));
      
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
              <LinearReferenceView info={nearestKML} />
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
      
      const nearestKML = getNearestChainage(L.latLng(location.latitude, location.longitude));

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
                  <span className="text-gray-500">Asset Type:</span>
                  <span className="font-medium">{vehicle.type}</span>
                </p>
                <p className="text-sm flex justify-between">
                  <span className="text-gray-500">Operator/Driver:</span>
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
              <LinearReferenceView info={nearestKML} />
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
      const nearestKML = getNearestChainage(L.latLng(staff.latitude, staff.longitude));
      
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
              <LinearReferenceView info={nearestKML} />
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
      
      const nearestKML = getNearestChainage(L.latLng(lat, lng));

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
              <LinearReferenceView info={nearestKML} />
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
      {/* Delete Confirmation Dialog */}
      <Dialog open={isDeletingKML} onOpenChange={setIsDeletingKML}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Remove KML Alignment?</DialogTitle>
            <DialogDescription>
              This will permanently delete the alignment data for this project and free up local storage space. This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDeletingKML(false)} disabled={isPendingDelete}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={confirmDeleteKML} disabled={isPendingDelete}>
              {isPendingDelete ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Trash2 className="mr-2 h-4 w-4" />}
              Confirm Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

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

      <div className="flex flex-1 gap-4 overflow-hidden relative">
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
            <MapController bounds={targetBounds} />
            <SearchField />
            
            {layerVisibility.structures && structureMarkers}
            {layerVisibility.vehicles && vehicleMarkers}
            {layerVisibility.staff && staffMarkers}
            {layerVisibility.landParcels && landParcelPolygons}
            {layerVisibility.overlays && mapOverlayLayers}
            {layerVisibility.sitePhotos && sitePhotoMarkers}
            {layerVisibility.linearWorks && linearWorksLayers}
            
            {layerVisibility.kml && project.kmlData && project.kmlData.map(kml => (
              <KMLDataLayer key={kml.id} kml={kml} />
            ))}

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
            <Button 
              variant="secondary" 
              size="icon" 
              className="shadow-lg rounded-xl"
              onClick={() => startTransition(() => setSidebarOpen(!sidebarOpen))}
              title={sidebarOpen ? "Hide Controls" : "Show Controls"}
            >
              {sidebarOpen ? <ChevronRight size={20} /> : <ChevronLeft size={20} />}
            </Button>
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
        <Card className={cn(
          "w-80 shrink-0 border-2 shadow-sm flex flex-col transition-all duration-300 transform",
          !sidebarOpen && "w-0 opacity-0 -mr-4 pointer-events-none translate-x-full"
        )}>
          <CardHeader className="p-4 border-b">
            <CardTitle className="text-sm font-black flex items-center gap-2">
              <Layers size={16} /> LAYER CONTROLS
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0 flex-1 overflow-hidden">
            <ScrollArea className="h-full">
              <div className="p-4">
                <Accordion type="multiple" defaultValue={["layers", "kml"]} className="w-full">
                  <AccordionItem value="layers" className="border-none">
                    <AccordionTrigger className="hover:no-underline py-2">
                      <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                        <Layers size={14} /> GIS Monitoring Layers
                      </div>
                    </AccordionTrigger>
                    <AccordionContent className="pt-2 pb-4 space-y-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div className="p-2 bg-blue-100 text-blue-600 rounded-lg">
                            <Building size={16} />
                          </div>
                          <div>
                            <Label className="font-bold text-sm text-slate-700">Structures</Label>
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
                            <Label className="font-bold text-sm text-slate-700">Assets & Equipment</Label>
                            <p className="text-[10px] text-muted-foreground uppercase">Machinery & Vehicles</p>
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
                            <Label className="font-bold text-sm text-slate-700">Site Personnel</Label>
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
                            <Label className="font-bold text-sm text-slate-700">Land Parcels</Label>
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
                            <Label className="font-bold text-sm text-slate-700">Site Photos</Label>
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
                            <Label className="font-bold text-sm text-slate-700">Alignments</Label>
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
                            <Label className="font-bold text-sm text-slate-700">Linear Works</Label>
                            <p className="text-[10px] text-muted-foreground uppercase">Progress by Chainage</p>
                          </div>
                        </div>
                        <Switch 
                          checked={layerVisibility.linearWorks} 
                          onCheckedChange={() => toggleLayer('linearWorks')} 
                        />
                      </div>
                    </AccordionContent>
                  </AccordionItem>

                  <AccordionItem value="kml" className="border-none mt-2">
                    <AccordionTrigger className="hover:no-underline py-2">
                      <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                        <Route size={14} /> KML Alignment Management
                      </div>
                    </AccordionTrigger>
                    <AccordionContent className="pt-2 pb-4 space-y-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div className="p-2 bg-indigo-100 text-indigo-600 rounded-lg">
                            <Layers size={16} />
                          </div>
                          <div>
                            <Label className="font-bold text-sm text-slate-700">KML Master</Label>
                            <p className="text-[10px] text-muted-foreground uppercase">Global KML Toggle</p>
                          </div>
                        </div>
                        <Switch 
                          checked={layerVisibility.kml} 
                          onCheckedChange={() => toggleLayer('kml')} 
                        />
                      </div>

                      {/* Individual KML Files */}
                      {layerVisibility.kml && project.kmlData && project.kmlData.length > 0 && (
                        <div className="pl-4 space-y-3 mt-2 border-l-2 border-indigo-100">
                          {project.kmlData.map((kml) => (
                            <div key={kml.id} className="flex items-center justify-between group">
                              <div className="flex flex-col min-w-0 pr-4">
                                <span className="text-[11px] font-bold truncate leading-tight text-slate-600" title={kml.name}>
                                  {kml.name}
                                </span>
                                <span className="text-[9px] text-muted-foreground uppercase tracking-tighter font-medium">
                                  {new Date(kml.timestamp).toLocaleDateString()}
                                </span>
                              </div>
                              <div className="flex items-center gap-1">
                                <Button 
                                  size="sm" 
                                  variant="ghost" 
                                  className="h-6 w-6 p-0 text-indigo-600 hover:text-indigo-700 hover:bg-indigo-50"
                                  onClick={() => {
                                    zoomToKML(kml.content);
                                    if (!kml.visible) {
                                      const updatedKMLs = project.kmlData?.map(item => 
                                        item.id === kml.id ? { ...item, visible: true } : item
                                      );
                                      startTransition(() => {
                                        onProjectUpdate({ kmlData: updatedKMLs });
                                      });
                                    }
                                  }}
                                  title="Zoom to alignment"
                                >
                                  <Maximize size={12} />
                                </Button>
                                <Button 
                                  size="sm" 
                                  variant="ghost" 
                                  className="h-6 w-6 p-0 text-destructive hover:text-red-700 hover:bg-red-50"
                                  onClick={() => handleDeleteKML(kml.id)}
                                  title="Delete alignment"
                                >
                                  <Trash2 size={12} />
                                </Button>
                                <Switch 
                                  size="sm"
                                  className="scale-75 origin-right"
                                  checked={kml.visible} 
                                  onCheckedChange={(checked) => {
                                    const updatedKMLs = project.kmlData?.map(item => 
                                      item.id === kml.id ? { ...item, visible: checked } : item
                                    );
                                    startTransition(() => {
                                      onProjectUpdate({ kmlData: updatedKMLs });
                                    });
                                  }} 
                                />
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                      
                      {!project.kmlData?.length && (
                        <div className="text-center p-4 bg-slate-50 rounded-lg border-2 border-dashed border-slate-200">
                          <p className="text-[10px] font-bold text-slate-400 uppercase">No KML Files Uploaded</p>
                        </div>
                      )}
                    </AccordionContent>
                  </AccordionItem>

                  <AccordionItem value="stats" className="border-none mt-2">
                    <AccordionTrigger className="hover:no-underline py-2">
                      <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                        <BarChart3 size={14} /> Map Statistics
                      </div>
                    </AccordionTrigger>
                    <AccordionContent className="pt-2 pb-4">
                      <div className="grid grid-cols-2 gap-2">
                        <div className="bg-slate-50 p-2 rounded-lg border">
                          <p className="text-[10px] text-slate-500 font-bold uppercase">Fixed Assets</p>
                          <p className="text-xl font-black">{project.structures?.length || 0}</p>
                        </div>
                        <div className="bg-slate-50 p-2 rounded-lg border">
                          <p className="text-[10px] text-slate-500 font-bold uppercase">Mobile Assets</p>
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
                    </AccordionContent>
                  </AccordionItem>
                </Accordion>
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
