export enum RFIStatus {
  OPEN = 'Open',
  APPROVED = 'Approved',
  REJECTED = 'Rejected',
  PENDING_INSPECTION = 'Pending Inspection',
  CLOSED = 'Closed'
}

export enum WorkCategory {
  EARTHWORK = 'Earthwork',
  STRUCTURES = 'Structures',
  PAVEMENT = 'Pavement',
  GENERAL = 'General',
  SAFETY = 'Safety',
  EXTRA_WORK = 'Extra Work'
}

export enum UserRole {
  ADMIN = 'Admin',
  PROJECT_MANAGER = 'Project Manager',
  SITE_ENGINEER = 'Site Engineer',
  LAB_TECHNICIAN = 'Lab Technician',
  CONTRACTOR = 'Contractor',
  SUBCONTRACTOR = 'Subcontractor',
  SUPERVISOR = 'Supervisor'
}

export enum Permission {
  // Project permissions
  PROJECT_CREATE = 'project:create',
  PROJECT_READ = 'project:read',
  PROJECT_UPDATE = 'project:update',
  PROJECT_DELETE = 'project:delete',
  
  // User management permissions
  USER_CREATE = 'user:create',
  USER_READ = 'user:read',
  USER_UPDATE = 'user:update',
  USER_DELETE = 'user:delete',
  
  // Schedule permissions
  SCHEDULE_CREATE = 'schedule:create',
  SCHEDULE_READ = 'schedule:read',
  SCHEDULE_UPDATE = 'schedule:update',
  SCHEDULE_DELETE = 'schedule:delete',
  
  // BOQ permissions
  BOQ_CREATE = 'boq:create',
  BOQ_READ = 'boq:read',
  BOQ_UPDATE = 'boq:update',
  BOQ_DELETE = 'boq:delete',
  
  // RFI permissions
  RFI_CREATE = 'rfi:create',
  RFI_READ = 'rfi:read',
  RFI_UPDATE = 'rfi:update',
  RFI_DELETE = 'rfi:delete',
  
  // Document permissions
  DOCUMENT_CREATE = 'document:create',
  DOCUMENT_READ = 'document:read',
  DOCUMENT_UPDATE = 'document:update',
  DOCUMENT_DELETE = 'document:delete',
  
  // Report permissions
  REPORT_CREATE = 'report:create',
  REPORT_READ = 'report:read',
  REPORT_UPDATE = 'report:update',
  REPORT_DELETE = 'report:delete',
  
  // Finance permissions
  FINANCE_CREATE = 'finance:create',
  FINANCE_READ = 'finance:read',
  FINANCE_UPDATE = 'finance:update',
  FINANCE_DELETE = 'finance:delete',
  
  // Admin permissions
  SETTINGS_UPDATE = 'settings:update',
  BACKUP_MANAGE = 'backup:manage'
}

export interface RolePermissions {
  role: UserRole;
  permissions: Permission[];
}

export interface UserWithPermissions extends User {
  permissions: Permission[];
}

export interface User {
  id: string;
  name: string;
  email: string;
  phone: string;
  role: UserRole;
  avatar?: string;
}

export interface RFI {
  id: string;
  rfiNumber: string;
  rfiNo?: string;
  title?: string;
  date: string;
  location: string;
  description: string;
  category?: string;
  status: RFIStatus;
  requestedBy: string; // User ID
  inspectionDate?: string;
  inspectionTime?: string;
  linkedTaskId?: string;
  workflowLog: any[];
  question?: string;
  priority?: string;
  responseDate?: string;
  inspectionPurpose?: 'First' | 'Second' | 'Third' | 'Routine' | 'Special' | 'Other';
  inspectionReport?: string;
  engineerComments?: string;
  areSignature?: string;
  iowSignature?: string;
  meSltSignature?: string;
  reSignature?: string;
  requestNumber?: string;
  workingDrawings?: string[];
  submittedBy?: string;
  receivedBy?: string;
  submittedDate?: string;
  receivedDate?: string;
  linkedChecklistIds?: string[];
  inspectionType?: string;
  specificWorkDetails?: string;
  engineerRepresentativeComments?: string;
  worksStatus?: 'Approved' | 'Approved as Noted' | 'Approved for Subsequent Work' | '';
}

export interface LabTest {
  id: string;
  testName: string;
  category: string;
  sampleId: string;
  date: string;
  location: string;
  result: 'Pass' | 'Fail' | 'Pending';
  assetId?: string;
  componentId?: string;
  testData?: any;
  calculatedValue?: string;
  standardLimit?: string;
  technician?: string;
}

