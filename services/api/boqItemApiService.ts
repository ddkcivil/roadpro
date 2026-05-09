// services/api/boqItemApiService.ts
import { BoqItem } from '../../types'; // Assuming BoqItem type is defined in types.ts
import { apiService } from './apiService'; // Assuming apiService provides fetchWithRetry or similar

const BASE_URL = '/api/boq-items'; // Base URL for BOQ items API

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
    // Assuming GET /api/boq-items?projectId=...
    const response = await apiService.fetchApi<BoqItem[]>(`${BASE_URL}?projectId=${projectId}`, { method: 'GET' }, true);
    return response || [];
  }

  /**
   * Creates a new BOQ item.
   */
  async createBoqItem(itemData: BoqItem): Promise<BoqItem> {
    // Assuming POST /api/boq-items
    const response = await apiService.fetchApi<BoqItem>(BASE_URL, {
      method: 'POST',
      body: JSON.stringify(itemData),
    });
    return response;
  }

  /**
   * Updates an existing BOQ item.
   */
  async updateBoqItem(id: string, itemData: Partial<BoqItem>): Promise<BoqItem> {
    // Assuming PUT /api/boq-items?id=...
    const response = await apiService.fetchApi<BoqItem>(`${BASE_URL}?id=${id}`, {
      method: 'PUT',
      body: JSON.stringify(itemData),
    });
    return response;
  }

  /**
   * Deletes a BOQ item.
   */
  async deleteBoqItem(id: string): Promise<void> {
    // Assuming DELETE /api/boq-items?id=...
    await apiService.fetchApi(`${BASE_URL}?id=${id}`, {
      method: 'DELETE',
    });
  }
}

export const boqItemApiService = BoqItemApiService.getInstance();
