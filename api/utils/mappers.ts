import type { MongoUser } from './mongoAuth.js';
import { isUuid } from './uuidUtils.js';

/**
 * Helper to normalize database roles to UserRole enum values
 */
function normalizeRole(role: string): string {
  if (!role) return 'Site Engineer';
  
  // Convert to UPPER_SNAKE_CASE for consistent comparison
  const r = role.toUpperCase().trim().replace(/\s+/g, '_');
  
  switch (r) {
    case 'ADMIN': return 'Admin';
    case 'PROJECT_MANAGER': return 'Project Manager';
    case 'SITE_ENGINEER': return 'Site Engineer';
    case 'LAB_TECHNICIAN': return 'Lab Technician';
    case 'HSE_OFFICER': return 'HSE Officer';
    case 'SUBCONTRACTOR': return 'Subcontractor';
    case 'SUPERVISOR': return 'Supervisor';
    default: return 'Site Engineer';
  }
}

/**
 * USER MAPPERS
 */
export function mapUserFromDb(user: any | null): any {
  if (!user) return null;

  // Detect if user is from Supabase (has id) or MongoDB (has _id)
  const isSupabase = !!user.id && !user._id;
  
  if (isSupabase) {
    return {
      id: user.id,
      email: user.email,
      name: user.full_name || 'User',
      full_name: user.full_name,
      role: normalizeRole(user.role),
      avatar_url: user.avatar_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(user.full_name || 'User')}&background=random`,
      last_seen: user.last_seen || null,
    };
  }

  // Legacy MongoDB Mapping
  const { passwordHash, ...safeUser } = user;
  return {
    ...safeUser,
    id: user._id,
    name: user.full_name || 'User',
    role: normalizeRole(user.role),
    last_seen: user.last_seen || null,
    avatar_url: user.avatar_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(user.full_name || 'User')}&background=random`,
  };
}

export function mapUsersFromDb(users: MongoUser[]): any[] {
  return users.map(mapUserFromDb);
}

/**
 * PROJECT MAPPERS
 */
export function mapProjectFromDb(dbProj: any): any {
  if (!dbProj) return null;
  
  // Start with everything from DB
  const mapped = { ...dbProj };
  
  // Ensure camelCase fields for frontend from snake_case DB columns
  mapped.id = dbProj.id;
  mapped.contractNo = dbProj.contract_no || dbProj.contractNo || dbProj.contractno;
  mapped.ownerId = dbProj.owner_id || dbProj.ownerId || dbProj.ownerid;
  mapped.startDate = dbProj.startDate || dbProj.start_date || dbProj.startdate;
  mapped.endDate = dbProj.endDate || dbProj.end_date || dbProj.enddate;
  mapped.createdAt = dbProj.createdAt || dbProj.created_at || dbProj.createdat;
  mapped.updatedAt = dbProj.updatedAt || dbProj.updated_at || dbProj.updatedat;
  
  // Ensure all required arrays/objects exist (safety fallbacks)
  mapped.boq = dbProj.boq || [];
  mapped.variationOrders = dbProj.variation_orders || dbProj.variationOrders || [];
  mapped.rfis = dbProj.rfis || [];
  mapped.labTests = dbProj.lab_tests || dbProj.labTests || [];
  mapped.schedule = dbProj.schedule || [];
  mapped.structures = dbProj.structures || [];
  mapped.agencies = dbProj.agencies || [];
  mapped.agencyPayments = dbProj.agency_payments || dbProj.agencyPayments || [];
  mapped.agencyMaterials = dbProj.agency_materials || dbProj.agencyMaterials || [];
  mapped.agencyBills = dbProj.agency_bills || dbProj.agencyBills || [];
  mapped.materials = dbProj.materials || [];
  mapped.linearWorks = dbProj.linear_works || dbProj.linearWorks || [];
  mapped.inventory = dbProj.inventory || [];
  mapped.purchaseOrders = dbProj.purchase_orders || dbProj.purchaseOrders || [];
  mapped.inventoryTransactions = dbProj.inventory_transactions || dbProj.inventoryTransactions || [];
  mapped.vehicles = dbProj.vehicles || [];
  mapped.vehicleLogs = dbProj.vehicle_logs || dbProj.vehicleLogs || [];
  mapped.dailyReports = dbProj.daily_reports || dbProj.dailyReports || [];
  mapped.preConstruction = dbProj.pre_construction || dbProj.preConstruction || [];
  mapped.landParcels = dbProj.land_parcels || dbProj.landParcels || [];
  mapped.mapOverlays = dbProj.map_overlays || dbProj.mapOverlays || [];
  mapped.ncrs = dbProj.ncrs || [];
  mapped.contractBills = dbProj.contract_bills || dbProj.contractBills || [];
  mapped.measurementSheets = dbProj.measurement_sheets || dbProj.measurementSheets || [];
  mapped.staffLocations = dbProj.staff_locations || dbProj.staffLocations || [];
  mapped.environmentRegistry = dbProj.environment_registry || dbProj.environmentRegistry || { sprinklingLogs: [], treeLogs: [] };
  mapped.accountingIntegrations = dbProj.accountingintegrations || dbProj.accounting_integrations || dbProj.accountingIntegrations || [];
  mapped.accountingTransactions = dbProj.accountingtransactions || dbProj.accounting_transactions || dbProj.accountingTransactions || [];
  mapped.structureTemplates = dbProj.structuretemplates || dbProj.structure_templates || dbProj.structureTemplates || [];
  mapped.auditLogs = dbProj.auditlogs || dbProj.audit_logs || dbProj.auditLogs || [];
  mapped.personnel = dbProj.personnel || {};

  // Map joined documents and photos if they exist
  mapped.documents = (dbProj.project_documents || dbProj.documents || []).map((d: any) => ({
    id: d.id,
    projectId: d.project_id || d.projectId,
    name: d.name,
    folder: d.folder,
    tags: d.tags || [],
    subject: d.subject,
    refNo: d.ref_no || d.refNo,
    size: d.size,
    type: d.type,
    status: d.status,
    metadata: d.metadata,
    currentVersion: d.current_version || d.currentVersion || 1,
    fileUrl: `/api/files?id=${d.id}`,
    versions: (d.document_versions || d.versions || []).map((v: any) => ({
      id: v.id,
      version: v.version_num || v.version,
      date: v.created_at || v.date,
      size: v.size ? `${(v.size / 1024 / 1024).toFixed(2)} MB` : '0 MB',
      filePath: `/api/files?id=${v.id}`,
      uploadedBy: v.uploaded_by || 'System'
    })),
    updatedAt: d.updated_at || d.updatedAt
  }));

  mapped.sitePhotos = (dbProj.project_site_photos || dbProj.sitePhotos || []).map((p: any) => ({
    id: p.id,
    url: p.url,
    caption: p.caption,
    date: p.created_at || p.date,
    uploadedBy: p.uploaded_by || p.uploadedBy,
    location: p.location_lat ? { lat: p.location_lat, lng: p.location_lng } : (p.location || null)
  }));

  return mapped;
}

