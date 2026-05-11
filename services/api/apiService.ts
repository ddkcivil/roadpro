import { Project, User, UserRole, Message } from '../../types';
import { AuditService } from '../analytics/auditService';
import { realApiService } from './realApiService';

// --- Project Operations ---
export const apiService = {
  // Fetch all projects
  getProjects: async (page: number = 1, limit: number = 50): Promise<{ data: Project[], pagination: any }> => {
    return realApiService.getProjects(page, limit);
  },

  // Fetch a single project by ID
  getProject: async (id: string, forceRefresh = false): Promise<Project | undefined> => {
    try {
      return await realApiService.getProject(id, forceRefresh);
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

    const queryParams = new URLSearchParams({ search: searchTerm, limit: limit.toString() });
    if (searchField) queryParams.append('field', searchField);
    
    return apiService.fetchApi(`/projects?${queryParams.toString()}`, { method: 'GET' }, true);
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
    try {
      const data = await apiService.fetchApi(`/users?id=${userId}`, { method: 'GET' }, true) as User;
      return data;
    } catch (error: any) {
      if (error.status === 404) return undefined;
      throw error;
    }
  },

  // Fetch all users
  getUsers: async (): Promise<User[]> => {
    return realApiService.getUsers();
  },

  // Update staff location
  updateStaffLocation: async (projectId: string, latitude: number, longitude: number, userId?: string, userName?: string, userRole?: UserRole): Promise<any> => {
    return realApiService.updateStaffLocation(projectId, latitude, longitude);
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