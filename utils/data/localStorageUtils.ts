import { Project, User, Message } from '../../types';
import { offlineStorage } from '../../services/database/offlineStorage';

const LOCAL_STORAGE_KEYS = {
  PROJECTS: 'roadmaster-projects',
  USERS: 'roadmaster-users',
  MESSAGES: 'roadmaster-messages',
  SETTINGS: 'roadmaster-settings',
  // Staff Management keys
  STAFF_EMPLOYEES: 'staff-employees',
  STAFF_LEAVE_REQUESTS: 'staff-leave-requests',
  STAFF_PERFORMANCE: 'staff-performance',
  STAFF_ATTENDANCE: 'staff-attendance',
  STAFF_SALARIES: 'staff-salaries',
  STAFF_TRAINING: 'staff-training',
  STAFF_EVALUATIONS: 'staff-evaluations'
};

// Maximum number of records to keep for each staff category (to prevent quota overflow)
const MAX_RECORDS = {
  employees: 200,
  leaveRequests: 500,
  performance: 200,
  attendance: 500,
  salaries: 200,
  training: 200,
  evaluations: 200
};

// Helper to estimate the size of a string in bytes
const getByteSize = (str: string): number => {
  return new Blob([str]).size;
};

// Helper to check if we're close to quota and should clean up
const isNearQuota = (): boolean => {
  try {
    let totalSize = 0;
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key) {
        totalSize += getByteSize(localStorage.getItem(key) || "");
      }
    }
    // Warning if we're over 4.5MB (localStorage typically has 5-10MB limit)
    return totalSize > 4.5 * 1024 * 1024;
  } catch {
    return false;
  }
};

// Generic get/set with error handling
const safeGet = <T>(key: string, defaultValue: T): T => {
  try {
    const data = localStorage.getItem(key);
    return data ? JSON.parse(data) : defaultValue;
  } catch (error) {
    console.error(`Error reading ${key} from localStorage:`, error);
    return defaultValue;
  }
};

const safeSet = <T>(key: string, data: T, maxRecords?: number): boolean => {
  try {
    let dataToStore = data;
    
    // If we have too many records, trim them (keep most recent)
    if (maxRecords && Array.isArray(data) && data.length > maxRecords) {
      dataToStore = data.slice(-maxRecords) as unknown as T;
    }
    
    const stringified = JSON.stringify(dataToStore);
    
    // Check if this specific item is too large (> 1MB)
    if (getByteSize(stringified) > 1 * 1024 * 1024) {
      console.warn(`Item ${key} is very large. Moving to IndexedDB...`);
      offlineStorage.setItem(key, dataToStore);
      // Still keep a minimal version in localStorage to avoid breaking existing synchronous code
      // but remove the bulk of the data
      if (Array.isArray(dataToStore)) {
        localStorage.setItem(key, JSON.stringify(dataToStore.slice(-10)));
      }
      return true;
    }

    localStorage.setItem(key, stringified);
    return true;
  } catch (error) {
    if (error instanceof DOMException && (error.name === 'QuotaExceededError' || error.name === 'NS_ERROR_DOM_QUOTA_REACHED')) {
      console.error(`Quota exceeded for ${key}. Clearing space and moving to IndexedDB...`);
      
      // 1. Proactive cleanup
      LocalStorageUtils.emergencyCleanup();
      
      // 2. Try to save large data to IndexedDB instead
      offlineStorage.setItem(key, data);
      
      // 3. Try to save a minimal version to localStorage
      try {
        if (Array.isArray(data)) {
          localStorage.setItem(key, JSON.stringify(data.slice(-5)));
        } else {
          // If not an array, we might just have to remove it from localStorage entirely
          localStorage.removeItem(key);
        }
        return true;
      } catch (retryError) {
        localStorage.removeItem(key);
        return true; 
      }
    }
    console.error(`Error saving ${key} to localStorage:`, error);
    return false;
  }
};

