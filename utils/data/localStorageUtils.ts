import { Project, User, Message } from '../../types';

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
  employees: 500,
  leaveRequests: 1000,
  performance: 500,
  attendance: 2000,
  salaries: 500,
  training: 500,
  evaluations: 500
};

// Helper to estimate the size of a string in bytes
const getByteSize = (str: string): number => {
  return new Blob([str]).size;
};

// Helper to check if we're close to quota and should clean up
const isNearQuota = (): boolean => {
  try {
    let totalSize = 0;
    for (const key in LOCAL_STORAGE_KEYS) {
      const item = localStorage.getItem(LOCAL_STORAGE_KEYS[key as keyof typeof LOCAL_STORAGE_KEYS]);
      if (item) {
        totalSize += getByteSize(item);
      }
    }
    // Warning if we're over 4MB (localStorage typically has 5-10MB limit)
    return totalSize > 4 * 1024 * 1024;
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
    
    localStorage.setItem(key, JSON.stringify(dataToStore));
    return true;
  } catch (error) {
    if (error instanceof DOMException && (error.name === 'QuotaExceededError' || error.name === 'NS_ERROR_DOM_QUOTA_REACHED')) {
      console.error(`Quota exceeded for ${key}. Clearing space...`);
      
      // Proactive cleanup
      LocalStorageUtils.clearOldStaffData();
      
      // If it's still users causing issue, we might need to strip avatars from everyone except current user?
      // Or just try one more time after cleanup
      try {
        localStorage.setItem(key, JSON.stringify(data));
        return true;
      } catch (retryError) {
        console.error(`Emergency: Still failing to save ${key}. Removing avatars to save space...`);
        // If it's users, try to save without avatars as last resort
        if (key === LOCAL_STORAGE_KEYS.USERS && Array.isArray(data)) {
          const noAvatars = data.map((u: any) => ({ ...u, avatar: null }));
          try {
            localStorage.setItem(key, JSON.stringify(noAvatars));
            return true;
          } catch (finalError) {
            console.error("Critical: Failed even without avatars", finalError);
          }
        }
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
    
    // Clear each staff category - they'll be rebuilt from fresh data
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
          // Keep only the most recent 50% of records
          const trimmed = parsed.slice(-Math.floor(parsed.length / 2));
          localStorage.setItem(key, JSON.stringify(trimmed));
          console.log(`Trimmed ${key} from ${parsed.length} to ${trimmed.length} records`);
        }
      } catch (error) {
        console.error(`Error trimming ${key}:`, error);
        // If trimming fails, just remove the key
        localStorage.removeItem(key);
      }
    });
  },

  // Get total localStorage usage
  getStorageUsage(): { used: number; available: number; percentage: number } {
    let used = 0;
    for (const key in LOCAL_STORAGE_KEYS) {
      const item = localStorage.getItem(LOCAL_STORAGE_KEYS[key as keyof typeof LOCAL_STORAGE_KEYS]);
      if (item) {
        used += getByteSize(item);
      }
    }
    // Assume 5MB limit (conservative estimate)
    const available = 5 * 1024 * 1024 - used;
    const percentage = (used / (5 * 1024 * 1024)) * 100;
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
    localStorage.removeItem(LOCAL_STORAGE_KEYS.PROJECTS);
    localStorage.removeItem(LOCAL_STORAGE_KEYS.USERS);
    localStorage.removeItem(LOCAL_STORAGE_KEYS.MESSAGES);
    localStorage.removeItem(LOCAL_STORAGE_KEYS.SETTINGS);
  }
};
