import type { VercelRequest, VercelResponse } from '@vercel/node';
import { connectToDatabase } from './_utils/dbConnect.js';
import { withErrorHandler } from './_utils/errorHandler.js';
import { withAuth } from './_utils/auth.js';

const handler = async function (req: VercelRequest, res: VercelResponse) {
  if (req.method === 'GET') {
    const userRole = (req as any).user?.role;
    if (userRole !== 'Admin' && userRole !== 'ADMIN') {
      return res.status(403).json({ error: 'Access denied. Admins only.' });
    }

    try {
      const { AuditLog } = await connectToDatabase();
      const { userId, action, entityType, limit = '100', offset = '0' } = req.query;
      
      const query: any = {};
      if (userId) query.userId = userId;
      if (action) query.action = action;
      if (entityType) query.entityType = entityType;

      const logs = await AuditLog.find(query)
        .sort({ timestamp: -1 })
        .limit(parseInt(limit as string))
        .skip(parseInt(offset as string));
      
      const total = await AuditLog.countDocuments(query);

      return res.status(200).json({ logs, total });
    } catch (error: any) {
      console.error('Failed to fetch audit logs:', error);
      return res.status(500).json({ error: 'Failed to fetch audit logs', details: error.message });
    }
  } 
  
  if (req.method === 'POST') {
    try {
      const { AuditLog } = await connectToDatabase();
      const logData = req.body;

      if (!logData.id || !logData.userId || !logData.action) {
        return res.status(400).json({ error: 'Invalid log data' });
      }

      const newLog = new AuditLog(logData);
      await newLog.save();

      return res.status(201).json(newLog);
    } catch (error: any) {
      console.error('Failed to save audit log:', error);
      return res.status(500).json({ error: 'Failed to save audit log', details: error.message });
    }
  }

  return res.status(405).json({ error: 'Method Not Allowed' });
};

export default withErrorHandler(withAuth(handler));
