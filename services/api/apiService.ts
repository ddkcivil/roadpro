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
    
    // DEFENSIVE: Get the project ID if it exists in the data
    const projectId = mappedProject.id;
    
    // Check if project with this ID already exists to prevent duplicate key constraint violation
    if (projectId) {
      const { data: existingProject, error: checkError } = await supabase
        .from(PROJECTS_TABLE)
        .select('*')
        .eq('id', projectId)
        .maybeSingle();

      if (!checkError && existingProject) {
        console.warn(`[Supabase] Project with ID ${projectId} already exists. Updating instead.`);
        // Project exists - update it instead of creating duplicate
        return apiService.updateProject(projectId, projectData, userId, userName, mappedProject);
      }
    }
    
// Use mapProjectToDb to convert camelCase to snake_case for Supabase
    // The mappedProject already has proper snake_case column names for the database
    const projectToInsert = {
      ...mappedProject,
      // Ensure all JSONB arrays have defaults (use values from mappedProject which are already snake_case)
      boq: mappedProject.boq || mappedProject.boq_items || [],
      variation_orders: mappedProject.variation_orders || mappedProject.variationOrders || [],
      measurement_sheets: mappedProject.measurement_sheets || mappedProject.measurementSheets || [],
      // RLS policy requires owner_id = auth.uid() for INSERT - pass the authenticated user's ID
      owner_id: userId ? userId : undefined,
    };
    
    const { data, error } = await supabase
      .from(PROJECTS_TABLE)
      .insert([projectToInsert])
      .select('*');

    if (error) {
      // Handle duplicate key error specifically - treat as upsert
      if (error.code === '23505' || error.message?.includes('duplicate key')) {
        console.warn(`[Supabase] Project ${projectId} already exists (from error). Updating instead.`);
        if (projectId) {
          return apiService.updateProject(projectId, projectData, userId, userName, mappedProject);
        }
      }
      console.error('[Supabase] Failed to create project:', error);
      throw new Error(error.message || 'Failed to create project.');
    }

    const createdProject = mapProjectFromDb(data?.[0]);
    
    if (userId && userName) {
      await AuditService.logDataModification(userId, userName, 'CREATE', 'project', createdProject.id, createdProject.name, undefined, createdProject);
    }

    return createdProject;
  },

// Update an existing project (with auto-create fallback for orphaned local projects)
  updateProject: async (id: string, projectData: Partial<Project>, userId?: string, userName?: string, previousProjectData?: Partial<Project>): Promise<Project> => {
    const mappedProject = mapProjectToDb(projectData);
    
    const cleanedProjectData = Object.fromEntries(
      Object.entries(mappedProject).filter(([_, v]) => v !== undefined)
    );

    // First, check if the project exists in Supabase
    const { data: existingProject, error: fetchError } = await supabase
      .from(PROJECTS_TABLE)
      .select('id')
      .eq('id', id)
      .maybeSingle();

    if (fetchError) {
      console.error(`[Supabase] Failed to check project existence for ID ${id}:`, fetchError);
    }

    // If project doesn't exist in Supabase (exists locally but never synced), create it instead of failing
    if (!existingProject) {
      console.warn(`[Supabase] Project ${id} not found in backend. Creating as new (likely orphaned local project).`);
      
      const projectToInsert = {
        ...cleanedProjectData,
        owner_id: userId || cleanedProjectData.owner_id,
      };
      
      const { data: createdData, error: createError } = await supabase
        .from(PROJECTS_TABLE)
        .insert([projectToInsert])
        .select('*');

      if (createError) {
        console.error(`[Supabase] Failed to create project with ID ${id}:`, createError);
        throw new Error(createError.message || 'Failed to create project.');
      }

      const createdProject = mapProjectFromDb(createdData?.[0]);
      
      if (!createdProject) {
        console.error(`[Supabase] Project creation returned no data for ID ${id}`);
        throw new Error(`Project creation failed for ID: ${id}`);
      }

      if (userId && userName) {
        await AuditService.logDataModification(userId, userName, 'CREATE', 'project', createdProject.id, createdProject.name, undefined, createdProject);
      }

      return createdProject;
    }

    // Project exists - perform normal update
    const { data, error, count } = await supabase
      .from(PROJECTS_TABLE)
      .update(cleanedProjectData)
      .eq('id', id)
      .select('*');

    if (error) {
      console.error(`[Supabase] Failed to update project with ID ${id}:`, error);
      throw new Error(error.message || 'Failed to update project.');
    }

    // DEFENSIVE: Handle case where update succeeds but returns no data (RLS or other issues)
    let updatedProject = mapProjectFromDb(data?.[0]);
    
    if (!updatedProject && count && count > 0) {
      // Update succeeded (count > 0) but no data returned - fetch the project separately
      console.warn(`[Supabase] Update returned no data for ID ${id}, fetching project separately`);
      const { data: fetchedData, error: fetchError } = await supabase
        .from(PROJECTS_TABLE)
        .select('*')
        .eq('id', id)
        .single();
      
      if (fetchError) {
        console.error(`[Supabase] Failed to fetch updated project with ID ${id}:`, fetchError);
        throw new Error(fetchError.message || 'Failed to fetch updated project.');
      }
      
      if (!fetchedData) {
        console.error(`[Supabase] Project update succeeded but project not found for ID ${id}`);
        throw new Error(`Project not found after update for ID: ${id}`);
      }
      
      updatedProject = mapProjectFromDb(fetchedData);
    } else if (!updatedProject) {
      // No data returned and no rows affected
      console.error(`[Supabase] Project update returned no data for ID ${id}`);
      throw new Error(`Project not found or update failed for ID: ${id}`);
    }
    
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

    return data.map((user: any) => ({
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
    },
};