export interface NCR {
  id: string;
  ncrNumber: string;
  date: string;
  dateRaised: string;
  description: string;
  location: string;
  severity: 'Low' | 'Medium' | 'High' | 'Critical';
  status: 'Open' | 'Correction Pending' | 'Verification Pending' | 'Closed';
  linkedTestId?: string;
  raisedBy?: string;
}

export type StructureType = 'Box Culvert' | 'Pipe Culvert' | 'Bridge' | 'Retaining Wall' | 'Abutment' | 'Pier' | 'Slab Culvert' | 'Minor Bridge' | 'Major Bridge' | 'Drainage (Lined)' | 'Drainage (Unlined)' | 'Breast Wall' | 'Pavement (Flexible)' | 'Pavement (Rigid)' | 'Footpath' | 'Utility Duct' | 'Street Light Base' | 'Road Signal' | 'Junction Box' | 'Median Barrier' | 'Pedestrian Guardrail' | 'Bus Shelter';

export interface StructureComponent {
  id: string;
  name: string;
  unit: string;
  totalQuantity: number;
  completedQuantity: number;
  verifiedQuantity: number;
  boqItemId?: string;
  subcontractorId?: string;
  workLogs: StructureWorkLog[];
}

export interface StructureTemplate {
  id: string;
  name: string;
  type: StructureType;
  description: string;
  components: StructureComponent[];
  estimatedDuration?: number; // in days
  standardRate?: number;
  createdDate: string;
  updatedDate: string;
}

export interface StructureWorkLog {
  id: string;
  date: string;
  quantity: number;
  rate?: number; // Rate per unit for this work log entry
  subcontractorId?: string;
  remarks: string;
  rfiId?: string;
  boqItemId?: string;
  labTestId?: string;
}

export interface StructureAsset {
  id: string;
  name: string; 
  type: StructureType;
  location: string; 
  status: 'Not Started' | 'In Progress' | 'Completed';
  progress?: number;
  components: StructureComponent[];
  completionDate?: string;
  subcontractorId?: string;
  chainage?: string; // Chainage location on the road alignment
}

export interface TaskDependency {
  taskId: string;
  type: 'FS' | 'SS' | 'FF' | 'SF';
  lag: number;
}

export interface ScheduleTask {
  id: string;
  name: string;
  taskName?: string;
  description?: string;
  startDate: string;
  endDate: string;
  duration?: number;
  progress: number;
  status: 'Not Started' | 'On Track' | 'Delayed' | 'Completed';
  assignedTo?: string[];
  dependencies: TaskDependency[];
  isCritical?: boolean;
  boqItemId?: string;
}

export interface InventoryTransaction {
  id: string;
  itemId: string;
  itemName: string;
  type: 'IN' | 'OUT';
  date: string;
  quantity: number;
  vendorName?: string;
}

export interface Vehicle {
  id: string;
  plateNumber: string;
  type: string;
  status: 'Active' | 'Maintenance' | 'Idle';
  driver: string;
  agencyId?: string;
  chainage?: string; // Chainage location on the road alignment
  geofenceStatus?: 'Inside' | 'Outside';
  gpsLocation?: {
    latitude: number;
    longitude: number;
    timestamp: string;
    accuracy?: number; // Accuracy in meters
    speed?: number; // Speed in km/h
    heading?: number; // Direction in degrees
  };
  lastKnownLocation?: {
    latitude: number;
    longitude: number;
    timestamp: string;
  };
}

export interface VehicleLog {
  id: string;
  vehicleId: string;
  plateNumber: string;
  date: string;
  startKm: number;
  endKm: number;
  totalKm: number;
  fuelConsumed: number;
  workingHours: number;
  activityDescription: string;
}

export interface DocumentVersion {
  id: string;
  version: number;
  date: string;
  size: string;
  filePath: string; // Path to the actual file
  uploadedBy: string;
  notes?: string;
}

export interface Comment {
  id: string;
  entityId: string; // ID of the entity the comment is associated with (document, task, structure, etc.)
  entityType: 'document' | 'task' | 'structure' | 'rfi' | 'boq-item' | 'inspection' | 'photo';
  authorId: string;
  authorName: string;
  content: string;
  timestamp: string;
  parentId?: string; // For threaded replies
  likes?: string[]; // User IDs who liked the comment
  attachments?: string[]; // File attachment IDs
  resolved?: boolean; // For issue tracking
  mentionedUserIds?: string[]; // User IDs mentioned in the comment
}

export interface ChecklistItem {
  id: string;
  title: string;
  description?: string;
  required: boolean;
  valueType: 'boolean' | 'number' | 'text' | 'select';
  options?: string[]; // For select type
  order: number;
}

