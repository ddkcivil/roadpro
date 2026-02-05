// api/_utils/dbConnect.ts
import mongoose from 'mongoose';

// User Schema
const userSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true },
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  phone: { type: String },
  role: { type: String, required: true },
  avatar: { type: String },
  createdAt: { type: Date, default: Date.now }
});

// Pending Registration Schema
const pendingRegistrationSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true },
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  phone: { type: String },
  requestedRole: { type: String, required: true },
  status: { type: String, default: 'pending' },
  createdAt: { type: Date, default: Date.now }
});

// Project Schema
const boqItemSchema = new mongoose.Schema({
  id: { type: String, required: true },
  itemNo: { type: String, required: true },
  description: { type: String, required: true },
  unit: { type: String, required: true },
  quantity: { type: Number, required: true },
  rate: { type: Number, required: true },
  amount: { type: Number, required: true },
  category: { type: String, required: true },
  location: { type: String, required: true },
  completedQuantity: { type: Number, required: true },
  variationQuantity: { type: Number },
  revisedQuantity: { type: Number },
  status: { type: String },
  subcontractorId: { type: String },
});

const rfiSchema = new mongoose.Schema({
  id: { type: String, required: true },
  rfiNumber: { type: String, required: true },
  rfiNo: { type: String },
  title: { type: String },
  date: { type: String, required: true },
  location: { type: String, required: true },
  description: { type: String, required: true },
  category: { type: String },
  status: { type: String, required: true },
  requestedBy: { type: String, required: true },
  inspectionDate: { type: String },
  inspectionTime: { type: String },
  linkedTaskId: { type: String },
  workflowLog: { type: Array },
  question: { type: String },
  priority: { type: String },
  responseDate: { type: String },
  inspectionPurpose: { type: String },
  inspectionReport: { type: String },
  engineerComments: { type: String },
  areSignature: { type: String },
  iowSignature: { type: String },
  meSltSignature: { type: String },
  reSignature: { type: String },
  requestNumber: { type: String },
  workingDrawings: { type: [String] },
  submittedBy: { type: String },
  receivedBy: { type: String },
  submittedDate: { type: String },
  receivedDate: { type: String },
  linkedChecklistIds: { type: [String] },
  inspectionType: { type: String },
  specificWorkDetails: { type: String },
  engineerRepresentativeComments: { type: String },
  worksStatus: { type: String },
});

const labTestSchema = new mongoose.Schema({
  id: { type: String, required: true },
  testName: { type: String, required: true },
  category: { type: String, required: true },
  sampleId: { type: String, required: true },
  date: { type: String, required: true },
  location: { type: String, required: true },
  result: { type: String, required: true },
  assetId: { type: String },
  componentId: { type: String },
  testData: { type: mongoose.Schema.Types.Mixed },
  calculatedValue: { type: String },
  standardLimit: { type: String },
  technician: { type: String },
});

const ncrSchema = new mongoose.Schema({
  id: { type: String, required: true },
  ncrNumber: { type: String, required: true },
  date: { type: String, required: true },
  dateRaised: { type: String, required: true },
  description: { type: String, required: true },
  location: { type: String, required: true },
  severity: { type: String, required: true },
  status: { type: String, required: true },
  linkedTestId: { type: String },
  raisedBy: { type: String },
});

const taskDependencySchema = new mongoose.Schema({
  taskId: { type: String, required: true },
  type: { type: String, required: true },
  lag: { type: Number, required: true },
});

