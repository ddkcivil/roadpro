import { Project, User, UserRole, Message, AppSettings, StaffLocation } from '../../types';
import { supabase } from '../../lib/supabase';
import { mapProjectFromDb, mapProjectToDb } from '../../api/utils/mappers';
import { AuditService } from '../analytics/auditService';
import { realApiService } from './realApiService';

// Constants for Supabase tables
const PROJECTS_TABLE = 'projects';
const USERS_TABLE = 'profiles'; // Fixed: Use 'profiles' table (matches Supabase schema)
const FILES_TABLE = 'files';

// Configuration for Supabase Storage bucket name
// **IMPORTANT**: Replace 'your-bucket-name' with the actual name of your Supabase storage bucket.
// This might be 'public', or a specific bucket configured for project files.
const STORAGE_BUCKET_NAME = 'public'; // <<< CHANGE THIS TO YOUR ACTUAL BUCKET NAME

// Utility to handle Supabase API responses
const handleSupabaseResponse = async (response: any, operation: string = 'fetch') => {
  if (response.error) {
    console.error(`[Supabase Error] ${operation} failed:`, response.error);
    // Attempt to extract more specific error messages if available
    const errorMessage = response.error.message || 'An unknown error occurred.';
    throw new Error(errorMessage);
  }
  return response.data;
};

