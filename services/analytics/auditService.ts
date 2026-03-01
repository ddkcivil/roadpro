import { AuditLog, User, Project } from '../../types';
import { offlineStorage } from '../database/offlineStorage';

/**
 * Service for handling audit logging of user actions and system events
 * Uses IndexedDB (via offlineStorage) to avoid localStorage quota limits.
 */
export class AuditService {
  private static readonly STORAGE_KEY = 'audit_logs';

  /**
   * Logs an event to the audit trail
   */
  static async logEvent(
    userId: string,
    userName: string,
    action: AuditLog['action'],
    entityType: AuditLog['entityType'],
    entityId: string,
    entityName?: string,
    oldValue?: any,
    newValue?: any,
    severity: AuditLog['severity'] = 'INFO',
    metadata?: Record<string, any>
  ): Promise<void> {
    const auditLog: AuditLog = {
      id: `audit-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
      timestamp: new Date().toISOString(),
      userId,
      userName,
      action,
      entityType,
      entityId,
      entityName,
      oldValue,
      newValue,
      severity,
      metadata: {
        ...metadata,
        userAgent: typeof window !== 'undefined' ? navigator.userAgent : undefined,
        timestamp: new Date().toISOString()
      }
    };

    try {
      // Store in IndexedDB
      const logs = await this.getAuditLogs();
      logs.unshift(auditLog); // Add to the beginning
      
      // Keep only the last 2000 logs (Increased from 1000 since IndexedDB has more space)
      const trimmedLogs = logs.slice(0, 2000);
      
      await offlineStorage.setItem(this.STORAGE_KEY, trimmedLogs);
    } catch (error) {
      console.error('Failed to save audit logs to IndexedDB:', error);
    }
  }

  /**
   * Logs a user login event
   */
  static async logLogin(userId: string, userName: string, projectId?: string, projectName?: string): Promise<void> {
    await this.logEvent(
      userId,
      userName,
      'LOGIN' as AuditLog['action'],
      'user',
      userId,
      userName,
      undefined,
      undefined,
      'INFO',
      projectId ? { projectId, projectName } : {}
    );
  }

  /**
   * Logs a user logout event
   */
  static async logLogout(userId: string, userName: string, projectId?: string, projectName?: string): Promise<void> {
    await this.logEvent(
      userId,
      userName,
      'LOGOUT' as AuditLog['action'],
      'user',
      userId,
      userName,
      undefined,
      undefined,
      'INFO',
      projectId ? { projectId, projectName } : {}
    );
  }

  /**
   * Logs a data modification event
   */
  static async logDataModification(
    userId: string,
    userName: string,
    action: 'CREATE' | 'UPDATE' | 'DELETE',
    entityType: AuditLog['entityType'],
    entityId: string,
    entityName?: string,
    oldValue?: any,
    newValue?: any,
    projectId?: string,
    projectName?: string
  ): Promise<void> {
    await this.logEvent(
      userId,
      userName,
      action,
      entityType,
      entityId,
      entityName,
      oldValue,
      newValue,
      action === 'DELETE' ? 'WARNING' : 'INFO',
      projectId ? { projectId, projectName } : {}
    );
  }

  /**
   * Logs a sensitive operation
   */
  static async logSensitiveOperation(
    userId: string,
    userName: string,
    operation: string,
    entityType: AuditLog['entityType'],
    entityId: string,
    entityName?: string,
    details?: any
  ): Promise<void> {
    await this.logEvent(
      userId,
      userName,
      operation as AuditLog['action'],
      entityType,
      entityId,
      entityName,
      undefined,
      details,
      'WARNING', // Mark as warning for sensitive operations
      {}
    );
  }

  /**
   * Gets audit logs with optional filters
   */
  static async getAuditLogs(
    filters?: {
      userId?: string;
      action?: AuditLog['action'];
      entityType?: AuditLog['entityType'];
      dateFrom?: string;
      dateTo?: string;
      severity?: AuditLog['severity'];
      projectId?: string;
    }
  ): Promise<AuditLog[]> {
    const stored = await offlineStorage.getItem<AuditLog[]>(this.STORAGE_KEY);
    let logs: AuditLog[] = stored || [];

    if (filters) {
      logs = logs.filter(log => {
        if (filters.userId && log.userId !== filters.userId) return false;
        if (filters.action && log.action !== filters.action) return false;
        if (filters.entityType && log.entityType !== filters.entityType) return false;
        if (filters.severity && log.severity !== filters.severity) return false;
        
        if (filters.dateFrom) {
          const logDate = new Date(log.timestamp);
          const fromDate = new Date(filters.dateFrom);
          if (logDate < fromDate) return false;
        }
        
        if (filters.dateTo) {
          const logDate = new Date(log.timestamp);
          const toDate = new Date(filters.dateTo);
          if (logDate > toDate) return false;
        }
        
        if (filters.projectId) {
          if (log.metadata && log.metadata.projectId !== filters.projectId) return false;
        }
        
        return true;
      });
    }

    // Sort by timestamp descending (most recent first)
    return logs.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  }

  /**
   * Exports audit logs as JSON
   */
  static async exportLogs(filters?: Parameters<typeof this.getAuditLogs>[0]): Promise<string> {
    const logs = await this.getAuditLogs(filters);
    return JSON.stringify(logs, null, 2);
  }

  /**
   * Clears old audit logs (keeps only recent ones)
   */
  static async cleanupOldLogs(keepDays: number = 180): Promise<void> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - keepDays);

    const logs = await this.getAuditLogs();
    if (!logs.length) return;

    const filteredLogs = logs.filter(log => {
      const logDate = new Date(log.timestamp);
      return logDate >= cutoffDate;
    });

    await offlineStorage.setItem(this.STORAGE_KEY, filteredLogs);
  }

  /**
   * Gets audit log statistics
   */
  static async getLogStatistics(): Promise<{
    total: number;
    byAction: Record<string, number>;
    bySeverity: Record<string, number>;
    byUser: Record<string, number>;
    byEntityType: Record<string, number>;
    last30Days: number;
  }> {
    const logs = await this.getAuditLogs();
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const stats = {
      total: logs.length,
      byAction: {} as Record<string, number>,
      bySeverity: {} as Record<string, number>,
      byUser: {} as Record<string, number>,
      byEntityType: {} as Record<string, number>,
      last30Days: 0
    };

    for (const log of logs) {
      // Count by action
      stats.byAction[log.action] = (stats.byAction[log.action] || 0) + 1;

      // Count by severity
      stats.bySeverity[log.severity] = (stats.bySeverity[log.severity] || 0) + 1;

      // Count by user
      stats.byUser[log.userId] = (stats.byUser[log.userId] || 0) + 1;

      // Count by entity type
      stats.byEntityType[log.entityType] = (stats.byEntityType[log.entityType] || 0) + 1;

      // Count logs from last 30 days
      const logDate = new Date(log.timestamp);
      if (logDate >= thirtyDaysAgo) {
        stats.last30Days++;
      }
    }

    return stats;
  }
}