// api/_utils/mysqlConnect.ts
import { Sequelize, DataTypes, Model, CreationAttributes, Optional } from 'sequelize';

// Define the MySQL connection string from environment variables
const mysqlUri = process.env.MYSQL_URI;

if (!mysqlUri) {
  console.error('MYSQL_URI environment variable is not defined!');
  throw new Error('MYSQL_URI environment variable is not defined!');
}

const sequelize = new Sequelize(mysqlUri, {
  dialect: 'mysql',
  logging: false, // Set to true to see SQL queries in console
  dialectOptions: {
    // You might need to add SSL options if connecting to a cloud database
    // ssl: {
    //   require: true,
    //   rejectUnauthorized: false,
    // },
  },
});

// Define Models

export interface UserAttributes {
  id: string;
  name: string;
  email: string;
  phone?: string;
  password?: string; // Password might not always be selected
  role: string;
  avatar?: string;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface UserCreationAttributes extends Optional<UserAttributes, 'id' | 'createdAt' | 'updatedAt'> {}
export interface UserInstance extends Model<UserAttributes, UserCreationAttributes>, UserAttributes {}

// User Model
class User extends Model<UserAttributes, UserInstance> {}
User.init({
  id: {
    type: DataTypes.STRING,
    primaryKey: true,
    unique: true,
  },
  name: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  email: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true,
  },
  phone: {
    type: DataTypes.STRING,
  },
  password: { // Store hashed password
    type: DataTypes.STRING,
    allowNull: false,
  },
  role: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  avatar: {
    type: DataTypes.STRING,
  },
  createdAt: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW,
  },
  updatedAt: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW,
  },
}, {
  sequelize,
  modelName: 'User',
  tableName: 'users',
  timestamps: true // Sequelize will manage createdAt/updatedAt
});

export interface PendingRegistrationAttributes {
  id: string;
  name: string;
  email: string;
  phone?: string;
  requestedRole: string;
  status?: string;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface PendingRegistrationCreationAttributes extends Optional<PendingRegistrationAttributes, 'id' | 'status' | 'createdAt' | 'updatedAt'> {}
export interface PendingRegistrationInstance extends Model<PendingRegistrationAttributes, PendingRegistrationCreationAttributes>, PendingRegistrationAttributes {}

// PendingRegistration Model
class PendingRegistration extends Model<PendingRegistrationAttributes, PendingRegistrationInstance> {}
PendingRegistration.init({
  id: {
    type: DataTypes.STRING,
    primaryKey: true,
    unique: true,
  },
  name: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  email: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true,
  },
  phone: {
    type: DataTypes.STRING,
  },
  requestedRole: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  status: {
    type: DataTypes.STRING,
    defaultValue: 'pending',
  },
  createdAt: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW,
  },
  updatedAt: { // Add updatedAt for consistency
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW,
  },
}, {
  sequelize,
  modelName: 'PendingRegistration',
  tableName: 'pending_registrations',
  timestamps: true
});

export interface ProjectAttributes {
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