export interface Checklist {
  id: string;
  name: string;
  description?: string;
  category: string; // e.g., 'Safety', 'Quality', 'Environmental'
  items: ChecklistItem[];
  createdAt: string;
  updatedAt: string;
  isActive: boolean;
  assignedTo?: string[]; // User IDs who can use this checklist
  applicableTo?: ('structure' | 'task' | 'site' | 'equipment')[]; // Where this checklist can be applied
}

export interface Defect {
  id: string;
  title: string;
  description: string;
  severity: 'Low' | 'Medium' | 'High' | 'Critical';
  status: 'Open' | 'In Progress' | 'Fixed' | 'Verified' | 'Closed';
  priority: 'Low' | 'Medium' | 'High' | 'Urgent';
  detectedDate: string;
  detectedBy: string; // User ID
  detectedLocation: string;
  linkedEntityId?: string; // ID of related entity (task, structure, etc.)
  linkedEntityType?: 'task' | 'structure' | 'boq-item' | 'inspection' | 'photo';
  images?: string[]; // Image URLs or IDs
  assignedTo?: string[]; // User IDs assigned to fix the defect
  fixedDate?: string;
  verifiedDate?: string;
  verificationNotes?: string;
  rootCause?: string;
  correctiveAction?: string;
  preventiveAction?: string;
  costImpact?: number; // Financial impact of the defect
  timeImpact?: number; // Days of delay caused by the defect
  tags?: string[];
  comments?: Comment[];
}

export interface ComplianceStep {
  id: string;
  name: string;
  description: string;
  required: boolean;
  responsibleRole: UserRole;
  deadline: string; // ISO date string
  status: 'Pending' | 'In Progress' | 'Completed' | 'Overdue' | 'Skipped';
  completedDate?: string;
  completedBy?: string; // User ID
  evidence?: string[]; // File/image IDs showing compliance
  notes?: string;
  approvalRequired?: boolean;
  approverRole?: UserRole;
}

export interface ComplianceWorkflow {
  id: string;
  name: string;
  description: string;
  category: 'Environmental' | 'Safety' | 'Quality' | 'Legal' | 'Regulatory';
  applicableTo: ('project' | 'task' | 'structure' | 'activity' | 'equipment')[];
  steps: ComplianceStep[];
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  triggers?: {
    eventType: 'task-completion' | 'milestone-reached' | 'inspection-failed' | 'defect-reported' | 'date-based';
    entityCondition?: string; // Condition for triggering
    schedule?: {
      frequency: 'daily' | 'weekly' | 'monthly' | 'quarterly' | 'annually';
      startDate: string;
      endDate?: string;
    };
  }[];
  assignedTo?: string[]; // User IDs assigned to manage this workflow
  tags?: string[];
}

export interface AuditLog {
  id: string;
  timestamp: string; // ISO date string
  userId: string; // User ID who performed the action
  userName: string; // Name of the user who performed the action
  action: 'CREATE' | 'UPDATE' | 'DELETE' | 'VIEW' | 'EXPORT' | 'IMPORT' | 'ASSIGN' | 'COMMENT' | 'UPLOAD' | 'DOWNLOAD' | 'APPROVE' | 'REJECT' | 'STATUS_CHANGE' | 'LOGIN' | 'LOGOUT';
  entityType: 'project' | 'task' | 'document' | 'boq-item' | 'rfi' | 'structure' | 'defect' | 'inspection' | 'payment' | 'user' | 'comment' | 'checklist' | 'compliance-workflow' | 'resource-allocation' | 'milestone' | 'photo' | 'vehicle' | 'lab-test' | 'ncr' | 'bill' | 'measurement-sheet';
  entityId: string; // ID of the entity that was affected
  entityName?: string; // Name of the entity for easier identification
  oldValue?: any; // Previous value before update/delete
  newValue?: any; // New value after create/update
  ipAddress?: string; // IP address of the user
  userAgent?: string; // Browser/device information
  metadata?: {
    projectId?: string;
    projectName?: string;
    location?: string;
    [key: string]: any;
  };
  severity: 'INFO' | 'WARNING' | 'ERROR' | 'CRITICAL';
  notes?: string;
}

export interface ProjectDocument {
  id: string;
  name: string;
  type: string;
  date: string; // Scanning date
  size: string;
  folder: string;
  subject: string;
  tags: string[];
  refNo?: string;
  letterDate?: string; // Date from the document itself
  correspondenceType?: 'incoming' | 'outgoing'; // Label for correspondence direction
  fileUrl?: string; // URL to access the document file
  currentVersion: number;
  versions: DocumentVersion[];
  createdBy: string;
  lastModified: string;
  status: 'Active' | 'Archived' | 'Draft' | 'Review' | 'Unavailable';
  comments?: Comment[];
}

