import { AuditLog, User, Project } from '../../types';

/**
 * Service for handling audit logging of user actions and system events
 */
export class AuditService {
  private static readonly STORAGE_KEY = 'audit_logs';

  /**
   * Logs an event to the audit trail
   */
  static logEvent(
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
  ): void {
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

    // Store in localStorage
    const logs = this.getAuditLogs();
    logs.unshift(auditLog); // Add to the beginning
    
    // Keep only the last 1000 logs to prevent storage overflow
    const trimmedLogs = logs.slice(0, 1000);
    
    try {
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(trimmedLogs));
    } catch (error) {
      console.error('Failed to save audit logs to localStorage (likely circular structure or quota exceeded):', error);
      // Try again with a safer approach for the last log
      try {
        const saferLog = { ...auditLog, oldValue: '[Circular]', newValue: '[Circular]', metadata: { ...auditLog.metadata, error: 'Circular reference removed' } };
        const saferLogs = [saferLog, ...logs.slice(1, 1000)];
        localStorage.setItem(this.STORAGE_KEY, JSON.stringify(saferLogs));
      } catch (innerError) {
        console.error('Even safe storage failed:', innerError);
      }
    }
  }

  /**
   * Logs a user login event
   */
  static logLogin(userId: string, userName: string, projectId?: string, projectName?: string): void {
    this.logEvent(
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
  static logLogout(userId: string, userName: string, projectId?: string, projectName?: string): void {
    this.logEvent(
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
  static logDataModification(
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
  ): void {
    this.logEvent(
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
  static logSensitiveOperation(
    userId: string,
    userName: string,
    operation: string,
    entityType: AuditLog['entityType'],
    entityId: string,
    entityName?: string,
    details?: any
  ): void {
    this.logEvent(
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
  static getAuditLogs(
    filters?: {
      userId?: string;
      action?: AuditLog['action'];
      entityType?: AuditLog['entityType'];
      dateFrom?: string;
      dateTo?: string;
      severity?: AuditLog['severity'];
      projectId?: string;
    }
  ): AuditLog[] {
    const stored = localStorage.getItem(this.STORAGE_KEY);
    let logs: AuditLog[] = stored ? JSON.parse(stored) : [];

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
  static exportLogs(filters?: Parameters<typeof this.getAuditLogs>[0]): string {
    const logs = this.getAuditLogs(filters);
    return JSON.stringify(logs, null, 2);
  }

  /**
   * Clears old audit logs (keeps only recent ones)
   */
  static cleanupOldLogs(keepDays: number = 90): void {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - keepDays);

    const stored = localStorage.getItem(this.STORAGE_KEY);
    if (!stored) return;

    const logs: AuditLog[] = JSON.parse(stored);
    const filteredLogs = logs.filter(log => {
      const logDate = new Date(log.timestamp);
      return logDate >= cutoffDate;
    });

    localStorage.setItem(this.STORAGE_KEY, JSON.stringify(filteredLogs));
  }

  /**
   * Gets audit log statistics
   */
  static getLogStatistics(): {
    total: number;
    byAction: Record<string, number>;
    bySeverity: Record<string, number>;
    byUser: Record<string, number>;
    byEntityType: Record<string, number>;
    last30Days: number;
  } {
    const logs = this.getAuditLogs();
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