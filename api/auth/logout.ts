import type { VercelRequest, VercelResponse } from '@vercel/node';
import { withErrorHandler } from '../_utils/errorHandler.js';

const handler = async (req: VercelRequest, res: VercelResponse) => {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  // Clear httpOnly cookie by setting an expired date
  res.setHeader('Set-Cookie', [
    'roadmaster-token=; HttpOnly; Path=/; SameSite=Strict; Max-Age=0; Expires=Thu, 01 Jan 1970 00:00:00 GMT'
  ]);

  return res.status(200).json({
    success: true,
    message: 'Logged out successfully'
  });
};

export default withErrorHandler(handler);
