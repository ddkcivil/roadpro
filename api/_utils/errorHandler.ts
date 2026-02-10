// api/_utils/errorHandler.ts
import type { VercelRequest, VercelResponse } from '@vercel/node';

type ApiHandler = (req: VercelRequest, res: VercelResponse) => Promise<void> | void;

export function withErrorHandler(handler: ApiHandler) {
  return async (req: VercelRequest, res: VercelResponse) => {
    try {
      await handler(req, res);
    } catch (error: any) {
      console.error('Unhandled API error:', error);

      // Attempt to send a JSON error response if one hasn't been sent already
      if (!res.headersSent) {
        res.status(500).json({
          error: 'Internal Server Error',
          details: error.message || 'An unexpected error occurred.',
          stack: process.env.NODE_ENV === 'development' ? error.stack : undefined, // Include stack in dev
        });
      }
    }
  };
}
