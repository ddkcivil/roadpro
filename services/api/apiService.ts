import { Project, User, UserRole, Message } from '../../types';
import { supabase } from '../../lib/supabase';
import { mapProjectFromDb, mapProjectToDb } from '../../utils/mappers';
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

// --- Project Operations ---
export const apiService = {
  // Fetch all projects
  getProjects: async (page: number = 1, limit: number = 50): Promise<{ data: Project[], pagination: any }> => {
    return realApiService.getProjects(page, limit);
  },

  // Fetch a single project by ID
  getProject: async (id: string): Promise<Project | undefined> => {
    try {
      return await realApiService.getProject(id);
    } catch (error: any) {
      if (error.status === 404) return undefined;
      throw error;
    }
  },

  // Search projects by query (supports searching by id, code, name, or client)
  searchProjects: async (query: string, options?: { field?: 'id' | 'code' | 'name' | 'client', limit?: number }): Promise<{ data: Project[], count: number }> => {
    const searchTerm = query.trim().toLowerCase();
    const limit = options?.limit || 50;
    const searchField = options?.field;

    let queryBuilder = supabase.from(PROJECTS_TABLE).select('*');

    // Apply field-specific or general search
    if (searchField === 'id') {
      queryBuilder = queryBuilder.ilike('id', `%${searchTerm}%`);
    } else if (searchField === 'code') {
      queryBuilder = queryBuilder.ilike('code', `%${searchTerm}%`);
    } else if (searchField === 'name') {
      queryBuilder = queryBuilder.ilike('name', `%${searchTerm}%`);
    } else if (searchField === 'client') {
      queryBuilder = queryBuilder.ilike('client', `%${searchTerm}%`);
    } else {
      queryBuilder = queryBuilder.or(`id.ilike.%${searchTerm}%,code.ilike.%${searchTerm}%,name.ilike.%${searchTerm}%,client.ilike.%${searchTerm}%`);
    }

    const { data, error } = await queryBuilder.limit(limit);

    if (error) {
      console.error(`[Supabase] Failed to search projects with query "${query}":`, error);
      throw new Error(error.message || 'Failed to search projects.');
    }

    return {
      data: (data || []).map(mapProjectFromDb),
      count: data?.length || 0
    };
  },

  // Create a new project
  createProject: async (projectData: Partial<Project>, userId?: string, userName?: string): Promise<Project> => {
    const createdProject = await realApiService.createProject(projectData);

    // Fire-and-forget: audit logging should never block the create response
    if (userId && userName) {
      AuditService.logDataModification(userId, userName, 'CREATE', 'project', createdProject.id, createdProject.name, undefined, createdProject).catch((e: any) => {
        console.warn('[Audit] Failed to log create (non-blocking):', e?.message);
      });
    }

    return createdProject;
  },

  // Update an existing project
  updateProject: async (id: string, projectData: Partial<Project>, userId?: string, userName?: string, previousProjectData?: Partial<Project>): Promise<Project> => {
    const updatedProject = await realApiService.updateProject(id, projectData);

    // Fire-and-forget: audit logging should never block the update response
    if (userId && userName) {
      AuditService.logDataModification(userId, userName, 'UPDATE', 'project', updatedProject.id, updatedProject.name, previousProjectData, updatedProject).catch((e: any) => {
        console.warn('[Audit] Failed to log update (non-blocking):', e?.message);
      });
    }

    return updatedProject;
  },

  // Delete a project
  deleteProject: async (id: string, userId?: string, userName?: string, projectName?: string): Promise<void> => {
    let projectToDelete: Project | undefined;
    try {
      projectToDelete = await apiService.getProject(id);
    } catch (fetchError: unknown) {
      console.warn(`[Supabase] Could not fetch project ${id} before delete for logging. Continuing delete.`, fetchError);
    }

    try {
      await realApiService.deleteProject(id);
    } catch (deleteError: any) {
      // If the project doesn't exist on the backend (404) or any other error,
      // treat it as success — the local deletion has already been applied.
      if (deleteError?.status === 404 || deleteError?.message?.includes('Project not found') || deleteError?.message?.includes('Failed to clean up files')) {
        console.warn(`[Supabase] Project ${id} not found on backend (local-only or already deleted).`);
      } else {
        // Re-throw unexpected errors so the caller can handle them
        throw deleteError;
      }
    }

    // Fire-and-forget: audit logging should never block the delete response
    if (userId && userName) {
      const nameToLog = projectToDelete?.name || projectName || 'Unknown Project';
      AuditService.logDataModification(userId, userName, 'DELETE', 'project', id, nameToLog, projectToDelete, undefined).catch((e: any) => {
        console.warn('[Audit] Failed to log delete (non-blocking):', e?.message);
      });
    }
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
      let errorMessage = 'Failed to fetch user.';
      if (error instanceof Error) {
        errorMessage = error.message;
      } else {
        errorMessage = String(error);
      }
      throw new Error(errorMessage);
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
      .order('full_name');

    if (error) {
      console.error('[Supabase] Failed to fetch users:', error);
      let errorMessage = 'Failed to fetch users.';
      if (error instanceof Error) {
        errorMessage = error.message;
      } else {
        errorMessage = String(error);
      }
      throw new Error(errorMessage);
    }

    return data.map((user: any) => {
      return {
        id: user.id,
        name: user.full_name || user.name || 'User',
        email: user.email,
        phone: user.phone || '',
        role: user.role || UserRole.SITE_ENGINEER,
        avatar: user.avatar_url,
        lastSeen: user.last_seen || undefined,
      } as User;
    });
  },

  // Update staff location
  updateStaffLocation: async (projectId: string, latitude: number, longitude: number, userId?: string, userName?: string, userRole?: UserRole): Promise<any> => {
    console.log(`[API] Updating staff location for project ${projectId}: {lat: ${latitude}, lng: ${longitude}}`);

    const { data, error } = await supabase
      .from('project_staff_locations')
      .upsert([{
        project_id: projectId,
        user_id: userId,
        user_name: userName,
        role: userRole,
        latitude: latitude,
        longitude: longitude,
        timestamp: new Date().toISOString(),
      }], { onConflict: 'project_id, user_id' });

    if (error) {
      console.error('[Supabase] Failed to update staff location:', error);
      let errorMessage = 'Failed to update staff location.';
      if (error instanceof Error) {
        errorMessage = error.message;
      } else {
        errorMessage = String(error);
      }
      throw new Error(errorMessage);
    }
    return data;
  },

  /**
   * Deletes a file from Supabase Storage.
   * @param fileId The ID of the file record in the 'files' table.
   * @returns A Promise that resolves when the file is deleted.
   */
  deleteFile: async (fileId: string): Promise<void> => {
    return realApiService.deleteFile(fileId);
  },

  // Heartbeat function
  heartbeat: async (): Promise<void> => {
    console.log('[API] Sending heartbeat...');
  },

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

  fetchApi: async (endpoint: string, options?: RequestInit, useCache = false, forceRefresh = false): Promise<any> => {
    return (realApiService as any).fetchApi(endpoint, options, useCache, forceRefresh);
  },
};