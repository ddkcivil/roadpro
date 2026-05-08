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
      avatar: user.avatar_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(user.full_name || 'User')}&background=random`,
      phone: user.phone || '',
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
  
  // Extract code, engineer and consultant from metadata if they don't exist at top level
  mapped.code = dbProj.code || dbProj.metadata?.code || '';
  mapped.engineer = dbProj.engineer || dbProj.metadata?.engineer || '';
  mapped.consultantName = dbProj.consultantName || dbProj.metadata?.consultantName || '';
  
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
  
  const out: any = {};
  
  // Basic Fields
  if (proj.id !== undefined) out.id = proj.id;
  if (proj.name !== undefined) out.name = proj.name;
  if (proj.client !== undefined) out.client = proj.client;
  
  // Mapped Fields (camelCase to snake_case)
  if (proj.contractNo !== undefined || proj.contract_no !== undefined) {
    out.contract_no = proj.contractNo !== undefined ? proj.contractNo : proj.contract_no;
  }
  
  if (proj.location !== undefined) out.location = proj.location;
  if (proj.status !== undefined) out.status = proj.status;
  if (proj.budget !== undefined) out.budget = proj.budget;
  
  if (proj.startDate !== undefined || proj.start_date !== undefined) {
    out.start_date = proj.startDate !== undefined ? proj.startDate : proj.start_date;
  }
  
  if (proj.endDate !== undefined || proj.end_date !== undefined) {
    out.end_date = proj.endDate !== undefined ? proj.endDate : proj.end_date;
  }
  
  if (proj.createdAt !== undefined || proj.created_at !== undefined) {
    out.created_at = proj.createdAt !== undefined ? proj.createdAt : proj.created_at;
  }
  
  if (proj.updatedAt !== undefined || proj.updated_at !== undefined) {
    out.updated_at = proj.updatedAt !== undefined ? proj.updatedAt : proj.updated_at;
  }
  
  if (proj.description !== undefined) out.description = proj.description;
  if (proj.contractor !== undefined) out.contractor = proj.contractor;

// Complex / JSONB Fields
  if (proj.metadata !== undefined) {
    out.metadata = {
      ...(proj.metadata || {}),
      code: proj.code !== undefined ? proj.code : proj.metadata?.code,
      engineer: proj.engineer !== undefined ? proj.engineer : proj.metadata?.engineer,
      consultantName: proj.consultantName !== undefined ? proj.consultantName : proj.metadata?.consultantName
    };
  } else if (proj.code !== undefined || proj.engineer !== undefined || proj.consultantName !== undefined) {
    // If metadata is not provided but code/engineer/consultant are, handle it
    out.metadata = {
      code: proj.code,
      engineer: proj.engineer,
      consultantName: proj.consultantName
    };
  }

  // BOQ Items - explicitly map to JSONB column (fixes Excel import not saving)
  if (proj.boq !== undefined) {
    out.boq = proj.boq;
  }

  // Variation Orders - explicitly map to JSONB column
  if (proj.variationOrders !== undefined) {
    out.variation_orders = proj.variationOrders;
  }

  // Measurement Sheets - explicitly map to JSONB column
  if (proj.measurementSheets !== undefined) {
    out.measurement_sheets = proj.measurementSheets;
  }

  // Handle owner_id with UUID validation
  const ownerId = proj.ownerId !== undefined ? proj.ownerId : proj.owner_id;
  if (ownerId !== undefined) {
    if (ownerId && isUuid(ownerId)) {
      out.owner_id = ownerId;
    } else if (ownerId === null) {
      out.owner_id = null;
    }
  }

// Include other confirmed JSONB columns - map both camelCase and snake_case inputs to snake_case for Supabase
const confirmedJsonbColumns = [
    'roads', 'accountingintegrations', 'accountingtransactions', 
    'structuretemplates', 'auditlogs'
  ];
  
  confirmedJsonbColumns.forEach(col => {
    // Generate the camelCase version for checking
    const camelCol = col.replace(/_([a-z])/g, (g) => g[1].toUpperCase());
    // Also generate pure camelCase for cases like accountingIntegrations -> accountingIntegrations
    const pureCamelCol = col.replace(/_([a-z])/g, (g) => g[1].toUpperCase());
    // Check for snake_case input first, then camelCase input
    if (proj[col] !== undefined) {
      out[col] = proj[col];
    } else if (proj[camelCol] !== undefined) {
      out[col] = proj[camelCol];
    } else if (proj[pureCamelCol] !== undefined) {
      out[col] = proj[pureCamelCol];
    }
// For accounting integrations and transactions (using correct column names without underscores)
    else if (col === 'accountingintegrations' && proj.AccountingIntegration !== undefined) {
      out[col] = proj.AccountingIntegration;
    }
    else if (col === 'accountingtransactions' && proj.AccountingTransaction !== undefined) {
      out[col] = proj.AccountingTransaction;
    }
  });

  // Map ALL remaining array fields that should be stored as JSONB
  const allArrayFields = [
    'rfis', 'lab_tests', 'schedule', 'structures', 'agencies', 
    'agency_payments', 'agency_materials', 'agency_bills', 'materials',
    'linear_works', 'inventory', 'purchase_orders', 'inventory_transactions',
    'vehicles', 'vehicle_logs', 'daily_reports', 'pre_construction',
    'land_parcels', 'map_overlays', 'ncrs', 'contract_bills',
    'staff_locations', 'environment_registry'
  ];
  
  allArrayFields.forEach(field => {
    const camelField = field.replace(/_([a-z])/g, (g) => g[1].toUpperCase());
    if (proj[field] !== undefined) {
      out[field] = proj[field];
    } else if (proj[camelField] !== undefined) {
      out[field] = proj[camelField];
    }
  });

// NOTE: documents and site_photos are stored in separate tables (project_documents, project_site_photos)
  // NOT as columns in the projects table. Do NOT map them here.
  // They are managed separately via the files API.

  // Map owner_id (already handled above, but ensure it uses the auth user ID)
  if (proj.ownerId !== undefined) {
    out.owner_id = proj.ownerId;
  } else if (proj.owner_id !== undefined) {
    out.owner_id = proj.owner_id;
  }

return out;
}

/**
 * DOCUMENT MAPPERS
 */
export function mapDocumentVersionFromDb(doc: any): any {
  if (!doc) return null;
  return {
    id: doc.id,
    docId: doc.doc_id || doc.docId,
    blobUrl: doc.blob_url || doc.blobUrl,
    filePath: doc.blob_url || doc.blobUrl,
    versionNum: doc.version_num || doc.versionNum,
    size: doc.size,
    notes: doc.notes,
    createdAt: doc.created_at || doc.createdAt
  };
}

export function mapProjectDocumentToDb(doc: any): any {
  if (!doc) return null;
  return {
    id: doc.id,
    project_id: doc.projectId || doc.project_id,
    name: doc.name,
    folder: doc.folder,
    tags: doc.tags || [],
    subject: doc.subject,
    ref_no: doc.refNo || doc.ref_no,
    size: doc.size,
    type: doc.type,
    status: doc.status || 'Active',
    metadata: typeof doc.metadata === 'string' ? doc.metadata : JSON.stringify(doc.metadata || {}),
    updated_at: doc.updatedAt || doc.updated_at || new Date().toISOString()
  };
}

/**
 * AUDIT LOG MAPPERS
 */
export function mapAuditLogFromDb(log: any): any {
  if (!log) return null;
  return {
    id: log.id,
    userId: log.user_id || log.userId,
    userName: log.user_name || log.userName,
    action: log.action,
    entityType: log.entity_type || log.entityType,
    entityId: log.entity_id || log.entityId,
    entityName: log.entity_name || log.entityName,
    severity: log.severity || 'INFO',
    metadata: log.metadata,
    timestamp: log.timestamp || log.created_at || new Date().toISOString()
  };
}

export function mapAuditLogToDb(log: any): any {
  if (!log) return null;
  return {
    id: log.id,
    user_id: log.userId || log.user_id,
    user_name: log.userName || log.user_name,
    action: log.action,
    entity_type: log.entityType || log.entity_type,
    entity_id: log.entityId || log.entity_id,
    entity_name: log.entityName || log.entity_name,
    severity: log.severity || 'INFO',
    metadata: typeof log.metadata === 'string' ? log.metadata : JSON.stringify(log.metadata || {}),
    timestamp: log.timestamp || new Date().toISOString()
  };
}
