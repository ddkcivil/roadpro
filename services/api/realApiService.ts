// services/api/realApiService.ts
import { Project, User, Message, AppSettings, SyncOperation, StaffLocation } from '../../types';
import { offlineStorage } from '../database/offlineStorage';
import { LocalStorageUtils } from '../../utils/data/localStorageUtils';
import { SyncService } from './syncService';

const DEFAULT_TTL = 30000; // 30 seconds default
const CACHE_CONFIG: Record<string, number> = {
  '/projects': 60000, // 1 minute
  '/users': 120000,   // 2 minutes
  '/messages': 2000,  // 2 seconds for active polling
  '/auth/': 0,        // Never cache auth
  '/health': 5000,    // 5 seconds
};

/**
 * RealApiService
 * 
 * Handles all backend API communication with features like:
 * - Automatic retry for 5xx errors
 * - Resource-specific memory caching for GET requests
 * - Offline-first fallback using IndexedDB
 * - Supabase JWT Token injection from session
 * - Conflict resolution support via timestamps
 * - Background sync queue for offline mutations
 */
class RealApiService {
  private static instance: RealApiService;
  private cache: Map<string, { data: any, timestamp: number }> = new Map();
  private lastSyncTime: number = 0;

  constructor() {
    // Private constructor for singleton
  }

  public static getInstance(): RealApiService {
    if (!RealApiService.instance) {
      RealApiService.instance = new RealApiService();
    }
    return RealApiService.instance;
  }

  /**
   * Gets the TTL for a specific endpoint
   */
  private getTTL(endpoint: string): number {
    const configKey = Object.keys(CACHE_CONFIG).find(key => endpoint.startsWith(key));
    return configKey !== undefined ? CACHE_CONFIG[configKey] : DEFAULT_TTL;
  }

/**
   * Gets the authentication token from localStorage or cookie
   * This implements a dual-source token strategy for robustness:
   * 1. First checks localStorage 'roadmaster-token'
   * 2. Falls back to 'roadmaster-access' cookie
   * 3. If token found in cookie but not localStorage, syncs it to localStorage
   * @returns The token string or null if not found
   */
  private getAuthToken(): string | null {
    const authTokenKey = 'roadmaster-token';
    
    // 1. First check localStorage
    let token = localStorage.getItem(authTokenKey);
    
    if (token) {
      console.log(`[API] Token found in localStorage`);
      return token;
    }
    
    // 2. Fall back to cookie if not in localStorage
    if (typeof document !== 'undefined' && document.cookie) {
      const cookies = document.cookie.split(';').reduce((acc: Record<string, string>, cookie) => {
        const [name, value] = cookie.trim().split('=');
        if (name) acc[name] = value;
        return acc;
      }, {});
      
      const cookieToken = cookies['roadmaster-access'];
      if (cookieToken) {
        console.log(`[API] Token found in cookie, syncing to localStorage`);
        // Sync cookie token to localStorage for future use
        try {
          localStorage.setItem(authTokenKey, cookieToken);
          console.log(`[API] ✓ Token synced from cookie to localStorage`);
        } catch (syncError) {
          console.warn(`[API] Failed to sync token to localStorage:`, syncError);
        }
        return cookieToken;
      }
    }
    
    return null;
  }

