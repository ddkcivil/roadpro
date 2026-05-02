import { VercelRequest, VercelResponse } from '@vercel/node';
import { supabaseAdmin } from './supabaseClient.js';
import { mongodb } from '../../lib/mongodb.js';

export const withAuth = (handler: Function, options: { ignoreExpiration?: boolean } = {}) => async (req: VercelRequest, res: VercelResponse) => {
  let token = null;
  const authHeader = req.headers.authorization;
  
  console.log('[Auth Middleware] Headers:', JSON.stringify(req.headers));

  if (authHeader && authHeader.startsWith('Bearer ')) {
    token = authHeader.split(' ')[1];
  } else if (req.headers.cookie) {
    const cookies = (req.headers.cookie || '').split(';').reduce((acc: any, cookie) => {
      if (!cookie) return acc;
      const [name, value] = cookie.trim().split('=');
      if (name) acc[name] = value;
      return acc;
    }, {});
    token = cookies['roadmaster-access'];
  }

  if (!token) {
    console.log('[Auth Middleware] No token found in Authorization header or roadmaster-access cookie.');
    return res.status(401).json({ error: 'Unauthorized: No token provided' });
  }

  try {
    // 1. Prioritize Supabase JWT Verification
    const { data: { user }, error: supError } = await supabaseAdmin.auth.getUser(token);
    
    if (supError || !user) {
      console.error('[Auth] Supabase token invalid:', supError?.message);
      return res.status(401).json({ error: 'Unauthorized: Invalid token' });
    }

    // 2. Resolve Role from Supabase profiles
    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    let userRole = profile?.role ? profile.role.toUpperCase() : 'SITE_ENGINEER';

    // 3. Fallback: Check MongoDB for legacy role mapping if profile role is missing/default
    if (!profile?.role) {
      const db = await mongodb.connect();
      const mongoUser = await db.collection('users').findOne({ _id: user.id });
      if (mongoUser?.role) {
        userRole = mongoUser.role.toUpperCase();
      }
    }

    (req as any).user = {
      userId: user.id,
      email: user.email,
      role: userRole,
    };

    return handler(req, res);
  } catch (err: any) {
    console.error('Auth middleware error:', err);
    return res.status(500).json({ error: 'Authentication failed', details: err.message });
  }
};
