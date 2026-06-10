import type { VercelRequest, VercelResponse } from '@vercel/node';

export const withErrorHandler = (handler: (req: VercelRequest, res: VercelResponse) => any | Promise<any>) => {
  return async (req: VercelRequest, res: VercelResponse) => {
    // Always set CORS headers first (for both success and error responses)
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With');
    res.setHeader('Access-Control-Max-Age', '86400');

    // Handle preflight OPTIONS request
    if (req.method === 'OPTIONS') {
      return res.status(204).end();
    }

    try {
      return await handler(req, res);
    } catch (error: any) {
      console.error(`[API Error] ${req.method} ${req.url}:`, error);
      
      const errorResponse = { 
        error: 'Internal Server Error',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined 
      };
      console.log('[API Error] Returning response:', JSON.stringify(errorResponse));
      
      if (error.statusCode) {
        return res.status(error.statusCode).json({ error: error.message });
      }
      
      // Default error response
      return res.status(500).json(errorResponse);
    }
  };
};
