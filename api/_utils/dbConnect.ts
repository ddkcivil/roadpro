import mongoose, { Schema, Model, Document } from 'mongoose';

// Use MongoDB for both development and production
const isProduction = process.env.NODE_ENV === 'production' || process.env.VERCEL_ENV === 'production';

let mongoUri: string;

if (isProduction) {
  const uri = process.env.MONGODB_URI || process.env.MONGO_URI;
  if (!uri) {
    console.error('MONGODB_URI or MONGO_URI environment variable is not defined for production!');
    throw new Error('MONGODB_URI or MONGO_URI environment variable is not defined!');
  }
  mongoUri = uri;
} else {
  // Development: Use local MongoDB
  mongoUri = process.env.MONGODB_URI || process.env.MONGO_URI || 'mongodb://localhost:27017/roadpro';
}

// Define interfaces
export interface IUser extends Document {
  id: string;
  name: string;
  email: string;
  phone?: string;
  password: string;
  role: string;
  avatar?: string;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface IPendingRegistration extends Document {
  id: string;
  name: string;
  email: string;
  phone?: string;
  requestedRole: string;
  status?: string;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface IProject extends Document {
  id: string;
  name: string;
  code?: string;
  location?: string;
  contractor?: string;
  startDate?: Date;
  endDate?: Date;
  contractPeriod?: string;
  projectManager?: string;
  supervisor?: string;
  consultantName?: string;
  clientName?: string;
  logo?: string;
  client: string;
  engineer?: string;
  contractNo?: string;
  boq?: any;
  variationOrders?: any;
  rfis?: any;
  labTests?: any;
  schedule?: any;
  structures?: any;
  agencies?: any;
  agencyPayments?: any;
  agencyMaterials?: any;
  agencyBills?: any;
  materials?: any;
  subcontractorPayments?: any;
  linearWorks?: any;
  inventory?: any;
  purchaseOrders?: any;
  inventoryTransactions?: any;
  vehicles?: any;
  vehicleLogs?: any;
  documents?: any;
  sitePhotos?: any;
  dailyReports?: any;
  preConstruction?: any;
  preConstructionTasks?: any;
  landParcels?: any;
  mapOverlays?: any;
  kmlData?: any;
  hindrances?: any;
  ncrs?: any;
  contractBills?: any;
  subcontractorBills?: any;
  measurementSheets?: any;
  staffLocations?: any;
  environmentRegistry?: any;
  weather?: any;
  lastSynced?: string;
  spreadsheetId?: string;
  settings?: any;
  resources?: any;
  resourceAllocations?: any;
  milestones?: any;
  comments?: any;
  checklists?: any;
  defects?: any;
  complianceWorkflows?: any;
  auditLogs?: any;
  structureTemplates?: any;
  accountingIntegrations?: any;
  accountingTransactions?: any;
  personnel?: any;
  fleet?: any;
  createdAt?: Date;
  updatedAt?: Date;
}

// Define schemas
const userSchema = new Schema<IUser>({
  id: { type: String, required: true, unique: true },
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  phone: String,
  password: { type: String, required: true },
  role: { type: String, required: true },
  avatar: String,
}, { timestamps: true });

const pendingRegistrationSchema = new Schema<IPendingRegistration>({
  id: { type: String, required: true, unique: true },
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  phone: String,
  requestedRole: { type: String, required: true },
  status: { type: String, default: 'pending' },
}, { timestamps: true });

const projectSchema = new Schema<IProject>({
  id: { type: String, required: true, unique: true },
  name: { type: String, required: true },
  code: String,
  location: String,
  contractor: String,
  startDate: Date,
  endDate: Date,
  contractPeriod: String,
  projectManager: String,
  supervisor: String,
  consultantName: String,
  clientName: String,
  logo: String,
  client: { type: String, required: true },
  engineer: String,
  contractNo: String,
  boq: { type: Schema.Types.Mixed, default: [] },
  variationOrders: { type: Schema.Types.Mixed, default: [] },
  rfis: { type: Schema.Types.Mixed, default: [] },
  labTests: { type: Schema.Types.Mixed, default: [] },
  schedule: { type: Schema.Types.Mixed, default: [] },
  structures: { type: Schema.Types.Mixed, default: [] },
  agencies: { type: Schema.Types.Mixed, default: [] },
  agencyPayments: { type: Schema.Types.Mixed, default: [] },
  agencyMaterials: { type: Schema.Types.Mixed, default: [] },
  agencyBills: { type: Schema.Types.Mixed, default: [] },
  materials: { type: Schema.Types.Mixed, default: [] },
  subcontractorPayments: { type: Schema.Types.Mixed, default: [] },
  linearWorks: { type: Schema.Types.Mixed, default: [] },
  inventory: { type: Schema.Types.Mixed, default: [] },
  purchaseOrders: { type: Schema.Types.Mixed, default: [] },
  inventoryTransactions: { type: Schema.Types.Mixed, default: [] },
  vehicles: { type: Schema.Types.Mixed, default: [] },
  vehicleLogs: { type: Schema.Types.Mixed, default: [] },
  documents: { type: Schema.Types.Mixed, default: [] },
  sitePhotos: { type: Schema.Types.Mixed, default: [] },
  dailyReports: { type: Schema.Types.Mixed, default: [] },
  preConstruction: { type: Schema.Types.Mixed, default: [] },
  preConstructionTasks: { type: Schema.Types.Mixed, default: [] },
  landParcels: { type: Schema.Types.Mixed, default: [] },
  mapOverlays: { type: Schema.Types.Mixed, default: [] },
  kmlData: { type: Schema.Types.Mixed, default: [] },
  hindrances: { type: Schema.Types.Mixed, default: [] },
  ncrs: { type: Schema.Types.Mixed, default: [] },
  contractBills: { type: Schema.Types.Mixed, default: [] },
  subcontractorBills: { type: Schema.Types.Mixed, default: [] },
  measurementSheets: { type: Schema.Types.Mixed, default: [] },
  staffLocations: { type: Schema.Types.Mixed, default: [] },
  environmentRegistry: { type: Schema.Types.Mixed, default: {} },
  weather: { type: Schema.Types.Mixed, default: {} },
  lastSynced: String,
  spreadsheetId: String,
  settings: { type: Schema.Types.Mixed, default: {} },
  resources: { type: Schema.Types.Mixed, default: [] },
  resourceAllocations: { type: Schema.Types.Mixed, default: [] },
  milestones: { type: Schema.Types.Mixed, default: [] },
  comments: { type: Schema.Types.Mixed, default: [] },
  checklists: { type: Schema.Types.Mixed, default: [] },
  defects: { type: Schema.Types.Mixed, default: [] },
  complianceWorkflows: { type: Schema.Types.Mixed, default: [] },
  auditLogs: { type: Schema.Types.Mixed, default: [] },
  structureTemplates: { type: Schema.Types.Mixed, default: [] },
  accountingIntegrations: { type: Schema.Types.Mixed, default: [] },
  accountingTransactions: { type: Schema.Types.Mixed, default: [] },
  personnel: { type: Schema.Types.Mixed, default: [] },
  fleet: { type: Schema.Types.Mixed, default: [] },
}, { timestamps: true });

// Create models
const User = mongoose.models.User || mongoose.model<IUser>('User', userSchema);
const PendingRegistration = mongoose.models.PendingRegistration || mongoose.model<IPendingRegistration>('PendingRegistration', pendingRegistrationSchema);
const Project = mongoose.models.Project || mongoose.model<IProject>('Project', projectSchema);

let cachedConnection: any = null;

export async function connectToDatabase() {
  if (cachedConnection) {
    return { User, PendingRegistration, Project, mongoose };
  }

  try {
    await mongoose.connect(mongoUri, {
      serverSelectionTimeoutMS: 5000, // Timeout after 5 seconds
    });
    console.log('MongoDB connection has been established successfully.');
    cachedConnection = true;
    return { User, PendingRegistration, Project, mongoose };
  } catch (error) {
    console.error('Unable to connect to MongoDB:', error);
    throw error;
  }
}
