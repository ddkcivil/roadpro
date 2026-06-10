/**
 * Nepal-Specific GIS Data for RoadMaster Pro
 * This file contains free Nepal map data for infrastructure planning and reference
 * 
 * All data coordinates are publicly available from OpenStreetMap and Nepal government sources
 */

// Major Cities in Nepal with coordinates [lat, lng]
export const NEPAL_CITIES = [
  { name: 'Kathmandu', lat: 27.7172, lng: 85.3240, population: '~1.5M', type: 'capital' },
  { name: 'Pokhara', lat: 28.2094, lng: 83.9851, population: '~400K', type: 'major' },
  { name: 'Butwal', lat: 27.7006, lng: 83.4484, population: '~200K', type: 'major' },
  { name: 'Birgunj', lat: 27.0382, lng: 84.8535, population: '~200K', type: 'major' },
  { name: 'Bhairahawa', lat: 27.4683, lng: 83.4481, population: '~180K', type: 'major' },
  { name: 'Janakpur', lat: 26.7288, lng: 85.9259, population: '~170K', type: 'major' },
  { name: 'Hetauda', lat: 27.4286, lng: 85.0373, population: '~150K', type: 'major' },
  { name: 'Biratnagar', lat: 26.3591, lng: 87.3344, population: '~140K', type: 'major' },
  { name: 'Damak', lat: 26.6931, lng: 87.7642, population: '~120K', type: 'major' },
  { name: 'Dharan', lat: 26.8124, lng: 87.2881, population: '~120K', type: 'major' },
  { name: 'Bharatpur', lat: 27.6853, lng: 84.4361, population: '~110K', type: 'major' },
  { name: 'Janakpur', lat: 26.7288, lng: 85.9259, population: '~170K', type: 'airport' },
] as const;

// Major Airports in Nepal
export const NEPAL_AIRPORTS = [
  { name: 'Tribhuvan International Airport (TIA)', code: 'KTM', lat: 27.6966, lng: 85.3592, city: 'Kathmandu', type: 'international' },
  { name: 'Pokhara International Airport', code: 'PKR', lat: 28.1879, lng: 83.9822, city: 'Pokhara', type: 'international' },
  { name: 'Bharatpur Airport', code: 'BWA', lat: 27.6708, lng: 84.4294, city: 'Bharatpur', type: 'domestic' },
  { name: 'Bhairahawa Airport', code: 'BWA', lat: 27.5051, lng: 83.4131, city: 'Bhairahawa', type: 'domestic' },
  { name: 'Birgunj Airport', code: 'BIR', lat: 27.0184, lng: 84.6566, city: 'Birgunj', type: 'domestic' },
] as const;

// Major Border Crossings with India
export const NEPAL_BORDER_CROSSINGS = [
  { name: 'Sunauli Border', lat: 27.4329, lng: 83.5218, state: 'Uttar Pradesh', indianSide: 'Sunauli' },
  { name: 'Belhiya Border (Raxaul)', lat: 27.0286, lng: 84.8196, state: 'Bihar', indianSide: 'Raxaul' },
  { name: 'Siddharthanagar', lat: 27.4639, lng: 83.4494, state: 'Uttar Pradesh', indianSide: 'Balka' },
  { name: 'Maheshpur', lat: 26.7286, lng: 86.0719, state: 'Bihar', indianSide: 'Rajbiraj' },
  { name: 'Naugaon', lat: 26.3529, lng: 87.2112, state: 'Bihar', indianSide: 'Purnia' },
  { name: 'Kankarbhitta', lat: 26.8814, lng: 87.7768, state: 'West Bengal', indianSide: 'Kalingpong' },
] as const;

