import type { VercelRequest, VercelResponse } from '@vercel/node';
import { withErrorHandler } from '../_utils/errorHandler.js';
import { withAuth, generateToken } from '../_utils/auth.js';

const handler = async (req: VercelRequest, res: VercelResponse) => {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    const user = (req as any).user;
    
    if (!user) {
      return res.status(401).json({ error: 'User context not found' });
    }

    // Generate a fresh token with the same identity
    const newToken = generateToken({
      userId: user.userId,
      email: user.email,
      role: user.role
    });

    // Set httpOnly cookie
    const cookieOptions = [
      `roadmaster-token=${newToken}`,
      'HttpOnly',
      'Path=/',
      'SameSite=Strict',
      'Max-Age=86400', // 24 hours
    ];
    
    if (process.env.NODE_ENV === 'production') {
      cookieOptions.push('Secure');
    }

    res.setHeader('Set-Cookie', cookieOptions.join('; '));

    return res.status(200).json({
      success: true,
      token: newToken
    });
  } catch (error: any) {
    console.error('Token refresh failed:', error);
    return res.status(500).json({ error: 'Token refresh failed', details: error.message });
  }
};

export default withErrorHandler(withAuth(handler));
