/**
 * Utility to convert between camelCase and snake_case or lowercase
 * and handle common timestamp field variations.
 */
// --- Project Mappings ---
export function mapProjectFromDb(dbProject) {
    if (!dbProject)
        return dbProject;
    return {
        ...dbProject,
        startDate: dbProject.startdate || dbProject.startDate,
        endDate: dbProject.enddate || dbProject.endDate,
        contractPeriod: dbProject.contractperiod || dbProject.contractPeriod,
        projectManager: dbProject.projectmanager || dbProject.projectManager,
        supervisor: dbProject.supervisor || dbProject.supervisor,
        consultantName: dbProject.consultantname || dbProject.consultantName,
        clientName: dbProject.clientname || dbProject.clientName,
        contractNo: dbProject.contractno || dbProject.contractNo,
        client: dbProject.client,
        engineer: dbProject.engineer,
        // Plurals (JSONB in DB usually keeps its internal casing, but columns are lowercase)
        variationOrders: dbProject.variationorders || dbProject.variationOrders || [],
        labTests: dbProject.labtests || dbProject.labTests || [],
        agencyPayments: dbProject.agencypayments || dbProject.agencyPayments || [],
        agencyMaterials: dbProject.agencymaterials || dbProject.agencyMaterials || [],
        agencyBills: dbProject.agencybills || dbProject.agencyBills || [],
        subcontractorPayments: dbProject.subcontractorpayments || dbProject.subcontractorPayments || [],
        linearWorks: dbProject.linearworks || dbProject.linearWorks || [],
        purchaseOrders: dbProject.purchaseorders || dbProject.purchaseOrders || [],
        inventoryTransactions: dbProject.inventorytransactions || dbProject.inventoryTransactions || [],
        vehicleLogs: dbProject.vehiclelogs || dbProject.vehicleLogs || [],
        sitePhotos: dbProject.sitephotos || dbProject.sitePhotos || [],
        dailyReports: dbProject.dailyreports || dbProject.dailyReports || [],
        preConstruction: dbProject.preconstruction || dbProject.preConstruction || [],
        preConstructionTasks: dbProject.preconstructiontasks || dbProject.preConstructionTasks || [],
        landParcels: dbProject.landparcels || dbProject.landParcels || [],
        mapOverlays: dbProject.mapoverlays || dbProject.mapOverlays || [],
        kmlData: dbProject.kmldata || dbProject.kmlData || [],
        contractBills: dbProject.contractbills || dbProject.contractBills || [],
        subcontractorBills: dbProject.subcontractorbills || dbProject.subcontractorBills || [],
        measurementSheets: dbProject.measurementsheets || dbProject.measurementSheets || [],
        staffLocations: dbProject.stafflocations || dbProject.staffLocations || [],
        environmentRegistry: dbProject.environmentregistry || dbProject.environmentRegistry,
        resourceAllocations: dbProject.resourceallocations || dbProject.resourceAllocations || [],
        complianceWorkflows: dbProject.complianceworkflows || dbProject.complianceWorkflows || [],
        auditLogs: dbProject.auditlogs || dbProject.auditLogs || [],
        structureTemplates: dbProject.structuretemplates || dbProject.structureTemplates || [],
        accountingIntegrations: dbProject.accountingintegrations || dbProject.accountingIntegrations || [],
        accountingTransactions: dbProject.accountingtransactions || dbProject.accountingTransactions || [],
        lastSynced: dbProject.lastsynced || dbProject.lastSynced,
        spreadsheetId: dbProject.spreadsheetid || dbProject.spreadsheetId,
        createdAt: dbProject.createdat || dbProject.createdAt || dbProject.created_at,
        updatedAt: dbProject.updatedat || dbProject.updatedAt || dbProject.updated_at
    };
}
export function mapProjectToDb(project) {
    if (!project)
        return project;
    const dbData = { ...project };
    // Mapping specific camelCase to lowercase for projects table
    if (project.startDate) {
        dbData.startdate = project.startDate;
        delete dbData.startDate;
    }
    if (project.endDate) {
        dbData.enddate = project.endDate;
        delete dbData.endDate;
    }
    if (project.contractPeriod) {
        dbData.contractperiod = project.contractPeriod;
        delete dbData.contractPeriod;
    }
    if (project.projectManager) {
        dbData.projectmanager = project.projectManager;
        delete dbData.projectManager;
    }
    if (project.consultantName) {
        dbData.consultantname = project.consultantName;
        delete dbData.consultantName;
    }
    if (project.clientName) {
        dbData.clientname = project.clientName;
        delete dbData.clientName;
    }
    if (project.contractNo) {
        dbData.contractno = project.contractNo;
        delete dbData.contractNo;
    }
    // Plurals
    if (project.variationOrders) {
        dbData.variationorders = project.variationOrders;
        delete dbData.variationOrders;
    }
    if (project.labTests) {
        dbData.labtests = project.labTests;
        delete dbData.labTests;
    }
    if (project.agencyPayments) {
        dbData.agencypayments = project.agencyPayments;
        delete dbData.agencyPayments;
    }
    if (project.agencyMaterials) {
        dbData.agencymaterials = project.agencyMaterials;
        delete dbData.agencyMaterials;
    }
    if (project.agencyBills) {
        dbData.agencybills = project.agencyBills;
        delete dbData.agencyBills;
    }
    if (project.subcontractorPayments) {
        dbData.subcontractorpayments = project.subcontractorPayments;
        delete dbData.subcontractorPayments;
    }
    if (project.linearWorks) {
        dbData.linearworks = project.linearWorks;
        delete dbData.linearWorks;
    }
    if (project.purchaseOrders) {
        dbData.purchaseorders = project.purchaseOrders;
        delete dbData.purchaseOrders;
    }
    if (project.inventoryTransactions) {
        dbData.inventorytransactions = project.inventoryTransactions;
        delete dbData.inventoryTransactions;
    }
    if (project.vehicleLogs) {
        dbData.vehiclelogs = project.vehicleLogs;
        delete dbData.vehicleLogs;
    }
    if (project.sitePhotos) {
        dbData.sitephotos = project.sitePhotos;
        delete dbData.sitePhotos;
    }
    if (project.dailyReports) {
        dbData.dailyreports = project.dailyReports;
        delete dbData.dailyReports;
    }
    if (project.preConstruction) {
        dbData.preconstruction = project.preConstruction;
        delete dbData.preConstruction;
    }
    if (project.preConstructionTasks) {
        dbData.preconstructiontasks = project.preConstructionTasks;
        delete dbData.preConstructionTasks;
    }
    if (project.landParcels) {
        dbData.landparcels = project.landParcels;
        delete dbData.landParcels;
    }
    if (project.mapOverlays) {
        dbData.mapoverlays = project.mapOverlays;
        delete dbData.mapOverlays;
    }
    if (project.kmlData) {
        dbData.kmldata = project.kmlData;
        delete dbData.kmlData;
    }
    if (project.contractBills) {
        dbData.contractbills = project.contractBills;
        delete dbData.contractBills;
    }
    if (project.subcontractorBills) {
        dbData.subcontractorbills = project.subcontractorBills;
        delete dbData.subcontractorBills;
    }
    if (project.measurementSheets) {
        dbData.measurementsheets = project.measurementSheets;
        delete dbData.measurementSheets;
    }
    if (project.staffLocations) {
        dbData.stafflocations = project.staffLocations;
        delete dbData.staffLocations;
    }
    if (project.environmentRegistry) {
        dbData.environmentregistry = project.environmentRegistry;
        delete dbData.environmentRegistry;
    }
    if (project.resourceAllocations) {
        dbData.resourceallocations = project.resourceAllocations;
        delete dbData.resourceAllocations;
    }
    if (project.complianceWorkflows) {
        dbData.complianceworkflows = project.complianceWorkflows;
        delete dbData.complianceWorkflows;
    }
    if (project.auditLogs) {
        dbData.auditlogs = project.auditLogs;
        delete dbData.auditLogs;
    }
    if (project.structureTemplates) {
        dbData.structuretemplates = project.structureTemplates;
        delete dbData.structureTemplates;
    }
    if (project.accountingIntegrations) {
        dbData.accountingintegrations = project.accountingIntegrations;
        delete dbData.accountingIntegrations;
    }
    if (project.accountingTransactions) {
        dbData.accountingtransactions = project.accountingTransactions;
        delete dbData.accountingTransactions;
    }
    if (project.lastSynced) {
        dbData.lastsynced = project.lastSynced;
        delete dbData.lastSynced;
    }
    if (project.spreadsheetId) {
        dbData.spreadsheetid = project.spreadsheetId;
        delete dbData.spreadsheetId;
    }
    if (project.updatedAt) {
        dbData.updatedat = project.updatedAt;
        delete dbData.updatedAt;
    }
    if (project.createdAt) {
        dbData.createdat = project.createdAt;
        delete dbData.createdAt;
    }
    return dbData;
}
// --- User Mappings ---
export function mapUserFromDb(dbUser) {
    if (!dbUser)
        return dbUser;
    return {
        id: dbUser.id,
        name: dbUser.full_name || dbUser.name,
        email: dbUser.email || dbUser.email,
        phone: dbUser.phone || '',
        role: dbUser.role,
        avatar: dbUser.avatar_url || dbUser.avatar,
        lastSeen: dbUser.last_seen || dbUser.lastSeen
    };
}
export function mapUserToDb(user) {
    if (!user)
        return user;
    const dbData = { ...user };
    if (user.name) {
        dbData.full_name = user.name;
        delete dbData.name;
    }
    if (user.avatar) {
        dbData.avatar_url = user.avatar;
        delete dbData.avatar;
    }
    if (user.lastSeen) {
        dbData.last_seen = user.lastSeen;
        delete dbData.lastSeen;
    }
    return dbData;
}
// --- Audit Log Mappings ---
export function mapAuditLogFromDb(dbLog) {
    if (!dbLog)
        return dbLog;
    return {
        ...dbLog,
        userId: dbLog.user_id || dbLog.userId,
        userName: dbLog.user_name || dbLog.userName,
        entityType: dbLog.entity_type || dbLog.entityType,
        entityId: dbLog.entity_id || dbLog.entityId,
        entityName: dbLog.entity_name || dbLog.entityName,
        ipAddress: dbLog.ip_address || dbLog.ipAddress,
        userAgent: dbLog.user_agent || dbLog.userAgent,
        timestamp: dbLog.timestamp
    };
}
export function mapAuditLogToDb(log) {
    if (!log)
        return log;
    const dbData = { ...log };
    if (log.userId) {
        dbData.user_id = log.userId;
        delete dbData.userId;
    }
    if (log.userName) {
        dbData.user_name = log.userName;
        delete dbData.userName;
    }
    if (log.entityType) {
        dbData.entity_type = log.entityType;
        delete dbData.entityType;
    }
    if (log.entityId) {
        dbData.entity_id = log.entityId;
        delete dbData.entityId;
    }
    if (log.entityName) {
        dbData.entity_name = log.entityName;
        delete dbData.entityName;
    }
    if (log.ipAddress) {
        dbData.ip_address = log.ipAddress;
        delete dbData.ipAddress;
    }
    if (log.userAgent) {
        dbData.user_agent = log.userAgent;
        delete dbData.userAgent;
    }
    return dbData;
}
// --- File/Document Mappings ---
export function mapProjectDocumentFromDb(dbDoc) {
    if (!dbDoc)
        return dbDoc;
    return {
        ...dbDoc,
        projectId: dbDoc.project_id || dbDoc.projectId,
        refNo: dbDoc.ref_no || dbDoc.refNo,
        letterDate: dbDoc.letter_date || dbDoc.letterDate,
        currentVersion: dbDoc.current_version || dbDoc.currentVersion,
        uploadDate: dbDoc.upload_date || dbDoc.uploadDate,
        uploadedBy: dbDoc.uploaded_by || dbDoc.uploadedBy,
        createdBy: dbDoc.created_by || dbDoc.createdBy,
        lastModified: dbDoc.last_modified || dbDoc.lastModified,
        userId: dbDoc.user_id || dbDoc.userId,
        updatedAt: dbDoc.updatedat || dbDoc.updatedAt || dbDoc.updated_at,
        createdAt: dbDoc.createdat || dbDoc.createdAt || dbDoc.created_at,
        versions: (dbDoc.versions || []).map(mapDocumentVersionFromDb)
    };
}
export function mapProjectDocumentToDb(doc) {
    if (!doc)
        return doc;
    const dbData = { ...doc };
    if (doc.projectId) {
        dbData.project_id = doc.projectId;
        delete dbData.projectId;
    }
    if (doc.refNo) {
        dbData.ref_no = doc.refNo;
        delete dbData.refNo;
    }
    if (doc.letterDate) {
        dbData.letter_date = doc.letterDate;
        delete dbData.letterDate;
    }
    if (doc.currentVersion) {
        dbData.current_version = doc.currentVersion;
        delete dbData.currentVersion;
    }
    if (doc.updatedAt) {
        dbData.updatedat = doc.updatedAt;
        delete dbData.updatedAt;
    }
    if (doc.createdAt) {
        dbData.createdat = doc.createdAt;
        delete dbData.createdAt;
    }
    return dbData;
}
export function mapDocumentVersionFromDb(dbVersion) {
    if (!dbVersion)
        return dbVersion;
    return {
        ...dbVersion,
        version: dbVersion.version_num || dbVersion.version,
        filePath: dbVersion.blob_url || dbVersion.filePath,
        blobUrl: dbVersion.blob_url || dbVersion.blobUrl,
        uploadedBy: dbVersion.uploaded_by || dbVersion.uploadedBy
    };
}
