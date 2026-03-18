import { offlineStorage } from '../database/offlineStorage';
import { SyncOperation } from '../../types';
import { realApiService } from './realApiService';
import { toast } from 'sonner';

const SYNC_QUEUE_KEY = 'roadmaster-sync-queue';

/**
 * Service to handle background synchronization of offline operations
 */
export class SyncService {
  /**
   * Adds an operation to the sync queue
   */
  static async enqueue(operation: Omit<SyncOperation, 'id' | 'timestamp' | 'retries'>): Promise<void> {
    const queue = await this.getQueue();
    const newOp: SyncOperation = {
      ...operation,
      id: `sync-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
      timestamp: Date.now(),
      retries: 0
    };
    
    queue.push(newOp);
    await offlineStorage.setItem(SYNC_QUEUE_KEY, queue);
    
    toast.info("Offline: Operation queued", {
      description: `Your changes to "${operation.description}" will be synced when you're back online.`,
    });
  }

  /**
   * Retrieves the current sync queue
   */
  static async getQueue(): Promise<SyncOperation[]> {
    const queue = await offlineStorage.getItem<SyncOperation[]>(SYNC_QUEUE_KEY);
    return queue || [];
  }

  /**
   * Processes all pending operations in the queue
   */
  static async processQueue(): Promise<void> {
    const queue = await this.getQueue();
    if (queue.length === 0) return;

    console.log(`[SyncService] Processing ${queue.length} pending operations...`);
    
    const remainingQueue: SyncOperation[] = [];
    let successCount = 0;
    let failCount = 0;

    for (const op of queue) {
      try {
        await realApiService.executeSyncOperation(op);
        successCount++;
      } catch (error) {
        console.error(`[SyncService] Failed to sync operation ${op.id}:`, error);
        op.retries++;
        if (op.retries < 5) {
          remainingQueue.push(op);
        }
        failCount++;
      }
    }

    await offlineStorage.setItem(SYNC_QUEUE_KEY, remainingQueue);

    if (successCount > 0) {
      toast.success("Sync Success", {
        description: `Successfully synchronized ${successCount} offline operations.`,
      });
    }

    if (failCount > 0) {
      toast.error("Sync Issues", {
        description: `${failCount} operations failed to sync and will be retried later.`,
      });
    }
  }

  /**
   * Clears the entire sync queue
   */
  static async clearQueue(): Promise<void> {
    await offlineStorage.setItem(SYNC_QUEUE_KEY, []);
  }
}
