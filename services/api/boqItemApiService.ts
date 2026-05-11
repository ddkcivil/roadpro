// services/api/boqItemApiService.ts
import { BoqItem } from '../../types';
import { apiService } from './apiService';

const BASE_URL = '/api/boq-items';

/**
 * BoqItemApiService
 * Handles all API communication for Bill of Quantities items.
 */
class BoqItemApiService {
  private static instance: BoqItemApiService;

  constructor() {
    // Private constructor for singleton
  }

  public static getInstance(): BoqItemApiService {
    if (!BoqItemApiService.instance) {
      BoqItemApiService.instance = new BoqItemApiService();
    }
    return BoqItemApiService.instance;
  }

  /**
   * Fetches all BOQ items for a given project.
   */
  async getBoqItems(projectId: string): Promise<BoqItem[]> {
    const response = await apiService.fetchApi(`${BASE_URL}?projectId=${projectId}`, { method: 'GET' }, true) as BoqItem[];
    return response || [];
  }

  /**
   * Creates a new BOQ item.
   */
  async createBoqItem(itemData: BoqItem): Promise<BoqItem> {
    const response = await apiService.fetchApi(BASE_URL, {
      method: 'POST',
      body: JSON.stringify(itemData),
    }) as BoqItem;
    return response;
  }

  /**
   * Updates an existing BOQ item.
   */
  async updateBoqItem(id: string, itemData: Partial<BoqItem>): Promise<BoqItem> {
    const response = await apiService.fetchApi(`${BASE_URL}?id=${id}`, {
      method: 'PUT',
      body: JSON.stringify(itemData),
    }) as BoqItem;
    return response;
  }

  /**
   * Deletes a BOQ item.
   */
  async deleteBoqItem(id: string): Promise<void> {
    await apiService.fetchApi(`${BASE_URL}?id=${id}`, {
      method: 'DELETE',
    });
  }
}

export const boqItemApiService = BoqItemApiService.getInstance();
