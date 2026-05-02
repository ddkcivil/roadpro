import type { VercelRequest, VercelResponse } from '@vercel/node';

export const withErrorHandler = (handler: (req: VercelRequest, res: VercelResponse) => any | Promise<any>) => {
  return async (req: VercelRequest, res: VercelResponse) => {
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
