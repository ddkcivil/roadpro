import type { VercelRequest, VercelResponse } from '@vercel/node';
import { supabaseAdmin } from './_utils/supabaseClient.js';
import { withErrorHandler } from './_utils/errorHandler.js';
import { withAuth } from './_utils/auth.js';
import { mapAuditLogFromDb, mapAuditLogToDb } from './_utils/mappers.js';

const handler = async function (req: VercelRequest, res: VercelResponse) {
  if (req.method === 'GET') {
    const userRole = (req as any).user?.role;
    if (userRole?.toUpperCase() !== 'ADMIN') {
      return res.status(403).json({ error: 'Access denied. Admins only.' });
    }

    try {
      const { userId, action, entityType, limit = '100', offset = '0' } = req.query;
      
      let queryBuilder = supabaseAdmin.from('audit_logs').select('*', { count: 'exact' });

      if (userId) queryBuilder = queryBuilder.eq('user_id', userId);
      if (action) queryBuilder = queryBuilder.eq('action', action);
      if (entityType) queryBuilder = queryBuilder.eq('entity_type', entityType);

      const limitNum = parseInt(limit as string);
      const offsetNum = parseInt(offset as string);

      const { data, count: total, error } = await queryBuilder
        .order('timestamp', { ascending: false })
        .range(offsetNum, offsetNum + limitNum - 1);
      
      if (error) throw error;
      
      const mappedLogs = (data || []).map(mapAuditLogFromDb);
      return res.status(200).json({ logs: mappedLogs, total: total || 0 });
    } catch (error: any) {
      console.error('Failed to fetch audit logs:', error);
      throw error;
    }
  } 
  
  if (req.method === 'POST') {
    try {
      const logData = req.body;

      if (!logData.userId || !logData.action) {
        return res.status(400).json({ error: 'Invalid log data' });
      }

      // Fire-and-forget audit logging - don't fail the request if DB issues
      (async () => {
        try {
          await supabaseAdmin
            .from('audit_logs')
            .insert(mapAuditLogToDb({
              userId: logData.userId,
              userName: logData.userName,
              action: logData.action,
              entityType: logData.entityType,
              entityId: logData.entityId,
              entityName: logData.entityName,
              severity: logData.severity || 'INFO',
              metadata: logData.metadata || {},
              timestamp: logData.timestamp || new Date().toISOString()
            }));
        } catch (dbError: any) {
          console.error('Audit log DB failed (continuing):', dbError);
        }
      })();

      return res.status(200).json({ success: true });
    } catch (error: any) {
      console.error('Failed to process audit log:', error);
      return res.status(500).json({ error: 'Audit processing failed' });
    }
  }

  return res.status(405).json({ error: 'Method Not Allowed' });
};

export default withErrorHandler(async (req: VercelRequest, res: VercelResponse) => {
  if (req.method === 'POST') {
    return handler(req, res);
  }
  return withAuth(handler)(req, res);
});

