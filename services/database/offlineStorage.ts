import { get, set, del, clear, keys } from 'idb-keyval';

export const offlineStorage = {
  async getItem<T>(key: string): Promise<T | undefined> {
    try {
      return await get<T>(key);
    } catch (error) {
      console.error(`Error reading key "${key}" from IndexedDB:`, error);
      return undefined;
    }
  },

  async setItem<T>(key: string, value: T): Promise<void> {
    try {
      await set(key, value);
    } catch (error) {
      console.error(`Error writing key "${key}" to IndexedDB:`, error);
    }
  },

  async removeItem(key: string): Promise<void> {
    try {
      await del(key);
    } catch (error) {
      console.error(`Error deleting key "${key}" from IndexedDB:`, error);
    }
  },

  async clearAll(): Promise<void> {
    try {
      await clear();
    } catch (error) {
      console.error('Error clearing IndexedDB:', error);
    }
  },

  async getAllKeys(): Promise<string[]> {
    try {
      const allKeys = await keys();
      return allKeys.map(k => k.toString());
    } catch (error) {
      console.error('Error getting keys from IndexedDB:', error);
      return [];
    }
  }
};