  /**
   * Internal fetch wrapper with retry logic and automatic token refresh via Supabase
   * @param endpoint - API endpoint path
   * @param options - Request options
   * @param retries - Number of retry attempts for server errors
   */
private async fetchWithRetry<T>(endpoint: string, options?: RequestInit, retries = 3): Promise<T> {
    try {
      const token = this.getAuthToken();
      const authTokenKey = 'roadmaster-token';
      
      // Enhanced logging for auth debugging
      console.log(`[API] fetchWithRetry: ${endpoint}`, {
        hasToken: !!token,
        tokenLength: token?.length || 0,
        tokenPrefix: token ? token.substring(0, 20) + '...' : 'none',
        method: options?.method || 'GET',
        timestamp: new Date().toISOString()
      });
      
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        ...options?.headers as Record<string, string>,
      };

// Add Authorization for all API endpoints if token is available, unless it's a known public endpoint
      const publicEndpoints = ['/health', '/audit'];
      if (token && !publicEndpoints.some(p => endpoint.startsWith(p))) {
        headers['Authorization'] = `Bearer ${token}`;
        console.debug(`[API] ✓ Token added for ${endpoint}, length: ${token.length}`);
      } else if (token) {
        console.debug(`[API] Skipping token for public endpoint: ${endpoint}`); 
      } else if (!publicEndpoints.some(p => endpoint.startsWith(p))) {
        // Only warn for non-public endpoints
        console.warn(`[API] ⚠ No token found in localStorage key "${authTokenKey}" for ${endpoint}`);
      }
      const response = await fetch(`/api${endpoint}`, {
        ...options,
        headers,
        credentials: (options as any)?.credentials ?? 'include',
      });

if (response.status === 401 || response.status === 500) {
        // If we get 401 or 500, the session might be genuinely invalid
        // 500 errors on auth endpoints indicate server-side issues that may invalidate the session
        window.dispatchEvent(new CustomEvent('roadmaster-auth-failure'));
      }

      if (!response.ok) {
        // Only retry on 5xx errors
        if (retries > 0 && response.status >= 500) {
          await new Promise(resolve => setTimeout(resolve, 1000));
          return this.fetchWithRetry(endpoint, options, retries - 1);
        }
        
        const errorData = await response.json().catch(() => ({}));
        console.error(`[API Error] ${endpoint}:`, errorData);
        const error: any = new Error(errorData.error || `API request failed with status ${response.status}`);
        error.response = { data: errorData };
        error.status = response.status;
        throw error;
      }

      if (response.status === 204) {
        return {} as any;
      }

      const text = await response.text();
      const data = text ? JSON.parse(text) : {};
      
      // Normalize IDs for backward compatibility
      if (Array.isArray(data)) {
        return data.map((item: any) => {
          if (item && item._id && !item.id) item.id = item._id;
          if (item && item.id && !item._id) item._id = item.id;
          return item;
        }) as any;
      }
      
      // Normalize single object IDs
      if (data && typeof data === 'object') {
        if (data._id && !data.id) data.id = data._id;
        if (data.id && !data._id) data._id = data.id;
      }
      
      return data;
    } catch (error) {
      if (retries > 0 && !navigator.onLine) {
        throw error;
      }
      if (retries > 0) {
        await new Promise(resolve => setTimeout(resolve, 1000));
        return this.fetchWithRetry(endpoint, options, retries - 1);
      }
      throw error;
    }
  }

  /**
   * Main API call handler with caching and offline fallback
   * @param endpoint - API endpoint path
   * @param options - Request options
   * @param useCache - Whether to use memory cache
   * @param forceRefresh - Whether to bypass cache and force network request
   */
  private async fetchApi<T>(endpoint: string, options?: RequestInit, useCache = false, forceRefresh = false): Promise<T> {
    const cacheKey = `${endpoint}-${JSON.stringify(options)}`;
    const ttl = this.getTTL(endpoint);
    
    // 1. Try Memory Cache
    if (useCache && options?.method === 'GET' && !forceRefresh && ttl > 0) {
      const cached = this.cache.get(cacheKey);
      if (cached && Date.now() - cached.timestamp < ttl) {
        return cached.data;
      }
    }

    // 2. Handle Offline Mutations
    if (!navigator.onLine && options?.method && ['POST', 'PUT', 'DELETE'].includes(options.method)) {
      const description = this.getOperationDescription(endpoint, options);
      await SyncService.enqueue({
        endpoint,
        method: options.method as any,
        body: options.body ? JSON.parse(options.body as string) : null,
        description
      });
      
      return { success: true, queued: true } as any;
    }

    try {
      // 3. Try Network
      const data = await this.fetchWithRetry<T>(endpoint, options);
      
      if (options?.method === 'GET') {
        // 4. Update Memory Cache and Offline Storage
        if (useCache && ttl > 0) this.cache.set(cacheKey, { data, timestamp: Date.now() });
        await offlineStorage.setItem(cacheKey, { data, timestamp: Date.now() });
        this.lastSyncTime = Date.now();
      } else if (options?.method && ['POST', 'PUT', 'DELETE'].includes(options.method)) {
        // Invalidate cache on mutations
        this.cache.clear();
        await offlineStorage.clearAll().catch((e: any) => console.warn('Offline storage clear failed:', e));
      }

      return data;
    } catch (error: any) {
      // 5. Try Offline Storage Fallback
      if (options?.method === 'GET') {
        const offlineEntry = await offlineStorage.getItem<{data: T, timestamp: number}>(cacheKey);
        if (offlineEntry !== undefined) {
          console.log(`[API] Serving offline data for: ${endpoint}`);
          const data = (offlineEntry as any).data || offlineEntry;
          // Normalize IDs for backward compatibility
          if (Array.isArray(data)) {
            return data.map((item: any) => {
              if (item && item._id && !item.id) item.id = item._id;
              if (item && item.id && !item._id) item._id = item.id;
              return item;
            }) as any;
          }
          return data;
        }
      }
      
      if (!navigator.onLine || error.message.includes('Failed to fetch')) {
          const networkError = new Error('Network error: Could not reach the server. Please check your connection.');
          networkError.name = 'NetworkRequestError';
          networkError.stack = error.stack;
          throw networkError;
      }

      throw error; 
    }
  }

  /**
   * Helper to describe an operation for the sync queue UI
   */
  private getOperationDescription(endpoint: string, options: RequestInit): string {
    if (endpoint.includes('/projects')) {
      if (options.method === 'POST') return 'Create Project';
      if (options.method === 'PUT') return 'Update Project';
      if (options.method === 'DELETE') return 'Delete Project';
    }
    return `${options.method} ${endpoint}`;
  }

  /**
   * Executes a single operation from the sync queue
   */
  async executeSyncOperation(op: SyncOperation): Promise<any> {
    return this.fetchWithRetry(op.endpoint, {
      method: op.method,
      body: op.body ? JSON.stringify(op.body) : undefined
    }, 0); 
  }

  /**
   * Returns the timestamp of the last successful GET request
   */
  getLastSyncTime(): number {
    return this.lastSyncTime;
  }

  // --- Project Management ---

  /**
   * Strips base64-encoded file data URLs from project documents and site photos
   * before sending to the API. File data is kept client-side only; the server
   * stores only metadata. This prevents 413 Content Too Large errors.
   */
  private sanitizeProjectForApi(projectData: Partial<Project>): Partial<Project> {
    const sanitized = { ...projectData };

    if (sanitized.documents) {
      sanitized.documents = sanitized.documents.map((doc: any) => {
        if (doc.fileUrl && (doc.fileUrl.startsWith('data:') || doc.fileUrl.startsWith('blob:'))) {
          const { fileUrl: _stripped, ...rest } = doc;
          return rest;
        }
        return doc;
      });
    }

    if (sanitized.sitePhotos) {
      sanitized.sitePhotos = sanitized.sitePhotos.map((photo: any) => {
        if (photo.url && (photo.url.startsWith('data:') || photo.url.startsWith('blob:'))) {
          const { url: _stripped, ...rest } = photo;
          return rest;
        }
        return photo;
      });
    }

    return sanitized;
  }

