import type { MongoUser } from './mongoAuth.js';
import { isUuid } from './uuidUtils.js';

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
      role: (user.role || 'SITE_ENGINEER').toUpperCase(),
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
    role: (user.role || 'SITE_ENGINEER').toUpperCase(),
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
  return {
    id: dbProj.id,
    name: dbProj.name,
    client: dbProj.client,
    contractNo: dbProj.contract_no || dbProj.contractNo || dbProj.contractno,
    // Support both snake_case and camelCase column names returned by different DB migrations
    ownerId: dbProj.owner_id || dbProj.ownerId || dbProj.ownerid,
    location: dbProj.location,
    status: dbProj.status,
    budget: dbProj.budget,
    startDate: dbProj.startDate || dbProj.start_date || dbProj.startdate,
    endDate: dbProj.endDate || dbProj.end_date || dbProj.enddate,
    createdAt: dbProj.createdAt || dbProj.created_at || dbProj.createdat,
    updatedAt: dbProj.updatedAt || dbProj.updated_at || dbProj.updatedat,
    description: dbProj.description,
    metadata: dbProj.metadata,
    contractor: dbProj.contractor,
    // Attach joined documents and photos from Supabase relationship results
    documents: (dbProj.project_documents || []).map((d: any) => ({
      id: d.id,
      projectId: d.project_id,
      name: d.name,
      folder: d.folder,
      tags: d.tags || [],
      subject: d.subject,
      refNo: d.ref_no,
      size: d.size,
      type: d.type,
      status: d.status,
      metadata: d.metadata,
      currentVersion: d.current_version || 1,
      fileUrl: `/api/files?id=${d.id}`,
      versions: (d.document_versions || []).map((v: any) => ({
        id: v.id,
        version: v.version_num,
        date: v.created_at,
        size: v.size ? `${(v.size / 1024 / 1024).toFixed(2)} MB` : '0 MB',
        filePath: `/api/files?id=${v.id}`,
        uploadedBy: 'System'
      })),
      updatedAt: d.updated_at
    })),
    sitePhotos: (dbProj.project_site_photos || []).map((p: any) => ({
      id: p.id,
      url: p.url,
      caption: p.caption,
      date: p.created_at,
      uploadedBy: p.uploaded_by,
      location: p.location_lat ? { lat: p.location_lat, lng: p.location_lng } : null
    }))
  };
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
    contractor: proj.contractor
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
