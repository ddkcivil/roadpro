import mongoose, { Schema, Model, Document } from 'mongoose';
import bcrypt from 'bcrypt';
import { sql } from '@vercel/postgres';

const MONGODB_URI = process.env.MONGODB_URI || process.env.MONGO_URI || 'mongodb://localhost:27017/roadpro';

/**
 * Global is used here to maintain a cached connection across hot reloads
 * in development and serverless function invocations in production.
 */
let cached = (global as any).mongoose;

if (!cached) {
  cached = (global as any).mongoose = { conn: null, promise: null };
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
  lastSeen?: string;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface IPendingRegistration extends Document {
  id: string;
  name: string;
  email: string;
  phone?: string;
  password?: string;
  requestedRole: string;
  status?: string;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface IAuditLog extends Document {
  id: string;
  timestamp: string;
  userId: string;
  userName: string;
  action: string;
  entityType: string;
  entityId: string;
  entityName?: string;
  oldValue?: any;
  newValue?: any;
  severity: string;
  metadata?: any;
}

export interface IMessage extends Document {
  id: string;
  senderId: string;
  receiverId: string;
  content: string;
  timestamp: string;
  projectId: string;
  read: boolean;
  attachmentUrl?: string;
  attachmentName?: string;
  attachmentType?: string;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface IFile extends Document {
  id: string;
  name: string;
  contentType: string;
  data: Buffer;
  size: number;
  uploadDate: Date;
  metadata?: any;
}

export interface IProject extends Document {
  id: string;
  name: string;
  code?: string;
  location?: string;
  contractor?: string;
  startDate?: any;
  endDate?: any;
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
  roads?: any;
  createdAt?: Date;
  updatedAt?: Date;
}

// Define schemas
const userSchema = new Schema<IUser>({
  id: { type: String, required: true, unique: true, index: true },
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true, index: true },
  phone: String,
  password: { type: String, required: true },
  role: { type: String, required: true },
  avatar: String,
  lastSeen: String,
}, { timestamps: true });

const pendingRegistrationSchema = new Schema<IPendingRegistration>({
  id: { type: String, required: true, unique: true, index: true },
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true, index: true },
  phone: String,
  password: { type: String, required: true },
  requestedRole: { type: String, required: true },
  status: { type: String, default: 'pending' },
}, { timestamps: true });

const auditLogSchema = new Schema<IAuditLog>({
  id: { type: String, required: true, unique: true, index: true },
  timestamp: { type: String, required: true, index: true },
  userId: { type: String, required: true, index: true },
  userName: { type: String, required: true },
  action: { type: String, required: true, index: true },
  entityType: { type: String, required: true, index: true },
  entityId: { type: String, required: true },
  entityName: String,
  oldValue: Schema.Types.Mixed,
  newValue: Schema.Types.Mixed,
  severity: { type: String, required: true, index: true },
  metadata: Schema.Types.Mixed,
}, { timestamps: true });

const messageSchema = new Schema<IMessage>({
  id: { type: String, required: true, unique: true, index: true },
  senderId: { type: String, required: true, index: true },
  receiverId: { type: String, required: true, index: true },
  content: { type: String },
  timestamp: { type: String, required: true },
  projectId: { type: String, required: true, index: true },
  read: { type: Boolean, default: false },
  attachmentUrl: String,
  attachmentName: String,
  attachmentType: String,
}, { timestamps: true });

const fileSchema = new Schema<IFile>({
  id: { type: String, required: true, unique: true, index: true },
  name: { type: String, required: true },
  contentType: { type: String, required: true },
  data: { type: Buffer, required: true },
  size: { type: Number, required: true },
  uploadDate: { type: Date, default: Date.now },
  metadata: Schema.Types.Mixed,
}, { timestamps: true });

const projectSchema = new Schema<IProject>({
  id: { type: String, required: true, unique: true, index: true },
  name: { type: String, required: true, index: true },
  code: { type: String, index: true },
  location: String,
  contractor: String,
  startDate: { type: Schema.Types.Mixed },
  endDate: { type: Schema.Types.Mixed },
  contractPeriod: String,
  projectManager: String,
  supervisor: String,
  consultantName: String,
  clientName: String,
  logo: String,
  client: { type: String, required: true, index: true },
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
  roads: { type: Schema.Types.Mixed, default: [] },
}, { timestamps: true });

// Create models
const User = mongoose.models.User || mongoose.model<IUser>('User', userSchema);
const PendingRegistration = mongoose.models.PendingRegistration || mongoose.model<IPendingRegistration>('PendingRegistration', pendingRegistrationSchema);
const Project = mongoose.models.Project || mongoose.model<IProject>('Project', projectSchema);
const AuditLog = mongoose.models.AuditLog || mongoose.model<IAuditLog>('AuditLog', auditLogSchema);
const Message = mongoose.models.Message || mongoose.model<IMessage>('Message', messageSchema);
const FileStore = mongoose.models.File || mongoose.model<IFile>('File', fileSchema);

/**
 * Postgres document tables setup
 */
async function setupDocumentTables() {
  try {
    // Create documents table
    await sql`
      CREATE TABLE IF NOT EXISTS project_documents (
        id TEXT PRIMARY KEY,
        project_id TEXT,
        name TEXT NOT NULL,
        folder TEXT,
        tags TEXT[],
        subject TEXT,
        ref_no TEXT,
        size BIGINT,
        type TEXT,
        status TEXT,
        metadata JSONB,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      )
    `;

    // Create document_versions table
    await sql`
      CREATE TABLE IF NOT EXISTS document_versions (
        id TEXT PRIMARY KEY,
        doc_id TEXT NOT NULL REFERENCES project_documents(id) ON DELETE CASCADE,
        blob_url TEXT NOT NULL,
        version_num INTEGER NOT NULL,
        uploaded_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        size BIGINT,
        notes TEXT
      )
    `;
    console.log('Postgres document tables verified/created.');
  } catch (error) {
    console.error('Failed to setup Postgres document tables:', error);
    // Don't throw here to allow MongoDB part to work even if Postgres fails (e.g. env vars not set)
  }
}

/**
 * Seeds an initial admin user if none exist
 */
async function seedInitialAdmin(UserModel: Model<IUser>) {
  try {
    const userCount = await UserModel.countDocuments();
    if (userCount === 0) {
      console.log('No users found in database. Seeding initial admin...');
      const hashedPassword = await bcrypt.hash('admin123', 10);
      await UserModel.create({
        id: 'admin-001',
        name: 'System Administrator',
        email: 'admin@roadmaster.os',
        phone: '9779801234567',
        password: hashedPassword,
        role: 'ADMIN',
        avatar: 'https://ui-avatars.com/api/?name=Admin&background=random'
      });
      console.log('Initial admin created: admin@roadmaster.os / admin123');
    }
  } catch (error) {
    console.error('Failed to seed initial admin:', error);
  }
}

export async function connectToDatabase() {
  if (cached.conn) {
    return { User, PendingRegistration, Project, AuditLog, Message, FileStore, mongoose: cached.conn };
  }

  if (!cached.promise) {
    const opts = {
      bufferCommands: false,
      serverSelectionTimeoutMS: 10000, // Increased for Vercel cold starts
      socketTimeoutMS: 45000, // 45s for slow connections
      maxPoolSize: 20, // More connections for concurrent ops
      retryWrites: true,
      w: 1, // Changed from 'majority' to 1 for type compatibility
      family: 4, // IPv4 only for Vercel
    };

    console.log('Connecting to MongoDB...');
    cached.promise = mongoose.connect(MONGODB_URI, opts).then((mongoose) => {
      console.log('MongoDB connected successfully.');
      return mongoose;
    });
  }

  try {
    cached.conn = await cached.promise;
    
    // Seed initial admin if needed (only on first connection)
    await seedInitialAdmin(User);
    
    // Setup Postgres tables for documents
    await setupDocumentTables();
    
  } catch (e) {
    cached.promise = null;
    console.error('[DBCONNECT] MongoDB connection FAILED:', e);
    throw e;
  }

  return { User, PendingRegistration, Project, AuditLog, Message, FileStore, mongoose: cached.conn };
}