export function mapProjectToDb(proj: any): any {
  if (!proj) return null;
  const out: any = {
    id: proj.id,
    name: proj.name,
    client: proj.client,
    contract_no: proj.contractNo,
    // Use lowercase column names as Postgres folds unquoted identifiers to lowercase.
    location: proj.location,
    status: proj.status,
    budget: proj.budget,
    start_date: proj.startDate,
    end_date: proj.endDate,
    created_at: proj.createdAt,
    updated_at: proj.updatedAt,
    description: proj.description,
    metadata: proj.metadata,
    contractor: proj.contractor,
    personnel: proj.personnel
  };

  if (proj.ownerId && isUuid(proj.ownerId)) {
    out.owner_id = proj.ownerId;
  } else {
    // If not a valid UUID, let Supabase handle it or set to null
    out.owner_id = null;
  }

  return out;
}

/**
 * AUDIT LOG MAPPERS
 */
export function mapAuditLogFromDb(dbLog: any): any {
  if (!dbLog) return null;
  return {
    id: dbLog.id,
    userId: dbLog.user_id,
    userName: dbLog.user_name,
    action: dbLog.action,
    entityType: dbLog.entity_type,
    entityId: dbLog.entity_id,
    entityName: dbLog.entity_name,
    severity: dbLog.severity,
    metadata: dbLog.metadata,
    timestamp: dbLog.timestamp
  };
}

export function mapAuditLogToDb(log: any): any {
  if (!log) return null;
  return {
    user_id: log.userId,
    user_name: log.userName,
    action: log.action,
    entity_type: log.entityType,
    entity_id: log.entityId,
    entity_name: log.entityName,
    severity: log.severity,
    metadata: log.metadata,
    timestamp: log.timestamp
  };
}

/**
 * DOCUMENT MAPPERS
 */
export function mapProjectDocumentToDb(doc: any): any {
  if (!doc) return null;
  return {
    id: doc.id,
    project_id: doc.projectId,
    name: doc.name,
    folder: doc.folder,
    tags: doc.tags,
    subject: doc.subject,
    ref_no: doc.refNo,
    size: doc.size,
    type: doc.type,
    status: doc.status,
    metadata: doc.metadata,
    updated_at: doc.updatedAt
  };
}

export function mapDocumentVersionFromDb(dbVer: any): any {
  if (!dbVer) return null;
  return {
    id: dbVer.id,
    docId: dbVer.doc_id,
    filePath: dbVer.blob_url,
    versionNum: dbVer.version_num,
    size: dbVer.size,
    notes: dbVer.notes,
    createdAt: dbVer.created_at
  };
}
