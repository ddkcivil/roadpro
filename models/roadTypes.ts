import { LatLngExpression } from 'leaflet';

// Chainage format: "0+000" -> 0 meters, "3+020" -> 3020 meters
export type Chainage = string;

export interface ProjectPoint {
  lat: number;
  lng: number;
}

export interface ChainagePoint {
  distance: number; // meters from start
  chainage: Chainage;
  point: ProjectPoint;
}

export interface Alignment {
  id: string;
  roadId: string;
  name: string; // e.g., "Pavement Main", "Drainage Left"
  type: 'pavement' | 'drainage' | 'footpath' | 'kerb' | 'service';
  coordinates: LatLngExpression[]; // polyline coords from KML
  chainagePoints: ChainagePoint[];
  totalLength: number;
  kmlData?: string; // raw KML XML
}

export interface Structure {
  id: string;
  roadId: string;
  type: 'culvert' | 'box-culvert' | 'bridge' | 'underpass';
  name: string;
  chainage: Chainage;
  distance: number; // normalized meters
  alignments: string[]; // linked alignment IDs
  properties: Record<string, any>;
}

export interface Road {
  id: string;
  name: string;
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