export interface DailyWorkItem {
  id: string;
  assetId?: string;
  componentId?: string;
  location: string;
  quantity: number;
  description: string;
}

export interface DailyReport {
  id: string;
  date: string;
  reportNumber: string;
  status: 'Draft' | 'Submitted' | 'Approved';
  submittedBy: string;
  workToday: DailyWorkItem[];
  photos?: SitePhoto[];
}

export interface PreConstructionTask {
  id: string;
  category: 'Survey' | 'Land Acquisition' | 'Forest Clearance' | 'Utility Shifting' | 'Design';
  description: string;
  status: 'Pending' | 'In Progress' | 'Completed';
  targetDate: string;
  estStartDate?: string;
  estEndDate?: string;
  startDate?: string;
  endDate?: string;
  progress: number;
  remarks: string;
  logs?: any[];
}

export interface Message {
  id: string;
  senderId: string;
  receiverId: string;
  content: string;
  timestamp: string;
  read: boolean;
  projectId?: string;
}

export interface LandParcel {
  id: string;
  parcelNumber: string;
  area: number;
  unit: 'sq.m' | 'hectares' | 'acres';
  ownerName: string;
  acquisitionStatus: 'Identified' | 'Negotiation' | 'Acquired' | 'Compensated';
  compensationAmount?: number;
  acquisitionDate?: string;
}

export interface MapOverlay {
  id: string;
  name: string;
  type: 'Alignment' | 'Boundary' | 'Hindrance' | 'Utility';
  coordinates: { lat: number, lng: number }[];
  color: string;
  visible: boolean;
}

export interface KMLData {
  id: string;
  name: string;
  content: string;
  timestamp: number;
  visible: boolean;
}

export interface LinearWorkLog {
  id: string;
  category: string; 
  layer: string;
  startChainage: number;
  endChainage: number;
  date: string;
  side: 'LHS' | 'RHS' | 'Both';
  status: 'In Progress' | 'Completed';
}

export interface Subcontractor {
  id: string;
  name: string;
  trade: string;
  contactPerson: string;
  phone: string;
  email: string;
  address: string;
  status: 'Active' | 'Suspended' | 'Completed';
  contractValue: number;
  startDate: string;
  endDate: string;
  avatar?: string;
  type: 'subcontractor'; // Changed to specific value since subcontractors are structural workers
  rates?: SubcontractorRateEntry[];
  // Structural assets/works related fields
  assignedWorks?: string[]; // Array of BOQ item IDs representing works assigned to this subcontractor
  assetCategories?: string[]; // Categories of assets this subcontractor works on
  certification?: string[]; // Certifications related to structural work
}

export interface ContractBill {
  id: string;
  billNumber: string;
  date: string;
  periodFrom: string;
  periodTo: string;
  grossAmount: number;
  retentionPercent: number;
  netAmount: number;
  status: 'Draft' | 'Submitted' | 'Approved' | 'Paid';
  description: string;
  type?: string;
  location?: string;
  dateOfWorkOrder?: string;
  extendedCompletionDate?: string;
  items: BillItem[];
  provisionalSum: number;
  cpaAmount: number;
  liquidatedDamages: number;
  advancePaymentDeduction?: number;
  subcontractorId?: string;
  
  // IPC-specific fields
  orderOfBill?: number;
  dateOfMeasurement?: string;
  
  // Calculated fields
  billAmountGross?: number;
  billAmountWithCPA?: number;
  billAmountWithoutPS?: number;
  vatAmount?: number;
  totalBillWithVat?: number;
  retentionAmount?: number;
  advanceIncomeTax?: number;
  contractorDevFund?: number;
  deductableVat?: number;
  totalAmountPayable?: number;
}

export interface MeasurementSheetEntry {
  id: string;
  boqItemId: string;
  quantity: number;
  rate: number;
  amount: number;
}

export interface MeasurementSheet {
  id: string;
  sheetNumber: string;
  date: string;
  category: string;
  description: string;
  title?: string;
  measuredBy: string;
  verifiedBy: string;
  totalAmount: number;
  entries: MeasurementSheetEntry[];
  status: 'Draft' | 'Under Review' | 'Approved';
}

export interface StaffLocation {
  id: string;
  userId: string;
  userName: string;
  role: string;
  latitude: number;
  longitude: number;
  status: 'Active' | 'Idle' | 'Offline';
  timestamp: string;
}