  boq?: any; // Using any for complex JSON types for simplicity
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

export interface ProjectCreationAttributes extends Optional<ProjectAttributes, 'id' | 'createdAt' | 'updatedAt'> {}
export interface ProjectInstance extends Model<ProjectAttributes, ProjectCreationAttributes>, ProjectAttributes {}

// Project Model (complex types stored as JSON)
class Project extends Model<ProjectAttributes, ProjectInstance> {}
Project.init({
  id: { type: DataTypes.STRING, primaryKey: true, unique: true },
  name: { type: DataTypes.STRING, allowNull: false },
  code: DataTypes.STRING,
  location: DataTypes.STRING,
  contractor: DataTypes.STRING,
  startDate: DataTypes.DATE,
  endDate: DataTypes.DATE,
  contractPeriod: DataTypes.STRING,
  projectManager: DataTypes.STRING,
  supervisor: DataTypes.STRING,
  consultantName: DataTypes.STRING,
  clientName: DataTypes.STRING,
  logo: DataTypes.STRING,
  client: { type: DataTypes.STRING, allowNull: false },
  engineer: DataTypes.STRING,
  contractNo: DataTypes.STRING,

  // Complex types stored as JSON
  boq: { type: DataTypes.JSON, defaultValue: [] },
  variationOrders: { type: DataTypes.JSON, defaultValue: [] },
  rfis: { type: DataTypes.JSON, defaultValue: [] },
  labTests: { type: DataTypes.JSON, defaultValue: [] },
  schedule: { type: DataTypes.JSON, defaultValue: [] },
  structures: { type: DataTypes.JSON, defaultValue: [] },
  agencies: { type: DataTypes.JSON, defaultValue: [] },
  agencyPayments: { type: DataTypes.JSON, defaultValue: [] },
  agencyMaterials: { type: DataTypes.JSON, defaultValue: [] },
  agencyBills: { type: DataTypes.JSON, defaultValue: [] },
  materials: { type: DataTypes.JSON, defaultValue: [] },
  subcontractorPayments: { type: DataTypes.JSON, defaultValue: [] },
  linearWorks: { type: DataTypes.JSON, defaultValue: [] },
  inventory: { type: DataTypes.JSON, defaultValue: [] },
  purchaseOrders: { type: DataTypes.JSON, defaultValue: [] },
  inventoryTransactions: { type: DataTypes.JSON, defaultValue: [] },
  vehicles: { type: DataTypes.JSON, defaultValue: [] },
  vehicleLogs: { type: DataTypes.JSON, defaultValue: [] },
  documents: { type: DataTypes.JSON, defaultValue: [] },
  sitePhotos: { type: DataTypes.JSON, defaultValue: [] },
  dailyReports: { type: DataTypes.JSON, defaultValue: [] },
  preConstruction: { type: DataTypes.JSON, defaultValue: [] },
  preConstructionTasks: { type: DataTypes.JSON, defaultValue: [] },
  landParcels: { type: DataTypes.JSON, defaultValue: [] },
  mapOverlays: { type: DataTypes.JSON, defaultValue: [] },
  kmlData: { type: DataTypes.JSON, defaultValue: [] },
  hindrances: { type: DataTypes.JSON, defaultValue: [] },
  ncrs: { type: DataTypes.JSON, defaultValue: [] },
  contractBills: { type: DataTypes.JSON, defaultValue: [] },
  subcontractorBills: { type: DataTypes.JSON, defaultValue: [] },
  measurementSheets: { type: DataTypes.JSON, defaultValue: [] },
  staffLocations: { type: DataTypes.JSON, defaultValue: [] },
  environmentRegistry: { type: DataTypes.JSON, defaultValue: {} },
  weather: { type: DataTypes.JSON, defaultValue: {} },
  lastSynced: DataTypes.STRING,
  spreadsheetId: DataTypes.STRING,
  settings: { type: DataTypes.JSON, defaultValue: {} },
  resources: { type: DataTypes.JSON, defaultValue: [] },
  resourceAllocations: { type: DataTypes.JSON, defaultValue: [] },
  milestones: { type: DataTypes.JSON, defaultValue: [] },
  comments: { type: DataTypes.JSON, defaultValue: [] },
  checklists: { type: DataTypes.JSON, defaultValue: [] },
  defects: { type: DataTypes.JSON, defaultValue: [] },
  complianceWorkflows: { type: DataTypes.JSON, defaultValue: [] },
  auditLogs: { type: DataTypes.JSON, defaultValue: [] },
  structureTemplates: { type: DataTypes.JSON, defaultValue: [] },
  accountingIntegrations: { type: DataTypes.JSON, defaultValue: [] },
  accountingTransactions: { type: DataTypes.JSON, defaultValue: [] },
  personnel: { type: DataTypes.JSON, defaultValue: [] },
  fleet: { type: DataTypes.JSON, defaultValue: [] },
  createdAt: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
  updatedAt: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
}, {
  sequelize,
  modelName: 'Project',
  tableName: 'projects',
  timestamps: true
});


export async function connectToDatabase() {
  try {
    await sequelize.authenticate();
    console.log('MySQL connection has been established successfully.');
    
    // Synchronize all models
    // `alter: true` will update table schemas without dropping them
    // Use `force: true` only in development to drop and recreate tables on every sync
    await sequelize.sync({ alter: true }); 
    console.log('All models were synchronized successfully.');

    return { sequelize, User, PendingRegistration, Project };
  } catch (error) {
    console.error('Unable to connect to the database:', error);
    throw error;
  }
}