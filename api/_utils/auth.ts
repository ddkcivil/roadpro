import { VercelRequest, VercelResponse } from '@vercel/node';
import { verifyToken, getUserById } from './mongoAuth.js';
import { TokenPayload } from './types.js';

export const withAuth = (handler: Function, options: { ignoreExpiration?: boolean } = {}) => async (req: VercelRequest, res: VercelResponse) => {
  let token = null;
  const authHeader = req.headers.authorization;
  
  if (authHeader && authHeader.startsWith('Bearer ')) {
    token = authHeader.split(' ')[1];
  } else if (req.headers.cookie) {
    // Basic cookie parsing
    const cookies = (req.headers.cookie || '').split(';').reduce((acc: any, cookie) => {
      if (!cookie) return acc;
      const [name, value] = cookie.trim().split('=');
      if (name) acc[name] = value;
      return acc;
    }, {});
    
    // Prefer new access token cookie
    token = cookies['roadmaster-access'];
  }

  if (!token) {
    return res.status(401).json({ error: 'Unauthorized: No token provided' });
  }

  console.log(`[MongoAuth] Validating token of length ${token.length}`);

  try {
    const payload = await verifyToken(token);
    if (!payload) {
      console.error('[MongoAuth] Invalid token:', token.substring(0, 10) + '...');
      return res.status(401).json({ error: 'Unauthorized: Invalid token' });
    }

    // Fetch user role from MongoDB
    const userDoc = await getUserById(payload.userId);
    if (!userDoc) {
      console.error('[MongoAuth] User not found:', payload.userId);
      return res.status(401).json({ error: 'Unauthorized: User not found' });
    }

    const userRole = (userDoc.role || 'SITE_ENGINEER').toUpperCase();

    const decoded = {
      userId: payload.userId,
      email: payload.email,
      role: userRole,
    };

    // Add user data to request object for use in handlers
    (req as any).user = decoded;

    return handler(req, res);
  } catch (err: any) {
    console.error('MongoAuth middleware error:', err);
    return res.status(500).json({ error: 'Authentication failed', details: err.message });
  }
};