export interface Agency {
  id: string;
  name: string;
  trade: string;
  contactPerson: string;
  phone: string;
  email: string;
  address: string;
  status: 'Active' | 'Suspended' | 'Completed';
  contractValue: number;
  startDate: string;
  endDate: string;
  avatar?: string;
  type: 'subcontractor' | 'agency'; // Support both subcontractors and agencies
  rates?: AgencyRateEntry[];
  // Structural assets/works related fields (for subcontractors)
  assignedWorks?: string[]; // Array of BOQ item IDs representing works assigned to this entity
  assetCategories?: string[]; // Categories of assets this entity works on
  certification?: string[]; // Certifications related to work
  // Logistics and material supply related fields (for agencies/vendors)
  materialCategories?: string[];
  deliveryAreas?: string[];
  preferredDeliveryMethods?: string[];
  licenseNumber?: string;
  taxId?: string;
  paymentTerms?: string;
  deliveryLeadTime?: number; // in days
  // Logistics and measurement related fields (for agencies/vendors)
  supplyCategories?: string[]; // Categories of materials supplied
  measurementUnits?: string[]; // Units of measurement typically used
  calibrationCertifications?: string[]; // Certifications for measurement equipment
}

export interface AgencyPayment {
  id: string;
  agencyId: string;
  date: string;
  amount: number;
  reference: string;
  type: 'Bill Payment' | 'Advance' | 'Retention' | 'Final Payment';
  description: string;
  status: 'Draft' | 'Confirmed';
}

export interface AgencyBill {
  id: string;
  agencyId: string;
  billNumber: string;
  date: string;
  periodFrom: string;
  periodTo: string;
  items: AgencyBillItem[];
  grossAmount: number;
  taxAmount?: number;
  netAmount: number;
  status: 'Draft' | 'Submitted' | 'Approved' | 'Paid';
  description?: string;
}

export interface AgencyBillItem {
  id: string;
  materialId: string;
  description: string;
  unit: string;
  quantity: number;
  rate: number;
  amount: number;
}

export interface AgencyRateEntry {
  id: string;
  agencyId: string;
  materialId: string; // Links to specific material that the agency supplies
  boqItemId?: string; // For backwards compatibility
  rate: number;
  effectiveDate: string;
  expiryDate?: string;
  description?: string;
  status: 'Active' | 'Expired' | 'Suspended';
}

export interface BillItem {
  id: string;
  boqItemId: string;
  itemNo: string;
  description: string;
  unit: string;
  contractQuantity: number;
  rate: number;
  previousQuantity: number;
  currentQuantity: number;
  uptoDateQuantity: number;
  previousAmount: number;
  currentAmount: number;
  uptoDateAmount: number;
}

export interface SubcontractorBill {
  id: string;
  billNumber: string;
  date: string;
  periodFrom: string;
  periodTo: string;
  subcontractorId: string;
  items: BillItem[];
  grossAmount: number;
  retentionPercent: number;
  netAmount: number;
  status: 'Draft' | 'Submitted' | 'Approved' | 'Paid';
  description: string;
}

export interface BOQItem {
  id: string;
  itemNo: string;
  description: string;
  unit: string;
  quantity: number;
  rate: number;
  amount: number;
  category: string;
  location: string;
  completedQuantity: number;
  variationQuantity?: number;
  revisedQuantity?: number;
  status?: 'Planned' | 'Executing' | 'Completed';
  subcontractorId?: string;
}

export interface VariationItem {
  id: string;
  boqItemId: string;
  isNewItem: boolean;
  description: string;
  unit: string;
  quantityDelta: number;
  rate: number;
}

export interface VariationOrder {
  id: string;
  voNumber: string;
  title: string;
  date: string;
  status: 'Draft' | 'Submitted' | 'Approved' | 'Rejected' | 'Implemented';
  items: VariationItem[];
  reason: string;
  totalImpact: number;
  approvedDate?: string;
}

export interface EnvironmentRegistry {
  treesRemoved?: number;
  treesPlanted?: number;
  sprinklingLogs: SprinklingLog[];
  treeLogs: TreeLog[];
}

export interface SprinklingLog {
  id: string;
  date: string;
  area: string;
  volume: number;
  unit: 'liters' | 'cubic meters';
  operator: string;
  time?: string;
  location?: string;
  bowserId?: string;
}

export interface TreeLog {
  id: string;
  date: string;
  species: string;
  location: string;
  action: 'Removed' | 'Transplanted' | 'Planted';
  count: number;
  survivalRate?: number;
  chainage?: string;
  removedCount?: number;
  plantedCount?: number;
  targetPlant?: number;
}

export interface DashboardWidget {
  id: string;
  title: string;
  visible: boolean;
  position: number;
}

export interface AppSettings {
  companyName: string;
  currency: string;
  vatRate: number;
  fiscalYearStart: string;
  googleSpreadsheetId: string;
  timezone?: string;
  dateFormat?: string;
  backupEnabled?: boolean;
  backupFrequency?: string;
  notifications: {
    enableEmail: boolean;
    enableInApp: boolean;
    notifyUpcoming: boolean;
    daysBefore: number;
    notifyOverdue: boolean;
    dailyDigest: boolean;
  };
  dashboardWidgets?: DashboardWidget[];
}

