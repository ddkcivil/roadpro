import type { VercelRequest, VercelResponse } from '@vercel/node';
import { supabaseAdmin } from './_utils/supabaseClient.js';
import { withErrorHandler } from './_utils/errorHandler.js';
import { withAuth } from './_utils/auth.js';

const handler = async function (req: VercelRequest, res: VercelResponse) {
  if (req.method === 'GET') {
    const userRole = (req as any).user?.role;
    if (userRole !== 'Admin' && userRole !== 'ADMIN') {
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

      return res.status(200).json({ logs: data || [], total: total || 0 });
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

      const { data: newLog, error } = await supabaseAdmin
        .from('audit_logs')
        .insert({
          user_id: logData.userId,
          user_name: logData.userName,
          action: logData.action,
          entity_type: logData.entityType,
          entity_id: logData.entityId,
          entity_name: logData.entityName,
          severity: logData.severity || 'INFO',
          metadata: logData.metadata || {},
          timestamp: logData.timestamp || new Date().toISOString()
        })
        .select()
        .single();

      if (error) throw error;

      return res.status(201).json(newLog);
    } catch (error: any) {
      console.error('Failed to save audit log:', error);
      throw error;
    }
  }

  return res.status(405).json({ error: 'Method Not Allowed' });
};

export default withErrorHandler(withAuth(handler));

