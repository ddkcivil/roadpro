import { offlineStorage } from '../database/offlineStorage';

export interface ErrorLog {
  id: string;
  message: string;
  stack?: string;
  componentStack?: string;
  timestamp: number;
  url: string;
  userAgent: string;
  metadata?: any;
}

const ERROR_LOGS_KEY = 'roadmaster-error-logs';

/**
 * Service for capturing and reporting runtime errors.
 * In production, this would send data to a service like Sentry or LogRocket.
 */
export class ErrorReportingService {
  /**
   * Captures an error and stores it locally for inspection or later sync.
   */
  static async captureError(error: Error, errorInfo?: React.ErrorInfo, metadata?: any): Promise<void> {
    const errorLog: ErrorLog = {
      id: `err-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
      message: error.message,
      stack: error.stack,
      componentStack: errorInfo?.componentStack,
      timestamp: Date.now(),
      url: window.location.href,
      userAgent: navigator.userAgent,
      metadata
    };

    console.error('[ErrorReportingService] Captured error:', errorLog);

    // Store in IndexedDB via offlineStorage
    try {
      const logs = await offlineStorage.getItem<ErrorLog[]>(ERROR_LOGS_KEY) || [];
      logs.push(errorLog);
      // Keep only last 50 logs
      await offlineStorage.setItem(ERROR_LOGS_KEY, logs.slice(-50));
    } catch (e) {
      console.warn('Failed to store error log locally', e);
    }
  }

  /**
   * Retrieves all captured error logs.
   */
  static async getLogs(): Promise<ErrorLog[]> {
    return await offlineStorage.getItem<ErrorLog[]>(ERROR_LOGS_KEY) || [];
  }

  /**
   * Clears all captured error logs.
   */
  static async clearLogs(): Promise<void> {
    await offlineStorage.removeItem(ERROR_LOGS_KEY);
  }
}