export interface WeatherInfo {
  temp: number;
  condition: string;
  description: string;
  humidity: number;
  windSpeed: number;
  icon: 'Sun' | 'Cloud' | 'CloudFog' | 'CloudRain' | 'CloudSnow' | 'CloudLightning';
  lastUpdated: string;
  forecast?: { day: string, temp: number, condition: string }[];
  // Scheduling-relevant information
  workableConditions: boolean; // Whether conditions are suitable for outdoor work
  riskFactors: {
    precipitation: number; // 0-100 percentage chance
    wind: number; // 0-100 risk level
    temperature: number; // 0-100 risk level
    visibility: number; // 0-100 risk level
  };
  recommendations: string[]; // Recommendations for scheduling
  impactOnSchedule: 'None' | 'Minor' | 'Moderate' | 'Severe'; // Impact on construction activities
}

export interface Project {
  id: string;
  name: string;
  code: string;
  location: string;
  contractor: string;
  startDate: string;
  endDate: string;
  contractPeriod?: string;
  projectManager?: string;
  supervisor?: string;
  consultantName?: string;
  clientName?: string;
  logo?: string;
  client: string;
  engineer?: string;
  contractNo?: string;
  boq: BOQItem[];
  variationOrders?: VariationOrder[];
  rfis: RFI[];
  labTests: LabTest[];
  schedule: ScheduleTask[];
  structures?: StructureAsset[];
  agencies?: Agency[];
  // Added agencyPayments property
  agencyPayments?: AgencyPayment[];
  // Added agency materials and bills properties
  agencyMaterials?: AgencyMaterial[];
  agencyBills?: AgencyBill[];
  materials?: Material[];
  // Legacy subcontractorPayments property
  subcontractorPayments?: SubcontractorPayment[];
  linearWorks?: LinearWorkLog[];
  inventory: InventoryItem[];
  purchaseOrders?: PurchaseOrder[];
  inventoryTransactions: InventoryTransaction[];
  vehicles: Vehicle[];
  vehicleLogs: VehicleLog[];
  documents: ProjectDocument[];
  sitePhotos?: SitePhoto[];
  dailyReports: DailyReport[];
  preConstruction: PreConstructionTask[];
  preConstructionTasks?: PreConstructionTask[];
  landParcels: LandParcel[];
  mapOverlays: MapOverlay[];
  kmlData?: KMLData[]; // KML files and layers specific to this project
  hindrances: any[];
  ncrs: NCR[];
  contractBills: ContractBill[];
  subcontractorBills?: SubcontractorBill[];
  measurementSheets: MeasurementSheet[];
  staffLocations: StaffLocation[];
  environmentRegistry?: EnvironmentRegistry;
  // Added weather property
  weather?: WeatherInfo;
  lastSynced?: string;
  spreadsheetId?: string;
  settings?: AppSettings;
  resources?: ResourceMatrix[];
  resourceAllocations?: ResourceAllocation[];
  milestones?: Milestone[];
  comments?: Comment[];
  checklists?: Checklist[];
  defects?: Defect[];
  complianceWorkflows?: ComplianceWorkflow[];
  auditLogs?: AuditLog[];
  structureTemplates?: StructureTemplate[];
  accountingIntegrations?: AccountingIntegration[];
  accountingTransactions?: AccountingTransaction[];
  personnel?: any[];
  fleet?: any[];
}

export interface SubcontractorRateEntry {
  id: string;
  subcontractorId: string;
  boqItemId: string;
  rate: number;
  effectiveDate: string;
  expiryDate?: string;
  description?: string;
  status: 'Active' | 'Expired' | 'Suspended';
}

export interface SubcontractorPayment {
  id: string;
  subcontractorId: string;
  date: string;
  amount: number;
  reference: string;
  type: 'Bill Payment' | 'Advance' | 'Retention' | 'Final Payment';
  description: string;
  status: 'Draft' | 'Confirmed';
}

export interface POItem {
  itemId: string;
  itemName: string;
  quantity: number;
  unitPrice: number;
}

export interface PurchaseOrder {
  id: string;
  poNumber: string;
  date: string;
  vendor: string;
  items: POItem[];
  totalAmount: number;
  status: 'Draft' | 'Issued' | 'Received' | 'Completed';
  deliveryDate?: string;
}

export interface SitePhoto {
  id: string;
  date: string;
  caption: string;
  location: string;
  category: 'Earthwork' | 'Structures' | 'Pavement' | 'General' | 'Safety';
  url: string;
  aiAnalysis?: string;
  isAnalyzed: boolean;
}

