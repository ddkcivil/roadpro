// api/health.ts
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { connectToDatabase } from './_utils/mysqlConnect.js'; // Changed import path
import { withErrorHandler } from './_utils/errorHandler.js';

export default withErrorHandler(async function (req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') {
    res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    const { sequelize } = await connectToDatabase(); // Get sequelize instance
    await sequelize.authenticate(); // This will throw an error if not connected
    
    res.status(200).json({ 
      status: 'ok', 
      timestamp: new Date().toISOString(),
      database: 'connected (MySQL)'
    });
  } catch (error: any) {
    console.error('Health check failed:', error);
    res.status(500).json({ error: 'Health check failed', details: error.message });
  }
})