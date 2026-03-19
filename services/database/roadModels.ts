import mongoose, { Schema, Document, Model } from 'mongoose';
import { Road, Alignment, Structure, Point } from '../../models/roadTypes';

// Schema for Point (embedded)
const PointSchema = new Schema<Point>({
  lat: { type: Number, required: true },
  lng: { type: Number, required: true },
  alt: { type: Number }
});

// Schema for ChainagePoint (embedded in Alignment)
const ChainagePointSchema = new Schema({
  distance: { type: Number, required: true }, // meters from start
  chainage: { type: String, required: true }, // "0+000" format
  point: { type: PointSchema, required: true }
});

// Schema for Alignment (embedded or ref; embedded for simplicity as small)
const AlignmentSchema = new Schema<Alignment>({
  id: { type: String, required: true, unique: true },
  roadId: { type: String, required: true },
  name: { type: String, required: true },
  type: { 
    type: String, 
    enum: ['Pavement', 'Drainage', 'Footpath', 'Kerb', 'pavement', 'drainage', 'footpath', 'kerb', 'service'],
    required: true 
  },
  chainagePoints: [ChainagePointSchema],
  totalLength: { type: Number, default: 0 },
  kmlData: { type: String }
});

// Schema for Structure geometry (union type simplified)
const StructureGeometrySchema = new Schema({
  type: { type: String, enum: ['Point', 'LineString', 'Polygon'] },
  coordinates: mongoose.Schema.Types.Mixed // flexible for Point[], LineString[], Polygon[][]
});

// Schema for Structure (embedded)
const StructureSchema = new Schema<Structure>({
  id: { type: String, required: true, unique: true },
  roadId: { type: String, required: true },
  type: { 
    type: String,
    enum: ['Box Culvert', 'Pipe Culvert', 'Bridge', 'Retaining Wall', 'Abutment', 'Pier', 'Slab Culvert', 'Minor Bridge', 'Major Bridge', 'Drainage (Lined)', 'Drainage (Unlined)', 'Breast Wall', 'Pavement (Flexible)', 'Pavement (Rigid)', 'Footpath', 'Utility Duct', 'Street Light Base', 'Road Signal', 'Junction Box', 'Median Barrier', 'Pedestrian Guardrail', 'Bus Shelter', 'culvert', 'box-culvert', 'bridge', 'underpass'],
    required: true 
  },
  name: { type: String, required: true },
  chainage: { type: String, required: true },
  distance: { type: Number, required: true },
  geometry: StructureGeometrySchema,
  alignments: [{ type: String }],
  properties: { type: mongoose.Schema.Types.Mixed, default: {} }
});

// Main Road Schema
const RoadSchema = new Schema<Road>({
  id: { type: String, required: true, unique: true },
  name: { type: String, required: true },
  geometry: [PointSchema],
  chainageOffset: { type: Number, default: 0 },
  alignments: [AlignmentSchema],
  structures: [StructureSchema]
}, {
  timestamps: true
});

// Compound index for efficient queries
RoadSchema.index({ 'alignments.chainagePoints.chainage': 1 });
RoadSchema.index({ 'structures.distance': 1 });
RoadSchema.index({ 'structures.chainage': 1 });

export interface RoadDocument extends Road, Document {}
export const RoadModel: Model<RoadDocument> = mongoose.model<RoadDocument>('Road', RoadSchema);

export default RoadModel;