export interface ResourceMatrix {
  id: string;
  name: string;
  type: 'Material' | 'Labor' | 'Equipment' | 'Subcontractor';
  category: string;
  unit: string;
  unitCost: number;
  totalQuantity: number;
  availableQuantity: number;
  allocatedQuantity: number;
  status: 'Available' | 'Allocated' | 'In Transit' | 'Reserved';
  location?: string;
  supplier?: string;
  leadTime?: number; // in days
  reorderLevel?: number;
  criticality: 'Low' | 'Medium' | 'High' | 'Critical';
  projectId?: string;
  allocatedTo?: string[]; // IDs of tasks/projects it's allocated to
  lastUpdated: string;
  notes?: string;
}

export interface ResourceAllocation {
  id: string;
  resourceId: string;
  resourceType: 'Material' | 'Labor' | 'Equipment' | 'Subcontractor';
  allocatedTo: string; // Task ID, Project ID, etc.
  allocatedQuantity: number;
  startDate: string;
  endDate: string;
  status: 'Planned' | 'In Progress' | 'Completed' | 'Cancelled';
  notes?: string;
}

export interface Milestone {
  id: string;
  name: string;
  description: string;
  date: string;
  status: 'Planned' | 'In Progress' | 'Completed' | 'Missed';
  priority: 'Low' | 'Medium' | 'High' | 'Critical';
  linkedTaskId?: string; // Optional link to a specific task
  completedDate?: string;
  notes?: string;
}

export interface AccountingIntegration {
  id: string;
  name: string; // Name of the accounting software (e.g., QuickBooks, SAP, Tally)
  type: 'QuickBooks' | 'SAP' | 'Tally' | 'Xero' | 'Other';
  status: 'Connected' | 'Disconnected' | 'Pending';
  apiKey?: string;
  apiSecret?: string;
  companyId?: string; // Company ID in the accounting system
  settings: {
    autoSync: boolean; // Whether to automatically sync transactions
    syncFrequency: 'real-time' | 'hourly' | 'daily' | 'weekly';
    lastSync?: string; // Timestamp of last sync
    billSyncEnabled: boolean; // Whether to sync bills/invoices
    paymentSyncEnabled: boolean; // Whether to sync payments
    expenseSyncEnabled: boolean; // Whether to sync expenses
  };
  connectedDate: string;
  lastUpdated: string;
}

export interface AccountingTransaction {
  id: string;
  accountingId?: string; // ID in the accounting system
  type: 'Invoice' | 'Bill' | 'Payment' | 'Expense' | 'Credit Note' | 'Journal Entry';
  amount: number;
  currency: string;
  date: string;
  reference: string; // Reference number from our system
  description: string;
  vendorOrCustomer?: string;
  category?: string;
  projectId?: string;
  synced: boolean;
  syncedAt?: string;
  syncError?: string;
}

// === BASE TYPE DEFINITIONS ===

// Base resource type that can be extended by specific resource types
export interface BaseResource {
  id: string;
  name: string;
  description?: string;
  category?: string;
  unit: string;
  quantity: number;
  location: string;
  status: string;
  lastUpdated: string;
}

// Base logistics type for transportation and delivery fields
export interface LogisticsFields {
  deliveryLocation?: string;
  transportMode?: string;
  driverName?: string;
  vehicleNumber?: string;
  deliveryCharges?: number;
  taxAmount?: number;
  batchNumber?: string;
  expiryDate?: string;
  qualityCertification?: string;
  supplierInvoiceRef?: string;
  orderedDate?: string;
  expectedDeliveryDate?: string;
  deliveryDate?: string;
}

// Base supplier information type
export interface SupplierInfo {
  supplierId?: string;
  supplierName?: string;
  supplierRate?: number;
  rateHistory?: MaterialRateEntry[];
}

// Consolidated status enums
export enum ResourceStatus {
  AVAILABLE = 'Available',
  LOW_STOCK = 'Low Stock',
  OUT_OF_STOCK = 'Out of Stock',
  DISCONTINUED = 'Discontinued',
  ALLOCATED = 'Allocated',
  IN_TRANSIT = 'In Transit',
  RESERVED = 'Reserved',
  RECEIVED = 'Received',
  PENDING = 'Pending',
  VERIFIED = 'Verified',
  ORDERED = 'Ordered',
  DELIVERED = 'Delivered',
  COMPLETED = 'Completed',
  ACTIVE = 'Active',
  MAINTENANCE = 'Maintenance',
  IDLE = 'Idle',
  SUSPENDED = 'Suspended'
}

export enum ResourceType {
  MATERIAL = 'Material',
  LABOR = 'Labor',
  EQUIPMENT = 'Equipment',
  SUBCONTRACTOR = 'Subcontractor'
}

