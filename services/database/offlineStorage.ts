import { get, set, del, clear, keys } from 'idb-keyval';

/**
 * Robust offline storage wrapper that handles Safari's "Operation is insecure" 
 * errors (common in Private Browsing) by falling back to in-memory storage.
 */

// In-memory fallback for environments where IndexedDB is restricted (e.g., Safari Private Mode)
const memoryStorage = new Map<string, any>();

// Detection function for storage availability
const isIndexedDBAvailable = (): boolean => {
  try {
    if (typeof window === 'undefined' || !window.indexedDB) return false;
    return true;
  } catch (e) {
    return false;
  }
};

const idbAvailable = isIndexedDBAvailable();

export const offlineStorage = {
  async getItem<T>(key: string): Promise<T | undefined> {
    if (!idbAvailable) return memoryStorage.get(key);
    
    try {
      return await get<T>(key);
    } catch (error) {
      if (error instanceof Error && error.name === 'SecurityError') {
        console.warn('IndexedDB restricted (Safari Private Mode?). Using memory fallback.');
        return memoryStorage.get(key);
      }
      console.error(`Error reading key "${key}" from IndexedDB:`, error);
      return memoryStorage.get(key);
    }
  },

  async setItem<T>(key: string, value: T): Promise<void> {
    if (!idbAvailable) {
      memoryStorage.set(key, value);
      return;
    }

    try {
      await set(key, value);
    } catch (error) {
      if (error instanceof Error && error.name === 'SecurityError') {
        memoryStorage.set(key, value);
      } else {
        console.error(`Error writing key "${key}" to IndexedDB:`, error);
      }
    }
  },

  async removeItem(key: string): Promise<void> {
    memoryStorage.delete(key);
    if (!idbAvailable) return;

    try {
      await del(key);
    } catch (error) {
      console.error(`Error deleting key "${key}" from IndexedDB:`, error);
    }
  },

  async clearAll(): Promise<void> {
    memoryStorage.clear();
    if (!idbAvailable) return;

    try {
      await clear();
    } catch (error) {
      console.error('Error clearing IndexedDB:', error);
    }
  },

  async getAllKeys(): Promise<string[]> {
    const memKeys = Array.from(memoryStorage.keys());
    if (!idbAvailable) return memKeys;

    try {
      const allKeys = await keys();
      const idbKeys = allKeys.map(k => k.toString());
      return Array.from(new Set([...memKeys, ...idbKeys]));
    } catch (error) {
      console.error('Error getting keys from IndexedDB:', error);
      return memKeys;
    }
  }
};