export const LocalStorageUtils = {
  // Projects
  getProjects(): Project[] {
    return safeGet(LOCAL_STORAGE_KEYS.PROJECTS, []);
  },

  setProjects(projects: Project[]): boolean {
    return safeSet(LOCAL_STORAGE_KEYS.PROJECTS, projects);
  },

  // Users
  getUsers(): User[] {
    return safeGet(LOCAL_STORAGE_KEYS.USERS, []);
  },

  setUsers(users: User[]): boolean {
    return safeSet(LOCAL_STORAGE_KEYS.USERS, users);
  },

  // Messages
  getMessages(): Message[] {
    return safeGet(LOCAL_STORAGE_KEYS.MESSAGES, []);
  },

  setMessages(messages: Message[]): boolean {
    return safeSet(LOCAL_STORAGE_KEYS.MESSAGES, messages);
  },

  // Settings
  getSettings() {
    return safeGet(LOCAL_STORAGE_KEYS.SETTINGS, null);
  },

  setSettings(settings: any): boolean {
    return safeSet(LOCAL_STORAGE_KEYS.SETTINGS, settings);
  },

  // ===== Staff Management Methods =====
  
  // Employees
  getEmployees(): any[] {
    return safeGet(LOCAL_STORAGE_KEYS.STAFF_EMPLOYEES, []);
  },

  setEmployees(employees: any[]): boolean {
    return safeSet(LOCAL_STORAGE_KEYS.STAFF_EMPLOYEES, employees, MAX_RECORDS.employees);
  },

  // Leave Requests
  getLeaveRequests(): any[] {
    return safeGet(LOCAL_STORAGE_KEYS.STAFF_LEAVE_REQUESTS, []);
  },

  setLeaveRequests(requests: any[]): boolean {
    return safeSet(LOCAL_STORAGE_KEYS.STAFF_LEAVE_REQUESTS, requests, MAX_RECORDS.leaveRequests);
  },

  // Performance
  getPerformanceRecords(): any[] {
    return safeGet(LOCAL_STORAGE_KEYS.STAFF_PERFORMANCE, []);
  },

  setPerformanceRecords(records: any[]): boolean {
    return safeSet(LOCAL_STORAGE_KEYS.STAFF_PERFORMANCE, records, MAX_RECORDS.performance);
  },

  // Attendance
  getAttendanceRecords(): any[] {
    return safeGet(LOCAL_STORAGE_KEYS.STAFF_ATTENDANCE, []);
  },

  setAttendanceRecords(records: any[]): boolean {
    return safeSet(LOCAL_STORAGE_KEYS.STAFF_ATTENDANCE, records, MAX_RECORDS.attendance);
  },

  // Salaries
  getSalaryRecords(): any[] {
    return safeGet(LOCAL_STORAGE_KEYS.STAFF_SALARIES, []);
  },

  setSalaryRecords(records: any[]): boolean {
    return safeSet(LOCAL_STORAGE_KEYS.STAFF_SALARIES, records, MAX_RECORDS.salaries);
  },

  // Training
  getTrainingRecords(): any[] {
    return safeGet(LOCAL_STORAGE_KEYS.STAFF_TRAINING, []);
  },

  setTrainingRecords(records: any[]): boolean {
    return safeSet(LOCAL_STORAGE_KEYS.STAFF_TRAINING, records, MAX_RECORDS.training);
  },

  // Evaluations
  getEvaluationForms(): any[] {
    return safeGet(LOCAL_STORAGE_KEYS.STAFF_EVALUATIONS, []);
  },

  setEvaluationForms(forms: any[]): boolean {
    return safeSet(LOCAL_STORAGE_KEYS.STAFF_EVALUATIONS, forms, MAX_RECORDS.evaluations);
  },

  // Clear old staff data to free up space (keeps recent records only)
  clearOldStaffData(): void {
    console.warn('Clearing old staff data to free up localStorage space...');
    
    const keysToCheck = [
      LOCAL_STORAGE_KEYS.STAFF_LEAVE_REQUESTS,
      LOCAL_STORAGE_KEYS.STAFF_ATTENDANCE,
      LOCAL_STORAGE_KEYS.STAFF_SALARIES,
      LOCAL_STORAGE_KEYS.STAFF_TRAINING,
      LOCAL_STORAGE_KEYS.STAFF_EVALUATIONS,
      LOCAL_STORAGE_KEYS.STAFF_PERFORMANCE
    ];
    
    keysToCheck.forEach(key => {
      try {
        const data = localStorage.getItem(key);
        if (data) {
          const parsed = JSON.parse(data);
          if (Array.isArray(parsed) && parsed.length > 50) {
            // Move to offline storage before clearing
            offlineStorage.setItem(key, parsed);
            // Keep only the most recent 10% or 20 records
            const keepCount = Math.max(20, Math.floor(parsed.length * 0.1));
            const trimmed = parsed.slice(-keepCount);
            localStorage.setItem(key, JSON.stringify(trimmed));
            console.log(`Trimmed ${key} from ${parsed.length} to ${trimmed.length} records`);
          }
        }
      } catch (error) {
        console.error(`Error trimming ${key}:`, error);
        localStorage.removeItem(key);
      }
    });
  },

  emergencyCleanup(): void {
    console.error('EMERGENCY: localStorage quota exceeded. Performing deep cleanup...');
    
    // 1. Move all known large keys to IndexedDB and clear from localStorage
    const largeKeys = [
      LOCAL_STORAGE_KEYS.PROJECTS,
      LOCAL_STORAGE_KEYS.USERS,
      LOCAL_STORAGE_KEYS.MESSAGES,
      ...Object.values(LOCAL_STORAGE_KEYS).filter(k => k.startsWith('staff-'))
    ];

    largeKeys.forEach(key => {
      const data = localStorage.getItem(key);
      if (data) {
        try {
          // Backup to offline storage if possible
          const parsed = JSON.parse(data);
          offlineStorage.setItem(key, parsed);
          
          // Clear or heavily truncate in localStorage
          if (key === LOCAL_STORAGE_KEYS.PROJECTS) {
            // Keep only the most recent project shell if possible, or clear
            if (Array.isArray(parsed)) {
              localStorage.setItem(key, JSON.stringify(parsed.slice(-1)));
            }
          } else {
            localStorage.removeItem(key);
          }
        } catch (e) {
          localStorage.removeItem(key);
        }
      }
    });

    // 2. Clear anything else that doesn't start with 'roadmaster-auth' or 'roadmaster-token'
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && !key.includes('authenticated') && !key.includes('token') && !key.includes('user-role') && !key.includes('user-name') && !key.includes('user-id')) {
        localStorage.removeItem(key);
        i--; // Adjust index after removal
      }
    }
    
    console.log('Emergency cleanup completed. LocalStorage size:', this.getStorageUsage().used, 'bytes');
  },

  // Get total localStorage usage
  getStorageUsage(): { used: number; available: number; percentage: number } {
    let used = 0;
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key) {
        used += getByteSize(localStorage.getItem(key) || "");
      }
    }
    // Assume 5MB limit (conservative estimate)
    const limit = 5 * 1024 * 1024;
    const available = Math.max(0, limit - used);
    const percentage = (used / limit) * 100;
    return { used, available, percentage };
  },

  // Initialize with empty data if no data exists
  initializeEmptyData(): void {
    if (!localStorage.getItem(LOCAL_STORAGE_KEYS.PROJECTS)) {
      localStorage.setItem(LOCAL_STORAGE_KEYS.PROJECTS, JSON.stringify([]));
    }

    if (!localStorage.getItem(LOCAL_STORAGE_KEYS.USERS)) {
      localStorage.setItem(LOCAL_STORAGE_KEYS.USERS, JSON.stringify([]));
    }

    if (!localStorage.getItem(LOCAL_STORAGE_KEYS.MESSAGES)) {
      localStorage.setItem(LOCAL_STORAGE_KEYS.MESSAGES, JSON.stringify([]));
    }
  },

  // Clear all data
  clearAllData(): void {
    Object.values(LOCAL_STORAGE_KEYS).forEach(key => {
      localStorage.removeItem(key);
    });
  }
};
