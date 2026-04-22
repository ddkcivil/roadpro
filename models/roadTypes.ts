import { LatLngExpression } from 'leaflet';

// Chainage format: "0+000" -> 0 meters, "3+020" -> 3020 meters
export type Chainage = string;

export interface Point {
  lat: number;
  lng: number;
  alt?: number;
}

type ProjectPoint = Point;

export interface ChainagePoint {
  distance: number; // meters from start
  chainage: Chainage;
  point: ProjectPoint;
}

export interface Alignment {
  id: string;
  roadId: string;
  name: string; // e.g., "Pavement Main", "Drainage Left"
  type: 'Pavement' | 'Drainage' | 'Footpath' | 'Kerb' | 'pavement' | 'drainage' | 'footpath' | 'kerb' | 'service' | 'subgrade' | 'sub-base' | 'base' | 'asphalt';
  coordinates: LatLngExpression[]; // polyline coords from KML
  chainagePoints: ChainagePoint[];
  totalLength: number;
  kmlData?: string; // raw KML XML
  status?: 'Not Started' | 'In Progress' | 'Completed' | 'Delayed';
  progress?: number; // 0 to 100
  lastUpdated?: string;
}

export interface Structure {
  id: string;
  roadId: string;
  type: 'Box Culvert' | 'Pipe Culvert' | 'Bridge' | 'Retaining Wall' | 'Abutment' | 'Pier' | 'Slab Culvert' | 'Minor Bridge' | 'Major Bridge' | 'Drainage (Lined)' | 'Drainage (Unlined)' | 'Breast Wall' | 'Pavement (Flexible)' | 'Pavement (Rigid)' | 'Footpath' | 'Utility Duct' | 'Street Light Base' | 'Road Signal' | 'Junction Box' | 'Median Barrier' | 'Pedestrian Guardrail' | 'Bus Shelter' | 'culvert' | 'box-culvert' | 'bridge' | 'underpass';
  name: string;
  chainage: Chainage;
  distance: number; // normalized meters
  geometry?: Point | LatLngExpression[] | { type: 'Polygon'; coordinates: LatLngExpression[][] };
  alignments: string[]; // linked alignment IDs
  properties: Record<string, any>;
  status?: 'Not Started' | 'In Progress' | 'Completed';
  lastUpdated?: string;
}

export interface Road {
  id: string;
  name: string;
  category?: string;
  description?: string;
  surfaceType?: string;
  lanes?: number;
  geometry: ProjectPoint[];
  chainageOffset: number;
  alignments: Alignment[];
  structures: Structure[];
}

export interface RoadProject {
  id: string;
  name: string;
  alignments: Alignment[];
  structures: Structure[];
  synchronized: boolean;
  contractNo?: string; // Added to resolve Supabase schema mismatch error
}

// Utils
export function parseChainage(chainage: Chainage): number {
  if (!chainage) return 0;
  const match = chainage.match(/(\d+)\+(\d{3})/);
  if (!match) {
     // Try to parse as simple number if possible, or return 0
     const num = parseInt(chainage);
     return isNaN(num) ? 0 : num;
  }
  return parseInt(match[1]) * 1000 + parseInt(match[2]);
}

export function formatChainage(meters: number): Chainage {
  const km = Math.floor(meters / 1000);
  const m = Math.floor(meters % 1000).toString().padStart(3, '0');
  return `${km}+${m}`;
}

// Snap structure chainage to nearest common across alignments
export function snapToCommonChainage(structureChainage: Chainage, alignments: Alignment[]): Chainage | null {
  // const dist = parseChainage(structureChainage);
  // Find closest matching chainage in all alignments
  // Implementation in roadService
  return structureChainage; // placeholder
}
