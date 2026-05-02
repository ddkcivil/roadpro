import { VercelRequest, VercelResponse } from '@vercel/node';
import { verifyToken, getUserById } from './mongoAuth.js';
import { supabaseAdmin } from './supabaseClient.js';
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

  console.log(`[MongoAuth] Validating token of length ${token.length}, starts with: ${token.substring(0, 15)}...`);

  try {
    let payload = await verifyToken(token);
    if (!payload) {
      console.warn('[Auth] Mongo JWT verification failed. Attempting Supabase token fallback...');
      try {
        const { data: supUser, error: supError } = await supabaseAdmin.auth.getUser(token as string) as any;
        if (supError || !supUser || !supUser.user) {
          console.error('[Auth] Supabase token check failed or returned no user:', supError?.message || 'no user');
          return res.status(401).json({ error: 'Unauthorized: Invalid token' });
        }

        // Attempt to read role from Supabase profiles table
        const { data: profile, error: profileErr } = await supabaseAdmin
          .from('profiles')
          .select('*')
          .eq('id', supUser.user.id)
          .single();

        const role = profileErr || !profile ? 'SITE_ENGINEER' : (profile.role || 'SITE_ENGINEER').toUpperCase();

        payload = {
          userId: supUser.user.id,
          email: supUser.user.email,
          role
        } as any;
      } catch (e: any) {
        console.error('[Auth] Supabase fallback error:', e);
        return res.status(401).json({ error: 'Unauthorized: Invalid token' });
      }
    }

    if (!payload) {
      return res.status(401).json({ error: 'Unauthorized: Invalid token' });
    }

    // Fetch user role from MongoDB
    // Try to fetch user from Mongo first (legacy). If not found, rely on payload.role (from Supabase fallback)
    let userRole = (payload.role || 'SITE_ENGINEER').toUpperCase();
    const userDoc = await getUserById(payload.userId).catch(() => null);
    if (userDoc) {
      userRole = (userDoc.role || userRole).toUpperCase();
    }

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