// Major Highways in Nepal (approximate routes - for reference only)
// These are main highways managed by Department of Roads
export const NEPAL_HIGHWAYS = [
  {
    name: 'Mahendra Highway (H01)',
    description: 'East-West Highway - Main national highway',
    color: '#dc2626',
    approximateRoute: [
      { city: 'Biratnagar', lat: 26.3591, lng: 87.3344 },
      { city: 'Birgunj', lat: 27.0382, lng: 84.8535 },
      { city: 'Hetauda', lat: 27.4286, lng: 85.0373 },
      { city: 'Kathmandu', lat: 27.7172, lng: 85.3240 },
      { city: 'Pokhara', lat: 28.2094, lng: 83.9851 },
      { city: 'Lamahi', lat: 28.2489, lng: 82.2624 },
      { city: 'Kohalpur', lat: 28.5847, lng: 81.6734 },
    ]
  },
  {
    name: 'Prithvi Highway (H02)',
    description: 'Kathmandu-Pokhara via Mugling',
    color: '#2563eb',
    approximateRoute: [
      { city: 'Kathmandu', lat: 27.7172, lng: 85.3240 },
      { city: 'Mugling', lat: 27.8673, lng: 84.6184 },
      { city: 'Pokhara', lat: 28.2094, lng: 83.9851 },
    ]
  },
  {
    name: 'Siddhartha Highway (H09)',
    description: 'Kathmandu-Lhasa border via Arniko Highway',
    color: '#16a34a',
    approximateRoute: [
      { city: 'Kathmandu', lat: 27.7172, lng: 85.3240 },
      { city: 'Kodari', lat: 27.8001, lng: 85.9200 },
      { city: 'Zhangmu', lat: 27.9527, lng: 85.9386 },
    ]
  },
  {
    name: 'Tribhuvan Highway (H03)',
    description: 'Kathmandu-Birgunj (Indo-Nepal border)',
    color: '#9333ea',
    approximateRoute: [
      { city: 'Kathmandu', lat: 27.7172, lng: 85.3240 },
      { city: 'Hetauda', lat: 27.4286, lng: 85.0373 },
      { city: 'Birgunj', lat: 27.0382, lng: 84.8535 },
    ]
  },
] as const;

// Nepal Province Capitals
export const NEPAL_PROVINCE_CAPITALS = [
  { province: 'Province 1', capital: 'Biratnagar', lat: 26.3591, lng: 87.3344 },
  { province: 'Province 2', capital: 'Janakpur', lat: 26.7288, lng: 85.9259 },
  { province: 'Province 3', capital: 'Hetauda', lat: 27.4286, lng: 85.0373 },
  { province: 'Province 4', capital: 'Pokhara', lat: 28.2094, lng: 83.9851 },
  { province: 'Province 5', capital: 'Butwal', lat: 27.7006, lng: 83.4484 },
  { province: 'Province 6', capital: 'Nepalgunj', lat: 28.0336, lng: 81.6201 },
  { province: 'Province 7', capital: 'Godawari', lat: 29.2717, lng: 80.2501 },
] as const;

// Industrial Areas / Economic Zones
export const NEPAL_INDUSTRIAL_ZONES = [
  { name: 'Baneshwor Industrial Area', lat: 27.6918, lng: 85.3391, city: 'Kathmandu' },
  { name: 'Patan Industrial Area', lat: 27.6780, lng: 85.2823, city: 'Lalitpur' },
  { name: 'Birgunj Industrial Corridor', lat: 27.0282, lng: 84.8535, city: 'Birgunj' },
  { name: 'Butwal Industrial Area', lat: 27.7006, lng: 83.4484, city: 'Butwal' },
  { name: 'Hetauda Industrial Area', lat: 27.4286, lng: 85.0373, city: 'Hetauda' },
] as const;

// Default map center and zoom for Nepal
export const NEPAL_MAP_DEFAULTS = {
  center: { lat: 27.7172, lng: 85.3240 }, // Kathmandu
  butwalCenter: { lat: 27.7006, lng: 83.4484 }, // Butwal (project default)
  defaultZoom: 8,
  cityZoom: 12,
  highwayZoom: 7,
} as const;

// Export all data for easy access
export const NEPAL_MAP_DATA = {
  cities: NEPAL_CITIES,
  airports: NEPAL_AIRPORTS,
  borderCrossings: NEPAL_BORDER_CROSSINGS,
  highways: NEPAL_HIGHWAYS,
  provinceCapitals: NEPAL_PROVINCE_CAPITALS,
  industrialZones: NEPAL_INDUSTRIAL_ZONES,
  defaults: NEPAL_MAP_DEFAULTS,
} as const;

export default NEPAL_MAP_DATA;
