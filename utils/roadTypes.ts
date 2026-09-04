// Chainage format: "0+000.00" -> 0 meters, "3+020.50" -> 3020.50 meters
export type Chainage = string;

export type LatLngExpression = [number, number] | { lat: number; lng: number } | { lat: number; lng: number; alt?: number };

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
  type: 'Pavement' | 'Drainage' | 'Footpath' | 'Kerb' | 'pavement' | 'drainage' | 'footpath' | 'kerb' | 'service' | 'subgrade' | 'sub-base' | 'base' | 'asphalt' | 'shoulder' | 'median' | 'lane' | 'other';
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
}

// Utils
export function parseChainage(chainage: Chainage): number {
  if (!chainage) return 0;
  // Support format "X+YYY.DD" or "X+YYY" with optional decimals
  const match = chainage.match(/(\d+)\+(\d{3})(?:\.(\d{1,2}))?/);
  if (!match) {
     // Try to parse as simple number if possible, or return 0
     const num = parseFloat(chainage);
     return isNaN(num) ? 0 : num;
  }
  const km = parseInt(match[1]);
  const meters = parseInt(match[2]);
  const decimals = match[3] ? parseInt(match[3].padEnd(2, '0')) : 0;
  return km * 1000 + meters + decimals / 100;
}

export function formatChainage(meters: number): Chainage {
  const km = Math.floor(meters / 1000);
  const m = Math.floor(meters % 1000).toString().padStart(3, '0');
  // Use Math.round on the total centimeters to avoid floating point precision issues
  const decimals = (Math.round(meters * 100) % 100).toString().padStart(2, '0');
  return `${km}+${m}.${decimals}`;
}

// Snap structure chainage to nearest common across alignments
export function snapToCommonChainage(structureChainage: Chainage, alignments: Alignment[]): Chainage | null {
  // const dist = parseChainage(structureChainage);
  // Find closest matching chainage in all alignments
  // Implementation in roadService
  return structureChainage; // placeholder
}