import type { UserLike } from './authUtils.js';
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

  // Map from Supabase (has id)
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

export function mapUsersFromDb(users: UserLike[]): any[] {
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
  // Map KML data from either JSONB field (kml_data) or separate table (project_kml)
  // The separate table is fetched separately in the GET handler
  mapped.kmlData = dbProj.project_kml || dbProj.kml_data || dbProj.kmlData || [];
  mapped.ncrs = dbProj.ncrs || [];
  mapped.contractBills = dbProj.contract_bills || dbProj.contractBills || [];
  mapped.measurementSheets = dbProj.measurement_sheets || dbProj.measurementSheets || [];
  mapped.roads = dbProj.roads || [];
  mapped.staffLocations = (dbProj.staff_locations || dbProj.staffLocation || []).filter(
    (loc: any) => loc && typeof loc.userId === 'string'
  );
  mapped.environmentRegistry = dbProj.environment_registry || dbProj.environmentRegistry || { sprinklingLogs: [], treeLogs: [] };
  mapped.accountingIntegrations = dbProj.accountingintegrations || dbProj.accounting_integrations || dbProj.accountingIntegrations || [];
  mapped.accountingTransactions = dbProj.accountingtransactions || dbProj.accounting_transactions || dbProj.accountingTransactions || [];
  mapped.structureTemplates = dbProj.structuretemplates || dbProj.structure_templates || dbProj.structureTemplates || [];
mapped.auditLogs = dbProj.auditlogs || dbProj.audit_logs || dbProj.auditLogs || [];

  // Map Resource & Material Matrix data
  mapped.resources = dbProj.resources || dbProj.resources || [];
  mapped.resourceAllocations = dbProj.resource_allocations || dbProj.resourceAllocations || [];
  mapped.milestones = dbProj.milestones || dbProj.milestones || [];

  // Map joined documents and photos if they exist
  mapped.documents = (dbProj.project_documents || dbProj.documents || []).map((d: any) => ({
    id: d.id,
    projectId: d.project_id || d.projectId,
    name: d.name,
    folder: d.folder,
    tags: d.tags || [],
    subject: d.subject,
    refNo: d.ref_no || d.refNo,
    size: (d.size && typeof d.size === 'string' && !d.size.includes('MB')) 
      ? `${(parseInt(d.size) / 1024 / 1024).toFixed(2)} MB` 
      : (d.size || '0 MB'),
    type: d.type,
    status: d.status,
    metadata: d.metadata,
    currentVersion: d.current_version || d.currentVersion || 1,
    letterDate: d.letter_date || d.letterDate,
    correspondenceType: d.correspondence_type || d.correspondenceType,
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
  
  // Helper to map either camelCase or snake_case input to snake_case output
  const mapField = (camel: string, snake: string) => {
    if (proj[camel] !== undefined) out[snake] = proj[camel];
    else if (proj[snake] !== undefined) out[snake] = proj[snake];
  };

  // Basic Fields
  if (proj.id !== undefined) out.id = proj.id;
  if (proj.name !== undefined) out.name = proj.name;
  if (proj.client !== undefined) out.client = proj.client;
  if (proj.location !== undefined) out.location = proj.location;
  if (proj.status !== undefined) out.status = proj.status;
  if (proj.budget !== undefined) out.budget = proj.budget;
  if (proj.description !== undefined) out.description = proj.description;
  if (proj.contractor !== undefined) out.contractor = proj.contractor;
  
  // Mapped Fields (camelCase to snake_case)
  mapField('contractNo', 'contract_no');
  mapField('startDate', 'start_date');
  mapField('endDate', 'end_date');
  mapField('createdAt', 'created_at');
  mapField('updatedAt', 'updated_at');

  // Complex / JSONB Fields
  if (proj.metadata !== undefined) {
    out.metadata = {
      ...(proj.metadata || {}),
      code: proj.code !== undefined ? proj.code : proj.metadata?.code,
      engineer: proj.engineer !== undefined ? proj.engineer : proj.metadata?.engineer,
      consultantName: proj.consultantName !== undefined ? proj.consultantName : proj.metadata?.consultantName
    };
  } else if (proj.code !== undefined || proj.engineer !== undefined || proj.consultantName !== undefined) {
    out.metadata = {
      code: proj.code,
      engineer: proj.engineer,
      consultantName: proj.consultantName
    };
  }

  // Explicit JSONB mappings
  if (proj.boq !== undefined) out.boq = proj.boq;
  mapField('variationOrders', 'variation_orders');
  mapField('measurementSheets', 'measurement_sheets');

  // Handle owner_id with UUID validation
  const ownerId = proj.ownerId !== undefined ? proj.ownerId : proj.owner_id;
  if (ownerId !== undefined) {
    if (ownerId && isUuid(ownerId)) {
      out.owner_id = ownerId;
    } else if (ownerId === null) {
      out.owner_id = null;
    }
  }

// Bulk map JSONB array fields
  const jsonbFields = [
    'roads', 'accountingintegrations', 'accountingtransactions', 
    'structuretemplates', 'auditlogs', 'rfis', 'lab_tests', 'schedule', 
    'structures', 'agencies', 'agency_payments', 'agency_materials', 
    'agency_bills', 'materials', 'linear_works', 'inventory', 
    'purchase_orders', 'inventory_transactions', 'vehicles', 
    'vehicle_logs', 'daily_reports', 'pre_construction', 
    'land_parcels', 'map_overlays', 'kml_data', 'ncrs', 'contract_bills',
    'staff_locations', 'environment_registry',
    'resources', 'resource_allocations', 'milestones'
  ];
  
  jsonbFields.forEach(field => {
    const camel = field.replace(/_([a-z])/g, (g) => g[1].toUpperCase());
    if (proj[field] !== undefined) out[field] = proj[field];
    else if (proj[camel] !== undefined) out[field] = proj[camel];
  });

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
  const out: any = {};
  
  if (doc.id !== undefined) out.id = doc.id;
  if (doc.projectId !== undefined || doc.project_id !== undefined) 
    out.project_id = doc.projectId || doc.project_id;
  if (doc.name !== undefined) out.name = doc.name;
  if (doc.folder !== undefined) out.folder = doc.folder;
  if (doc.tags !== undefined) out.tags = doc.tags;
  if (doc.subject !== undefined) out.subject = doc.subject;
  if (doc.refNo !== undefined || doc.ref_no !== undefined) 
    out.ref_no = doc.refNo || doc.ref_no;
  if (doc.size !== undefined) out.size = doc.size;
  if (doc.type !== undefined) out.type = doc.type;
  if (doc.status !== undefined) out.status = doc.status;
  if (doc.letterDate !== undefined || doc.letter_date !== undefined)
    out.letter_date = doc.letterDate || doc.letter_date;
  if (doc.correspondenceType !== undefined || doc.correspondence_type !== undefined)
    out.correspondence_type = doc.correspondenceType || doc.correspondence_type;
  
  if (doc.metadata !== undefined) {
    out.metadata = typeof doc.metadata === 'string' ? doc.metadata : JSON.stringify(doc.metadata);
  }
  
  out.updated_at = doc.updatedAt || doc.updated_at || new Date().toISOString();
  return out;
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
