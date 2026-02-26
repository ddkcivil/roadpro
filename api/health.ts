// api/health.ts
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { connectToDatabase } from './_utils/dbConnect.js';
import { withErrorHandler } from './_utils/errorHandler.js';

export default withErrorHandler(async function (req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    const envVars = Object.keys(process.env);
    const hasUri = envVars.includes('MONGODB_URI') || envVars.includes('MONGO_URI');
    
    console.log('Environment variables check:', { hasUri });

    const { mongoose } = await connectToDatabase();
    const state = mongoose.connection.readyState;
    const states: Record<number, string> = { 0: 'disconnected', 1: 'connected', 2: 'connecting', 3: 'disconnecting' };
    
    if (state === 1) {
      res.status(200).json({
        status: 'ok',
        timestamp: new Date().toISOString(),
        database: 'connected (MongoDB)',
        nodeVersion: process.version,
        envCheck: { hasUri }
      });
    } else {
      res.status(500).json({ 
        error: 'Database not connected', 
        currentState: states[state] || 'unknown',
        envCheck: { hasUri }
      });
    }
  } catch (error: any) {
    console.error('CRITICAL Health check failed:', error);
    res.status(500).json({ 
      error: 'CRITICAL Health check failed', 
      details: error.message,
      type: error.name
    });
  }
})

