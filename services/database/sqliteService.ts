// Lightweight pure localStorage shim for sqliteService
// Ensures the app can run cleanly in browser without loading sql.js/WASM.

import { LocalStorageUtils } from '../../utils/data/localStorageUtils';

export const sqliteService = {
  async initialize(): Promise<void> {
    console.log('[sqliteService] Initializing pure localStorage shim...');
    // Ensure storage keys exist for shim behavior
    if (!localStorage.getItem('roadmaster-users')) localStorage.setItem('roadmaster-users', JSON.stringify([]));
    if (!localStorage.getItem('roadmaster-projects')) localStorage.setItem('roadmaster-projects', JSON.stringify([]));
    if (!localStorage.getItem('roadmaster-messages')) localStorage.setItem('roadmaster-messages', JSON.stringify([]));
    if (!localStorage.getItem('roadmaster-settings')) localStorage.setItem('roadmaster-settings', JSON.stringify({}));
    console.log('[sqliteService] Fallback initialized.');
    return Promise.resolve();
  },

  isAvailable(): boolean {
    return false; // Indicating sql.js is not active, fallback in use
  },

  async getAllUsers(): Promise<any[]> {
    const raw = localStorage.getItem('roadmaster-users');
    return raw ? JSON.parse(raw) : [];
  },

  async getAllProjects(): Promise<any[]> {
    const raw = localStorage.getItem('roadmaster-projects');
    return raw ? JSON.parse(raw) : [];
  },

  async getAllMessages(): Promise<any[]> {
    const raw = localStorage.getItem('roadmaster-messages');
    return raw ? JSON.parse(raw) : [];
  },

  async insert(table: string, record: any): Promise<void> {
    try {
      const key = table === 'settings' ? 'roadmaster-settings' : table === 'users' ? 'roadmaster-users' : table === 'projects' ? 'roadmaster-projects' : table === 'messages' ? 'roadmaster-messages' : null;
      if (!key) return;
      
      const raw = localStorage.getItem(key) || (key === 'roadmaster-settings' ? '{}' : '[]');
      let data = JSON.parse(raw);
      
      if (key === 'roadmaster-settings') {
        const updatedSettings = { ...data, ...record };
        try {
          localStorage.setItem(key, JSON.stringify(updatedSettings));
          console.debug(`[sqliteService] Settings updated. Size: ${(JSON.stringify(updatedSettings).length / 1024).toFixed(1)}KB`);
        } catch (e: any) {
          if (e.name === 'QuotaExceededError' || e.name === 'NS_ERROR_DOM_QUOTA_REACHED') {
            console.warn('[sqliteService] Settings quota exceeded, pruning...');
            if (LocalStorageUtils && LocalStorageUtils.emergencyCleanup) {
              LocalStorageUtils.emergencyCleanup();
            }
            // Retry with minimal settings
            const minimalSettings = { last_cleanup: Date.now().toString() };
            localStorage.setItem(key, JSON.stringify(minimalSettings));
          } else throw e;
        }
        return;
      } 

      // Array tables: users, projects, messages
      if (Array.isArray(data)) {
        data.push(record);
        // PRUNING: Keep only last 100 items to prevent unbounded growth
        if (data.length > 100) {
          data = data.slice(-100);
          console.debug(`[sqliteService] Pruned ${key} to 100 items (was ${data.length + (data.length - 100)})`);
        }
        
        try {
          localStorage.setItem(key, JSON.stringify(data));
          console.debug(`[sqliteService] ${key} inserted. Count: ${data.length}, Size: ${(JSON.stringify(data).length / 1024).toFixed(1)}KB`);
        } catch (e: any) {
          if (e.name === 'QuotaExceededError' || e.name === 'NS_ERROR_DOM_QUOTA_REACHED') {
            console.warn(`[sqliteService] ${key} quota exceeded, aggressive prune...`);
            if (LocalStorageUtils && LocalStorageUtils.emergencyCleanup) {
              LocalStorageUtils.emergencyCleanup();
            }
            // Keep only newest 50 items
            const pruned = data.slice(-50);
            localStorage.setItem(key, JSON.stringify(pruned));
            console.debug(`[sqliteService] Emergency prune ${key} to ${pruned.length} items`);
          } else throw e;
        }
      }
    } catch (err) {
      console.error('[sqliteService] insert shim error:', err);
    }
  },

  async select(table: string, cols: string[] = [], where?: string, params?: any[]): Promise<any[]> {
    if (table === 'settings') {
      const raw = localStorage.getItem('roadmaster-settings') || '{}';
      const obj = JSON.parse(raw);
      if (where && params && params.length > 0) {
        const key = params[0];
        const value = obj[key];
        return value ? [{ key, value }] : [];
      }
      return Object.keys(obj).map(k => ({ key: k, value: obj[k] }));
    }
    if (table === 'users') return this.getAllUsers();
    if (table === 'projects') return this.getAllProjects();
    if (table === 'messages') return this.getAllMessages();
    return [];
  },

  async executeQuery(query: string): Promise<any[]> {
    console.debug('sqliteService.executeQuery: shim does not execute SQL. Query ignored.', query);
    return [];
  },

  async getProjectStats(_projectId: string): Promise<any> {
    // Return dummy stats since we don't have SQL aggregations in the fallback
    return { boq_items_count: 0, rfis_count: 0, lab_tests_count: 0, avg_schedule_progress: 0, daily_reports_count: 0 };
  }
};

export default sqliteService;
