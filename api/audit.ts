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
  
  // 📊 POST /api/audit - PUBLIC ENDPOINT (no auth required)
  // Uses supabaseAdmin service role key for fire-and-forget audit logging
  // Called during logout when no user session exists
  if (req.method === 'POST') {
    console.log('📊 AUDIT POST - PUBLIC ENDPOINT, no auth required');
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

      return res.status(200).json({ success: true, message: 'Audit log queued' });
    } catch (error: any) {
      console.error('Failed to process audit log:', error);
      return res.status(500).json({ error: 'Audit processing failed' });
    }
  }

  return res.status(405).json({ error: 'Method Not Allowed' });
};

export default withErrorHandler(async (req: VercelRequest, res: VercelResponse) => {
  // POST /api/audit is PUBLIC - skips withAuth (fire-and-forget audit logging)
  // GET requires admin auth  
  if (req.method === 'POST') {
    console.log('🎯 AUDIT ROUTE: POST path taken (PUBLIC)');
    return handler(req, res);
  }
  console.log('🎯 AUDIT ROUTE: GET path taken (withAuth ADMIN only)');
  return withAuth(handler)(req, res);
});