const scheduleTaskSchema = new mongoose.Schema({
  id: { type: String, required: true },
  name: { type: String, required: true },
  taskName: { type: String },
  description: { type: String },
  startDate: { type: String, required: true },
  endDate: { type: String, required: true },
  duration: { type: Number },
  progress: { type: Number, required: true },
  status: { type: String, required: true },
  assignedTo: { type: [String] },
  dependencies: { type: [taskDependencySchema] },
  isCritical: { type: Boolean },
  boqItemId: { type: String },
});
const projectSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true },
  name: { type: String, required: true },
  code: { type: String },
  location: { type: String },
  contractor: { type: String },
  startDate: { type: String }, // Stored as string, e.g., ISO date string
  endDate: { type: String },   // Stored as string
  contractPeriod: { type: String },
  projectManager: { type: String },
  supervisor: { type: String },
  consultantName: { type: String },
  clientName: { type: String },
  logo: { type: String },
  client: { type: String, required: true },
  engineer: { type: String },
  contractNo: { type: String },
  boq: { type: [boqItemSchema], default: [] },
  variationOrders: { type: [mongoose.Schema.Types.Mixed], default: [] }, // VariationOrder schema can be defined later if needed
  rfis: { type: [rfiSchema], default: [] },
  labTests: { type: [labTestSchema], default: [] },
  schedule: { type: [scheduleTaskSchema], default: [] },
  structures: { type: [mongoose.Schema.Types.Mixed], default: [] }, // StructureAsset schema can be defined later
  agencies: { type: [mongoose.Schema.Types.Mixed], default: [] },   // Agency schema can be defined later
  agencyPayments: { type: [mongoose.Schema.Types.Mixed], default: [] }, // AgencyPayment schema can be defined later
  agencyMaterials: { type: [mongoose.Schema.Types.Mixed], default: [] }, // AgencyMaterial schema can be defined later
  agencyBills: { type: [mongoose.Schema.Types.Mixed], default: [] },     // AgencyBill schema can be defined later
  materials: { type: [mongoose.Schema.Types.Mixed], default: [] },       // Material schema can be defined later
  subcontractorPayments: { type: [mongoose.Schema.Types.Mixed], default: [] }, // SubcontractorPayment schema can be defined later
  linearWorks: { type: [mongoose.Schema.Types.Mixed], default: [] }, // LinearWorkLog schema can be defined later
  inventory: { type: [mongoose.Schema.Types.Mixed], default: [] },   // InventoryItem schema can be defined later
  purchaseOrders: { type: [mongoose.Schema.Types.Mixed], default: [] }, // PurchaseOrder schema can be defined later
  inventoryTransactions: { type: [mongoose.Schema.Types.Mixed], default: [] }, // InventoryTransaction schema can be defined later
  vehicles: { type: [mongoose.Schema.Types.Mixed], default: [] },    // Vehicle schema can be defined later
  vehicleLogs: { type: [mongoose.Schema.Types.Mixed], default: [] },   // VehicleLog schema can be defined later
  documents: { type: [mongoose.Schema.Types.Mixed], default: [] },   // ProjectDocument schema can be defined later
  sitePhotos: { type: [mongoose.Schema.Types.Mixed], default: [] },  // SitePhoto schema can be defined later
  dailyReports: { type: [mongoose.Schema.Types.Mixed], default: [] }, // DailyReport schema can be defined later
  preConstruction: { type: [mongoose.Schema.Types.Mixed], default: [] }, // PreConstructionTask schema can be defined later
  preConstructionTasks: { type: [mongoose.Schema.Types.Mixed], default: [] }, // Duplicate, will ensure consistency later
  landParcels: { type: [mongoose.Schema.Types.Mixed], default: [] }, // LandParcel schema can be defined later
  mapOverlays: { type: [mongoose.Schema.Types.Mixed], default: [] }, // MapOverlay schema can be defined later
  kmlData: { type: [mongoose.Schema.Types.Mixed], default: [] },     // KMLData schema can be defined later
  hindrances: { type: [mongoose.Schema.Types.Mixed], default: [] }, // Assuming 'any[]' in types
  ncrs: { type: [ncrSchema], default: [] }, // Using the defined ncrSchema
  contractBills: { type: [mongoose.Schema.Types.Mixed], default: [] }, // ContractBill schema can be defined later
  subcontractorBills: { type: [mongoose.Schema.Types.Mixed], default: [] }, // SubcontractorBill schema can be defined later
  measurementSheets: { type: [mongoose.Schema.Types.Mixed], default: [] }, // MeasurementSheet schema can be defined later
  staffLocations: { type: [mongoose.Schema.Types.Mixed], default: [] }, // StaffLocation schema can be defined later
  environmentRegistry: { type: mongoose.Schema.Types.Mixed }, // EnvironmentRegistry is an object, not array
  weather: { type: mongoose.Schema.Types.Mixed }, // WeatherInfo is an object
  lastSynced: { type: String },
  spreadsheetId: { type: String },
  settings: { type: mongoose.Schema.Types.Mixed }, // AppSettings is an object
  resources: { type: [mongoose.Schema.Types.Mixed], default: [] }, // ResourceMatrix schema can be defined later
  resourceAllocations: { type: [mongoose.Schema.Types.Mixed], default: [] }, // ResourceAllocation schema can be defined later
  milestones: { type: [mongoose.Schema.Types.Mixed], default: [] }, // Milestone schema can be defined later
  comments: { type: [mongoose.Schema.Types.Mixed], default: [] }, // Comment schema can be defined later
  checklists: { type: [mongoose.Schema.Types.Mixed], default: [] }, // Checklist schema can be defined later
  defects: { type: [mongoose.Schema.Types.Mixed], default: [] }, // Defect schema can be defined later
  complianceWorkflows: { type: [mongoose.Schema.Types.Mixed], default: [] }, // ComplianceWorkflow schema can be defined later
  auditLogs: { type: [mongoose.Schema.Types.Mixed], default: [] }, // AuditLog schema can be defined later
  structureTemplates: { type: [mongoose.Schema.Types.Mixed], default: [] }, // StructureTemplate schema can be defined later
  accountingIntegrations: { type: [mongoose.Schema.Types.Mixed], default: [] }, // AccountingIntegration schema can be defined later
  accountingTransactions: { type: [mongoose.Schema.Types.Mixed], default: [] }, // AccountingTransaction schema can be defined later
  personnel: { type: [mongoose.Schema.Types.Mixed], default: [] }, // Assuming 'any[]'
  fleet: { type: [mongoose.Schema.Types.Mixed], default: [] }, // Assuming 'any[]'
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

// Models (ensure models are not recompiled)
const User = mongoose.models.User || mongoose.model('User', userSchema);
const PendingRegistration = mongoose.models.PendingRegistration || mongoose.model('PendingRegistration', pendingRegistrationSchema);
const Project = mongoose.models.Project || mongoose.model('Project', projectSchema);

// Cached connection for serverless functions
let cachedDb: typeof mongoose | null = null;

export async function connectToDatabase() {
  if (cachedDb) {
    return { conn: cachedDb, User, PendingRegistration, Project };
  }

  const mongoUri = process.env.MONGODB_URI;

  if (!mongoUri) {
    throw new Error('MONGODB_URI environment variable is not defined!');
  }

  const conn = await mongoose.connect(mongoUri, {
    maxPoolSize: 10,
    serverSelectionTimeoutMS: 5000,
    socketTimeoutMS: 45000,
  });

  cachedDb = conn;
  return { conn, User, PendingRegistration, Project };
}