async getProjects(page = 1, limit = 50): Promise<{ data: Project[], pagination: any }> {
    // DEFENSIVE: Ensure page and limit are always numbers
    const safePage = typeof page === 'number' && !isNaN(page) ? page : 1;
    const safeLimit = typeof limit === 'number' && !isNaN(limit) ? limit : 50;
    
    return this.fetchApi<{ data: Project[], pagination: any }>(`/projects?page=${safePage}&limit=${safeLimit}`, { method: 'GET' }, true);
  }

  async getProject(id: string, forceRefresh = false): Promise<Project> {
    const result = await this.fetchApi<Project>(`/projects?id=${id}`, { method: 'GET' }, true, forceRefresh);
    console.log('[BOQ DEBUG] getProject response:', {
      projectId: id,
      boqCount: Array.isArray(result?.boq) ? result.boq.length : 0,
      boqData: result?.boq,
      timestamp: new Date().toISOString()
    });
    return result;
  }

  async getProjects(page: number = 1, limit: number = 50): Promise<{ data: Project[], pagination: any }> {
    const result = await this.fetchApi<{ data: Project[], pagination: any }>(
      `/projects?page=${page}&limit=${limit}`,
      { method: 'GET' },
      true
    );
    console.log('[BOQ DEBUG] getProjects response:', {
      projectsCount: result?.data?.length || 0,
      projectsWithBoq: result?.data?.filter((p: Project) => Array.isArray(p.boq) && p.boq.length > 0).length || 0,
      sampleBoqCounts: result?.data?.slice(0, 3).map((p: Project) => ({
        name: p.name,
        boqCount: Array.isArray(p.boq) ? p.boq.length : 0
      })) || [],
      timestamp: new Date().toISOString()
    });
    return result;
  }

  async createProject(projectData: Partial<Project>): Promise<Project> {
    const sanitized = this.sanitizeProjectForApi(projectData);
    console.log('[BOQ DEBUG] createProject - BOQ data:', {
      boqCount: Array.isArray(sanitized.boq) ? sanitized.boq.length : 0,
      boqData: sanitized.boq,
      timestamp: new Date().toISOString()
    });
    const result = await this.fetchApi<Project>('/projects', {
      method: 'POST',
      body: JSON.stringify(sanitized),
    });
    console.log('[BOQ DEBUG] createProject response - BOQ data:', {
      boqCount: Array.isArray(result.boq) ? result.boq.length : 0,
      boqData: result.boq,
    });
    return result;
  }

  async updateProject(id: string, projectData: Partial<Project>): Promise<Project> {
    const sanitized = this.sanitizeProjectForApi(projectData);
    console.log('[BOQ DEBUG] updateProject - BOQ data:', {
      projectId: id,
      boqCount: Array.isArray(sanitized.boq) ? sanitized.boq.length : 0,
      boqData: sanitized.boq,
      timestamp: new Date().toISOString()
    });
    const result = await this.fetchApi<Project>(`/projects?id=${id}`, {
      method: 'PUT',
      body: JSON.stringify(sanitized),
    });
    console.log('[BOQ DEBUG] updateProject response - BOQ data:', {
      projectId: id,
      boqCount: Array.isArray(result.boq) ? result.boq.length : 0,
      boqData: result.boq,
    });
    return result;
  }

  async patchProject(id: string, patchData: Partial<Project>): Promise<Project> {
    return this.fetchApi<Project>(`/projects?id=${id}`, {
      method: 'PATCH',
      body: JSON.stringify(this.sanitizeProjectForApi(patchData)),
    });
  }

  async deleteProject(id: string): Promise<void> {
    // Attempt to fetch the project for file cleanup, but gracefully handle
    // projects that only exist locally (never synced) or were already deleted.
    try {
      const project = await this.getProject(id);
      const fileIds: string[] = [];
      if (project?.documents) {
        project.documents.forEach((doc: any) => {
          if (doc.fileId) fileIds.push(doc.fileId);
        });
      }
      if (project?.sitePhotos) {
        project.sitePhotos.forEach((photo: any) => {
          if (photo.fileId) fileIds.push(photo.fileId);
        });
      }
      
      // Attempt to delete associated files
      for (const fileId of fileIds) {
        try {
          await this.deleteFile(fileId);
        } catch (fileErr: any) {
          console.warn(`[API] Failed to delete file ${fileId} during project deletion:`, fileErr?.message);
          // Non-blocking: continue deleting other files
        }
      }
    } catch (error: any) {
      // Project not found on backend (404) is expected for local-only projects.
      // Log a warning but do NOT block the deletion.
      if (error?.status === 404 || error?.message?.includes('Project not found')) {
        console.warn(`[API] Project ${id} not found on backend (may be local-only). Proceeding with deletion.`);
      } else {
        console.warn(`[API] Non-critical error during project file cleanup for ${id}:`, error?.message);
      }
    }

    // Proceed to delete the project from backend regardless of cleanup results.
    try {
      return await this.fetchWithRetry<void>(`/projects?id=${id}`, {
        method: 'DELETE',
      }, 0);
    } catch (error: any) {
      // If backend returns 404, the project was already deleted or never existed.
      // This is not an error — the desired state (project deleted) is already achieved.
      if (error?.status === 404 || error?.message?.includes('Project not found')) {
        console.log(`[API] Project ${id} was already deleted or never existed on backend.`);
        return;
      }
      console.error(`[API] Failed to delete project with ID ${id}:`, error);
      throw new Error(`Failed to delete project: ${error.message}`);
    }
  }

  async updateStaffLocation(projectId: string, latitude: number, longitude: number): Promise<{ success: boolean, location: StaffLocation }> {
    return this.fetchWithRetry<{ success: boolean, location: StaffLocation }>(`/projects?id=${projectId}&action=update-location`, {
      method: 'PATCH',
      body: JSON.stringify({ latitude, longitude }),
    }, 0); 
  }

  // --- User Management ---

  async getUsers(): Promise<User[]> {
    return this.fetchApi<User[]>('/users', { method: 'GET' }, true);
  }

  async heartbeat(): Promise<void> {
    if (!navigator.onLine) return;
    return this.fetchApi<void>('/users?action=heartbeat', { method: 'POST' });
  }

  // --- Registration Management ---

  async getPendingRegistrations(): Promise<any[]> {
    return this.fetchApi<any[]>('/registrations', { method: 'GET' }, true);
  }

  async submitRegistration(data: any): Promise<any> {
    return this.fetchApi<any>('/registrations', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async approveRegistration(id: string): Promise<User> {
    return this.fetchApi<User>(`/registrations?id=${id}&action=approve`, {
      method: 'POST',
    });
  }

  async rejectRegistration(id: string): Promise<void> {
    return this.fetchApi<void>(`/registrations?id=${id}&action=reject`, {
      method: 'POST',
    });
  }

  async createUser(userData: Partial<User>): Promise<User> {
    return this.fetchApi<User>('/users', {
      method: 'POST',
      body: JSON.stringify(userData),
    });
  }

  async updateUser(id: string, userData: Partial<User>): Promise<User> {
    return this.fetchApi<User>(`/users?id=${id}`, {
      method: 'PUT',
      body: JSON.stringify(userData),
    });
  }

  async deleteUser(id: string): Promise<void> {
    return this.fetchApi<void>(`/users?id=${id}`, {
      method: 'DELETE',
    });
  }

  // --- Staff Management ---

  async getStaffData(category: string): Promise<any[]> {
    return this.fetchApi<any[]>(`/staff?category=${category}`, { method: 'GET' }, true);
  }

  async saveStaffData(category: string, data: any): Promise<any> {
    const isUpdate = data.id && !data.id.startsWith('temp-');
    return this.fetchApi<any>(`/staff?category=${category}${isUpdate ? `&id=${data.id}` : ''}`, {
      method: isUpdate ? 'PUT' : 'POST',
      body: JSON.stringify(data),
    });
  }

  async deleteStaffData(category: string, id: string): Promise<void> {
    return this.fetchApi<void>(`/staff?category=${category}&id=${id}`, {
      method: 'DELETE',
    });
  }

  async healthCheck(): Promise<{ status: string; message: string }> {
    return this.fetchApi<{ status: string; message: string }>('/health');
  }

  // --- Audit Logging ---

  async getAuditLogs(filters?: { userId?: string, action?: string, entityType?: string, limit?: number, offset?: number }): Promise<{ logs: any[], total: number }> {
    const query = new URLSearchParams();
    if (filters?.userId) query.append('userId', filters.userId);
    if (filters?.action) query.append('action', filters.action);
    if (filters?.entityType) query.append('entityType', filters.entityType);
    if (filters?.limit) query.append('limit', filters.limit.toString());
    if (filters?.offset) query.append('offset', filters.offset.toString());
    
    return this.fetchApi<{ logs: any[], total: number }>(`/audit?${query.toString()}`, { method: 'GET' });
  }

  async submitAuditLog(log: any): Promise<any> {
    return this.fetchApi<any>('/audit', {
      method: 'POST',
      body: JSON.stringify(log),
    });
  }

  // --- Message Management ---

  async getMessages(projectId: string, receiverId?: string, after?: string): Promise<Message[]> {
    const query = new URLSearchParams({ projectId });
    if (receiverId) query.append('receiverId', receiverId);
    if (after) query.append('after', after);
    
    return this.fetchApi<Message[]>(`/messages?${query.toString()}`, { method: 'GET' }, true);
  }

  async sendMessage(messageData: { 
    content: string, 
    receiverId: string, 
    projectId: string,
    attachmentUrl?: string,
    attachmentName?: string,
    attachmentType?: string
  }): Promise<Message> {
    return this.fetchWithRetry<Message>('/messages', {
      method: 'POST',
      body: JSON.stringify(messageData),
    }, 0); 
  }

  async updateMessageStatus(messageId: string, status: 'read' | 'delivered'): Promise<void> {
    return this.fetchWithRetry<void>(`/messages?messageId=${messageId}&action=${status}`, {
      method: 'PUT',
    }, 1);
  }

  async markMessageAsRead(messageId: string): Promise<void> {
    return this.updateMessageStatus(messageId, 'read');
  }

  // --- File Management ---

  async uploadFile(fileData: { 
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
  }): Promise<{ id: string; url: string; size: number; blobUrl?: string; versionId?: string }> {
    return this.fetchApi<{ id: string; url: string; size: number; blobUrl?: string; versionId?: string }>('/files', {
      method: 'POST',
      body: JSON.stringify(fileData),
    });
  }

  async deleteFile(fileId: string): Promise<void> {
    return this.fetchApi<void>(`/files?id=${fileId}`, {
      method: 'DELETE',
    });
  }

  async updateFileMetadata(fileId: string, patchData: {
    name?: string;
    folder?: string;
    tags?: string[];
    subject?: string;
    refNo?: string;
    status?: string;
    letterDate?: string;
    correspondenceType?: string;
    metadata?: any;
  }): Promise<any> {
    return this.fetchApi<any>(`/files?id=${fileId}`, {
      method: 'PATCH',
      body: JSON.stringify(patchData),
    });
  }

  getFileUrl(fileId: string): string {
    return `/api/files?id=${fileId}`;
  }

  // --- Road Management ---

  async ingestRoadKml(projectId: string, roadName: string, kmlContent: string): Promise<{ success: boolean, road: any }> {
    return this.fetchApi<{ success: boolean, road: any }>(`/roads?action=ingest&projectId=${projectId}`, {
      method: 'POST',
      body: JSON.stringify({ roadName, kmlContent }),
    });
  }
}

export const realApiService = RealApiService.getInstance();
