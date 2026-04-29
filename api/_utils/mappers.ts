import type { MongoUser } from './mongoAuth.js';

/**
 * USER MAPPERS
 */
export function mapUserFromDb(user: MongoUser | null): any {
  if (!user) return null;

  const { passwordHash, ...safeUser } = user;
  
  return {
    ...safeUser,
    id: user._id,
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
    // Support both snake_case and camelCase column names returned by different DB migrations
    ownerId: dbProj.ownerId || dbProj.ownerid,
    location: dbProj.location,
    status: dbProj.status,
    budget: dbProj.budget,
    startDate: dbProj.startDate || dbProj.startdate,
    endDate: dbProj.endDate || dbProj.enddate,
    createdAt: dbProj.createdAt || dbProj.createdat,
    updatedAt: dbProj.updatedAt || dbProj.updatedat,
    description: dbProj.description,
    metadata: dbProj.metadata
  };
}

export function mapProjectToDb(proj: any): any {
  if (!proj) return null;
  const out: any = {
    id: proj.id,
    name: proj.name,
    client: proj.client,
    // Use lowercase column names as Postgres folds unquoted identifiers to lowercase.
    location: proj.location,
    status: proj.status,
    budget: proj.budget,
    startdate: proj.startDate,
    enddate: proj.endDate,
    createdat: proj.createdAt,
    updatedat: proj.updatedAt,
    description: proj.description,
    metadata: proj.metadata
  };

  if (proj.ownerId) {
    out.ownerid = proj.ownerId;
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
