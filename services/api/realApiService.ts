// services/api/realApiService.ts
import { Project, User, Message, AppSettings, SyncOperation } from '../../types';
import { offlineStorage } from '../database/offlineStorage';
import { encryptionUtils } from '../../utils/data/encryptionUtils';
import { SyncService } from './syncService';

const DEFAULT_TTL = 30000; // 30 seconds default
const CACHE_CONFIG: Record<string, number> = {
  '/projects': 60000, // 1 minute
  '/users': 120000,   // 2 minutes
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
 * - JWT Token injection from localStorage (encrypted)
 * - Conflict resolution support via timestamps
 * - Background sync queue for offline mutations
 */
class RealApiService {
  private static instance: RealApiService;
  private cache: Map<string, { data: any, timestamp: number }> = new Map();
  private lastSyncTime: number = 0;
  private isRefreshing: boolean = false;

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
   * Internal fetch wrapper with retry logic and automatic token refresh
   * @param endpoint - API endpoint path
   * @param options - Request options
   * @param retries - Number of retry attempts for server errors
   */
  private async fetchWithRetry<T>(endpoint: string, options?: RequestInit, retries = 3): Promise<T> {
    try {
      const encryptedToken = localStorage.getItem('roadmaster-token');
      const token = encryptedToken ? encryptionUtils.decrypt<string>(encryptedToken) : null;
      const csrfToken = localStorage.getItem('roadmaster-csrf-token');
      
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        ...options?.headers as Record<string, string>,
      };

      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      if (csrfToken && options?.method && ['POST', 'PUT', 'DELETE'].includes(options.method)) {
        headers['X-CSRF-Token'] = csrfToken;
      }

      const response = await fetch(`/api${endpoint}`, {
        ...options,
        headers,
      });

      if (response.status === 401 && !endpoint.includes('/auth/') && !this.isRefreshing) {
        // Token expired, try to refresh
        this.isRefreshing = true;
        try {
          const refreshResult = await this.refreshToken();
          if (refreshResult.success) {
            this.isRefreshing = false;
            // Retry the original request with the new token
            return this.fetchWithRetry(endpoint, options, retries);
          }
        } catch (refreshError) {
          console.error('Failed to refresh token automatically');
        } finally {
          this.isRefreshing = false;
        }
      }

      if (!response.ok) {
        // Only retry on 5xx errors
        if (retries > 0 && response.status >= 500) {
          await new Promise(resolve => setTimeout(resolve, 1000));
          return this.fetchWithRetry(endpoint, options, retries - 1);
        }
        
        const errorData = await response.json().catch(() => ({}));
        const error: any = new Error(errorData.error || `API request failed with status ${response.status}`);
        error.response = { data: errorData };
        error.status = response.status;
        throw error;
      }

      return response.json();
    } catch (error) {
      if (retries > 0 && !navigator.onLine) {
        // Don't retry if we're clearly offline
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
      }

      return data;
    } catch (error) {
      // 5. Try Offline Storage Fallback
      if (options?.method === 'GET') {
        const offlineEntry = await offlineStorage.getItem<{data: T, timestamp: number}>(cacheKey);
        if (offlineEntry !== undefined) {
          console.log(`[API] Serving offline data for: ${endpoint}`);
          return (offlineEntry as any).data || offlineEntry;
        }
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
   * Fetches projects from the database with pagination
   */
  async getProjects(page = 1, limit = 50): Promise<{ data: Project[], pagination: any }> {
    return this.fetchApi<{ data: Project[], pagination: any }>(`/projects?page=${page}&limit=${limit}`, { method: 'GET' }, true);
  }

  /**
   * Fetches a single project by ID
   */
  async getProject(id: string): Promise<Project> {
    return this.fetchApi<Project>(`/projects?id=${id}`, { method: 'GET' }, true);
  }

  /**
   * Creates a new project
   */
  async createProject(projectData: Partial<Project>): Promise<Project> {
    return this.fetchApi<Project>('/projects', {
      method: 'POST',
      body: JSON.stringify(projectData),
    });
  }

  /**
   * Updates an existing project
   */
  async updateProject(id: string, projectData: Partial<Project>): Promise<Project> {
    return this.fetchApi<Project>(`/projects?id=${id}`, {
      method: 'PUT',
      body: JSON.stringify(projectData),
    });
  }

  /**
   * Deletes a project
   */
  async deleteProject(id: string): Promise<void> {
    return this.fetchApi<void>(`/projects?id=${id}`, {
      method: 'DELETE',
    });
  }

  // --- User Management ---

  /**
   * Fetches all users (Admin only)
   */
  async getUsers(): Promise<User[]> {
    return this.fetchApi<User[]>('/users', { method: 'GET' }, true);
  }

  /**
   * Authenticates a user and returns a JWT token
   */
  async loginUser(email: string, password: string): Promise<{ success: boolean; user?: User; message?: string; csrfToken?: string }> {
    const result = await this.fetchApi<{ success: boolean; user?: User; message?: string; csrfToken?: string }>('/auth?action=login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });

    if (result.success && result.csrfToken) {
      localStorage.setItem('roadmaster-csrf-token', result.csrfToken);
    }

    return result;
  }

  /**
   * Refreshes the current JWT token
   */
  async refreshToken(): Promise<{ success: boolean; token?: string }> {
    try {
      const result = await this.fetchApi<{ success: boolean; token?: string }>('/auth?action=refresh', {
        method: 'POST',
      });
      
      if (result.success && result.token) {
        const encryptedToken = encryptionUtils.encrypt(result.token);
        localStorage.setItem('roadmaster-token', encryptedToken);
      }
      
      return result;
    } catch (error) {
      console.error('Manual token refresh failed');
      return { success: false };
    }
  }

  // --- Registration Management ---

  /**
   * Fetches pending registrations
   */
  async getPendingRegistrations(): Promise<any[]> {
    return this.fetchApi<any[]>('/registrations', { method: 'GET' }, true);
  }

  /**
   * Submits a new user registration request
   */
  async submitRegistration(data: any): Promise<any> {
    return this.fetchApi<any>('/registrations', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  /**
   * Approves a pending registration
   */
  async approveRegistration(id: string): Promise<User> {
    return this.fetchApi<User>(`/registrations?id=${id}&action=approve`, {
      method: 'POST',
    });
  }

  /**
   * Rejects a pending registration
   */
  async rejectRegistration(id: string): Promise<void> {
    return this.fetchApi<void>(`/registrations?id=${id}&action=reject`, {
      method: 'POST',
    });
  }

  /**
   * Creates a new user directly
   */
  async createUser(userData: Partial<User>): Promise<User> {
    return this.fetchApi<User>('/users', {
      method: 'POST',
      body: JSON.stringify(userData),
    });
  }

  /**
   * Updates an existing user
   */
  async updateUser(id: string, userData: Partial<User>): Promise<User> {
    return this.fetchApi<User>(`/users?id=${id}`, {
      method: 'PUT',
      body: JSON.stringify(userData),
    });
  }

  /**
   * Deletes a user
   */
  async deleteUser(id: string): Promise<void> {
    return this.fetchApi<void>(`/users?id=${id}`, {
      method: 'DELETE',
    });
  }

  // --- Staff Management ---

  /**
   * Fetches all items for a staff category
   */
  async getStaffData(category: string): Promise<any[]> {
    return this.fetchApi<any[]>(`/staff?category=${category}`, { method: 'GET' }, true);
  }

  /**
   * Saves staff item (create or update)
   */
  async saveStaffData(category: string, data: any): Promise<any> {
    const isUpdate = data.id && !data.id.startsWith('temp-');
    return this.fetchApi<any>(`/staff?category=${category}${isUpdate ? `&id=${data.id}` : ''}`, {
      method: isUpdate ? 'PUT' : 'POST',
      body: JSON.stringify(data),
    });
  }

  /**
   * Deletes a staff item
   */
  async deleteStaffData(category: string, id: string): Promise<void> {
    return this.fetchApi<void>(`/staff?category=${category}&id=${id}`, {
      method: 'DELETE',
    });
  }

  /**
   * Fetches all leave requests (legacy support)
   */
  async getLeaveRequests(): Promise<any[]> {
    return this.getStaffData('leave-requests');
  }

  /**
   * Creates a new leave request (legacy support)
   */
  async createLeaveRequest(leaveData: any): Promise<any> {
    return this.saveStaffData('leave-requests', leaveData);
  }

  /**
   * Updates an existing leave request (legacy support)
   */
  async updateLeaveRequest(id: string, leaveData: any): Promise<any> {
    return this.saveStaffData('leave-requests', { ...leaveData, id });
  }

  /**
   * Health check for the API
   */
  async healthCheck(): Promise<{ status: string; message: string }> {
    return this.fetchApi<{ status: string; message: string }>('/health');
  }
}

export const realApiService = RealApiService.getInstance();