export enum EntityStatus {
  DRAFT = 'Draft',
  SUBMITTED = 'Submitted',
  APPROVED = 'Approved',
  PAID = 'Paid',
  COMPLETED = 'Completed',
  RECEIVED = 'Received',
  ISSUED = 'Issued',
  CANCELLED = 'Cancelled'
}

// Generic resource interface that can be used across modules
export interface GenericResource<T = any> {
  id: string;
  type: ResourceType;
  subtype?: string; // More specific type classification
  name: string;
  description?: string;
  category?: string;
  unit: string;
  quantity: number;
  availableQuantity: number;
  unitCost?: number;
  totalValue?: number;
  location: string;
  status: ResourceStatus;
  metadata?: T; // Type-specific additional data
  supplierInfo?: SupplierInfo;
  logisticsInfo?: LogisticsFields;
  lastUpdated: string;
  createdDate: string;
  tags?: string[];
  notes?: string;
}

// === UNIFIED RESOURCE TYPES ===

// Unified Material type that combines all resource-related fields
export interface Material {
  id: string;
  name: string;
  description?: string;
  category?: string;
  unit: string;
  quantity: number;
  location: string;
  lastUpdated: string;
  availableQuantity: number;
  reservedQuantity?: number;
  unitCost?: number;
  totalValue?: number;
  reorderLevel: number;
  maxStockLevel?: number;
  status: 'Available' | 'Low Stock' | 'Out of Stock' | 'Discontinued';
  criticality?: 'High' | 'Medium' | 'Low';
  leadTime?: number;
  notes?: string;
  tags?: string[];
  // LogisticsFields
  deliveryLocation?: string;
  transportMode?: string;
  driverName?: string;
  vehicleNumber?: string;
  deliveryCharges?: number;
  taxAmount?: number;
  batchNumber?: string;
  expiryDate?: string;
  qualityCertification?: string;
  supplierInvoiceRef?: string;
  orderedDate?: string;
  expectedDeliveryDate?: string;
  deliveryDate?: string;
  // SupplierInfo
  supplierId?: string;
  supplierName?: string;
  supplierRate?: number;
  rateHistory?: MaterialRateEntry[];
}

// Unified Vehicle/Equipment type
export interface Vehicle {
  id: string;
  name: string;
  description?: string;
  category?: string;
  unit: string;
  quantity: number;
  location: string;
  lastUpdated: string;
  plateNumber: string;
  type: string;
  status: 'Active' | 'Maintenance' | 'Idle';
  driver: string;
  agencyId?: string;
  chainage?: string;
  geofenceStatus?: 'Inside' | 'Outside';
  gpsLocation?: {
    latitude: number;
    longitude: number;
    timestamp: string;
    accuracy?: number;
    speed?: number;
    heading?: number;
  };
  lastKnownLocation?: {
    latitude: number;
    longitude: number;
    timestamp: string;
  };
}

// Unified Inventory type
export interface InventoryItem {
  id: string;
  name: string; // Alias for itemName
  description?: string;
  category?: string;
  unit: string;
  quantity: number;
  location: string;
  status: string;
  lastUpdated: string;
  itemName: string; // Main identifier field (keeping backward compatibility)
  reorderLevel: number;
  requiredQuantity?: number;
  receivedQuantity?: number;
  currentQuantity?: number;
  // name is inherited from BaseResource and will be used as alias to itemName
}

// Agency Material type (standalone interface for agency-specific materials)
export interface AgencyMaterial {
  id: string;
  name: string;
  description?: string;
  category?: string;
  unit: string;
  quantity: number;
  location: string;
  lastUpdated: string;
  // LogisticsFields
  deliveryLocation?: string;
  transportMode?: string;
  driverName?: string;
  vehicleNumber?: string;
  deliveryCharges?: number;
  taxAmount?: number;
  batchNumber?: string;
  expiryDate?: string;
  qualityCertification?: string;
  supplierInvoiceRef?: string;
  orderedDate?: string;
  expectedDeliveryDate?: string;
  deliveryDate?: string;
  // AgencyMaterial specific fields
  agencyId: string;
  materialName: string;
  rate: number;
  totalAmount: number;
  receivedDate: string;
  invoiceNumber?: string;
  remarks?: string;
  status: 'Received' | 'Pending' | 'Verified' | 'In Transit' | 'Ordered' | 'Delivered';
}

export interface MaterialRateEntry {
  id: string;
  materialId: string;
  supplierId: string;
  rate: number;
  effectiveDate: string;
  expiryDate?: string;
  description?: string;
  status: 'Active' | 'Expired' | 'Suspended';
}