// --- Project Operations ---
export const apiService = {
  // Fetch all projects
  getProjects: async (page: number = 1, limit: number = 50): Promise<{ data: Project[], pagination: any }> => {
    const from = (page - 1) * limit;
    const to = from + limit - 1;

    const { data, error, count } = await supabase
      .from(PROJECTS_TABLE)
      .select('*', { count: 'exact' })
      .range(from, to)
      .order('updated_at', { ascending: false });

    if (error) {
      console.error('[Supabase] Failed to fetch projects:', error);
      throw new Error(error.message || 'Failed to fetch projects.');
    }

    const projects = data.map(mapProjectFromDb);
    const totalPages = count ? Math.ceil(count / limit) : 1;

    return {
      data: projects,
      pagination: {
        total: count,
        page,
        limit,
        totalPages,
      },
    };
  },

  // Fetch a single project by ID
  getProject: async (id: string): Promise<Project | undefined> => {
    const { data, error } = await supabase
      .from(PROJECTS_TABLE)
      .select('*')
      .eq('id', id)
      .maybeSingle();

    if (error) {
      console.error(`[Supabase] Failed to fetch project with ID ${id}:`, error);
      throw new Error(error.message || 'Failed to fetch project.');
    }

    if (!data) return undefined;
    return mapProjectFromDb(data);
  },

  // Create a new project
  createProject: async (projectData: Partial<Project>, userId?: string, userName?: string): Promise<Project> => {
    const mappedProject = mapProjectToDb(projectData);
    
    const projectToInsert = {
      ...mappedProject,
      boq: mappedProject.boq || [],
      variationOrders: mappedProject.variationOrders || [],
      rfis: mappedProject.rfis || [],
      labTests: mappedProject.labTests || [],
      schedule: mappedProject.schedule || [],
      structures: mappedProject.structures || [],
      agencies: mappedProject.agencies || [],
      agencyPayments: mappedProject.agencyPayments || [],
      agencyMaterials: mappedProject.agencyMaterials || [],
      agencyBills: mappedProject.agencyBills || [],
      materials: mappedProject.materials || [],
      purchaseOrders: mappedProject.purchaseOrders || [],
      inventoryTransactions: mappedProject.inventoryTransactions || [],
      vehicles: mappedProject.vehicles || [],
      vehicleLogs: mappedProject.vehicleLogs || [],
      documents: mappedProject.documents || [],
      sitePhotos: mappedProject.sitePhotos || [],
      dailyReports: mappedProject.dailyReports || [],
      preConstruction: mappedProject.preConstruction || [],
      landParcels: mappedProject.landParcels || [],
      mapOverlays: mappedProject.mapOverlays || [],
      ncrs: mappedProject.ncrs || [],
      contractBills: mappedProject.contractBills || [],
      measurementSheets: mappedProject.measurementSheets || [],
      staffLocations: mappedProject.staffLocations || [],
      environmentRegistry: mappedProject.environmentRegistry || { sprinklingLogs: [], treeLogs: [] },
      accountingIntegrations: mappedProject.accountingIntegrations || [],
      accountingTransactions: mappedProject.accountingTransactions || [],
      structureTemplates: mappedProject.structureTemplates || [],
      auditLogs: mappedProject.auditLogs || [],
    };
    
    const { data, error } = await supabase
      .from(PROJECTS_TABLE)
      .insert([projectToInsert])
      .select('*');

    if (error) {
      console.error('[Supabase] Failed to create project:', error);
      throw new Error(error.message || 'Failed to create project.');
    }

    const createdProject = mapProjectFromDb(data?.[0]);
    
    if (userId && userName) {
      await AuditService.logDataModification(userId, userName, 'CREATE', 'project', createdProject.id, createdProject.name, undefined, createdProject);
    }

    return createdProject;
  },

  // Update an existing project
  updateProject: async (id: string, projectData: Partial<Project>, userId?: string, userName?: string, previousProjectData?: Partial<Project>): Promise<Project> => {
    const mappedProject = mapProjectToDb(projectData);
    
    const cleanedProjectData = Object.fromEntries(
      Object.entries(mappedProject).filter(([_, v]) => v !== undefined)
    );

    const { data, error } = await supabase
      .from(PROJECTS_TABLE)
      .update(cleanedProjectData)
      .eq('id', id)
      .select('*');

    if (error) {
      console.error(`[Supabase] Failed to update project with ID ${id}:`, error);
      throw new Error(error.message || 'Failed to update project.');
    }

    const updatedProject = mapProjectFromDb(data?.[0]);
    
    if (userId && userName) {
      await AuditService.logDataModification(userId, userName, 'UPDATE', 'project', updatedProject.id, updatedProject.name, previousProjectData, updatedProject);
    }

    return updatedProject;
  },

  // Delete a project
  deleteProject: async (id: string, userId?: string, userName?: string, projectName?: string): Promise<void> => {
    let projectToDelete: Project | undefined;
    try {
      projectToDelete = await apiService.getProject(id);
    } catch (fetchError) {
      console.warn(`[Supabase] Could not fetch project ${id} before delete for logging. Continuing delete.`, fetchError);
    }

    const { error } = await supabase
      .from(PROJECTS_TABLE)
      .delete()
      .eq('id', id);

    if (error) {
      console.error(`[Supabase] Failed to delete project with ID ${id}:`, error);
      throw new Error(error.message || 'Failed to delete project.');
    }

    if (userId && userName) {
      const nameToLog = projectToDelete?.name || projectName || 'Unknown Project';
      await AuditService.logDataModification(userId, userName, 'DELETE', 'project', id, nameToLog, projectToDelete, undefined);
    }

    // TODO: Implement cleanup for related data (files, etc.) if not handled by Supabase cascading deletes.
  },

  // Fetch user by ID
  getUser: async (userId: string): Promise<User | undefined> => {
    const { data, error } = await supabase
      .from(USERS_TABLE)
      .select('*')
      .eq('id', userId)
      .single();

    if (error) {
      console.error(`[Supabase] Failed to fetch user with ID ${userId}:`, error);
      throw new Error(error.message || 'Failed to fetch user.');
    }
    
    if (!data) return undefined;

    return {
      id: data.id,
      name: data.full_name || data.name || 'User',
      email: data.email,
      phone: data.phone || '',
      role: data.role || UserRole.SITE_ENGINEER,
      avatar: data.avatar_url,
      lastSeen: data.last_seen || undefined,
    };
  },

// Fetch all users
  getUsers: async (): Promise<User[]> => {
    const { data, error } = await supabase
      .from(USERS_TABLE)
      .select('*')
      .order('full_name'); // Fixed: Use correct column name

    if (error) {
      console.error('[Supabase] Failed to fetch users:', error);
      throw new Error(error.message || 'Failed to fetch users.');
    }

    return data.map(user => ({
      id: user.id,
      name: user.full_name || user.name || 'User',
      email: user.email,
      phone: user.phone || '',
      role: user.role || UserRole.SITE_ENGINEER,
      avatar: user.avatar_url,
      lastSeen: user.last_seen || undefined,
    }));
  },

  // Update staff location
  updateStaffLocation: async (projectId: string, latitude: number, longitude: number, userId?: string, userName?: string, userRole?: UserRole): Promise<any> => {
    console.log(`[API] Updating staff location for project ${projectId}: {lat: ${latitude}, lng: ${longitude}}`);
    
    const { data, error } = await supabase
      .from('project_staff_locations') // Assuming this table exists
      .upsert([{
        project_id: projectId,
        user_id: userId,
        user_name: userName,
        role: userRole,
        latitude: latitude,
        longitude: longitude,
        timestamp: new Date().toISOString(),
      }], { onConflict: 'project_id, user_id' }); // Conflict resolution

    if (error) {
      console.error('[Supabase] Failed to update staff location:', error);
      throw new Error(error.message || 'Failed to update staff location.');
    }
    return data;
  },

  /**
   * Deletes a file from Supabase Storage.
   * @param fileId The ID of the file record in the 'files' table.
   * @returns A Promise that resolves when the file is deleted.
   */
  deleteFile: async (fileId: string): Promise<void> => {
    console.log(`[API] Attempting to delete file with ID: ${fileId}`);

    // 1. Fetch file metadata from the 'files' table to get the storage path.
    //    Assumes 'files' table has an 'id' and 'storage_path' column.
    const { data: fileData, error: fetchError } = await supabase
      .from(FILES_TABLE)
      .select('storage_path') // Assuming 'storage_path' column stores the path in Supabase Storage
      .eq('id', fileId)
      .single(); // Assuming fileId is unique

    if (fetchError) {
      console.error(`[Supabase] Failed to fetch file info for deletion (ID: ${fileId}):`, fetchError);
      // Log and re-throw to indicate failure
      throw new Error(`Failed to fetch file metadata for ID ${fileId}: ${fetchError.message}`);
    }

    if (!fileData || !fileData.storage_path) {
      console.warn(`[Supabase] File storage path not found for ID: ${fileId}. Skipping deletion.`);
      // If file metadata or path is missing, we can't delete from storage.
      return; // Or throw an error if this is considered a critical failure
    }

    // 2. Delete the file from Supabase Storage.
    const { error: storageError } = await supabase.storage
      .from(STORAGE_BUCKET_NAME) // Use the configured bucket name (defined at the top of the file)
      .remove([fileData.storage_path]);

    if (storageError) {
      console.error(`[Supabase Storage] Failed to delete file ${fileData.storage_path} (ID: ${fileId}):`, storageError);
      throw new Error(`Failed to delete file from storage for ID ${fileId}: ${storageError.message}`);
    }

    console.log(`[Supabase Storage] Successfully deleted file: ${fileData.storage_path} (associated with file ID ${fileId})`);

    // Optional: Delete the file record from the 'files' table as well, if desired.
    // This would be a separate Supabase call.
    // const { error: recordDeleteError } = await supabase.from(FILES_TABLE).delete().eq('id', fileId);
    // if (recordDeleteError) {
    //   console.error(`[Supabase] Failed to delete file record (ID: ${fileId}):`, recordDeleteError);
    // }
  },

// Heartbeat function
  heartbeat: async (): Promise<void> => {
    console.log('[API] Sending heartbeat...');
  },

  // --- Forward to realApiService for Backend API operations ---

  // Registration Management
  getPendingRegistrations: async (): Promise<any[]> => {
    return realApiService.getPendingRegistrations();
  },

  submitRegistration: async (data: any): Promise<any> => {
    return realApiService.submitRegistration(data);
  },

  approveRegistration: async (id: string): Promise<User> => {
    return realApiService.approveRegistration(id);
  },

  rejectRegistration: async (id: string): Promise<void> => {
    return realApiService.rejectRegistration(id);
  },

  // User Management
  createUser: async (userData: Partial<User>): Promise<User> => {
    return realApiService.createUser(userData);
  },

  updateUser: async (id: string, userData: Partial<User>): Promise<User> => {
    return realApiService.updateUser(id, userData);
  },

  deleteUser: async (id: string): Promise<void> => {
    return realApiService.deleteUser(id);
  },

  // Staff Management
  getStaffData: async (category: string): Promise<any[]> => {
    return realApiService.getStaffData(category);
  },

  saveStaffData: async (category: string, data: any): Promise<any> => {
    return realApiService.saveStaffData(category, data);
  },

  deleteStaffData: async (category: string, id: string): Promise<void> => {
    return realApiService.deleteStaffData(category, id);
  },

  // Audit Logging
  getAuditLogs: async (filters?: { userId?: string, action?: string, entityType?: string, limit?: number, offset?: number }): Promise<{ logs: any[], total: number }> => {
    return realApiService.getAuditLogs(filters);
  },

  submitAuditLog: async (log: any): Promise<any> => {
    return realApiService.submitAuditLog(log);
  },

  // Road Management
  ingestRoadKml: async (projectId: string, roadName: string, kmlContent: string): Promise<{ success: boolean, road: any }> => {
    return realApiService.ingestRoadKml(projectId, roadName, kmlContent);
  },

  // Message Management
  getMessages: async (projectId: string, receiverId?: string, after?: string): Promise<Message[]> => {
    return realApiService.getMessages(projectId, receiverId, after);
  },

  sendMessage: async (messageData: { 
    content: string, 
    receiverId: string, 
    projectId: string,
    attachmentUrl?: string,
    attachmentName?: string,
    attachmentType?: string
  }): Promise<Message> => {
    return realApiService.sendMessage(messageData);
  },

// File Management
  uploadFile: async (fileData: { 
    name: string; 
    contentType: string; 
    base64Data: string; 
    projectId?: string;
    docId?: string;
    folder?: string;
    tags?: string[];
    subject?: string;
    refNo?: string;
    metadata?: any;
  }): Promise<any> => {
    return realApiService.uploadFile(fileData);
  },

  // fetchApi for BOQ operations
  fetchApi: async (endpoint: string, options?: RequestInit, useCache = false, forceRefresh = false): Promise<any> => {
    return (realApiService as any).fetchApi(endpoint, options, useCache, forceRefresh);
  }
};
