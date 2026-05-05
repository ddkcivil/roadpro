import { VercelRequest, VercelResponse } from '@vercel/node';
import { supabaseAdmin } from './supabaseClient.js';
import { mongodb } from '../../lib/mongodb.js';
import { verifyToken } from './mongoAuth.js';

export const withAuth = (handler: Function, options: { ignoreExpiration?: boolean } = {}) => async (req: VercelRequest, res: VercelResponse) => {
  let token = null;
  const authHeader = req.headers.authorization;
  
  // Minimal logging to avoid noise, but keep critical info
  console.log(`[Auth Middleware] Request: ${req.method} ${req.url}`);

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
    // 1. Try Supabase JWT Verification
    if (supabaseAdmin) {
      const { data: { user }, error: supError } = await supabaseAdmin.auth.getUser(token);
      
      if (!supError && user) {
        // --- Supabase Authentication Successful ---
        
        // Resolve Role from Supabase profiles
        const { data: profile } = await supabaseAdmin
          .from('profiles')
          .select('role')
          .eq('id', user.id)
          .single();

        let userRole = profile?.role ? profile.role.toUpperCase() : 'SITE_ENGINEER';

        // Fallback: Check MongoDB for legacy role mapping if profile role is missing/default
        if (!profile?.role) {
          try {
            const db = await mongodb.connect();
            const mongoUser = await db.collection('users').findOne({ _id: user.id });
            if (mongoUser?.role) {
              userRole = mongoUser.role.toUpperCase();
            }
          } catch (mErr) {
            console.warn('[Auth] MongoDB role fallback failed (non-critical):', (mErr as any).message);
          }
        }

        (req as any).user = {
          userId: user.id,
          email: user.email,
          role: userRole,
        };

        return handler(req, res);
      }
      if (supError) {
        console.log('[Auth] Supabase verification error:', supError.message);
      }
    } else {
      console.log('[Auth] Supabase not configured, skipping Supabase verification.');
    }

    // 2. Fallback: Try MongoDB JWT Verification
    console.log('[Auth] Trying MongoDB fallback verification...');
    const mongoPayload = await verifyToken(token);
    
    if (mongoPayload) {
      console.log('[Auth] MongoDB token verification successful for user:', mongoPayload.email);
      (req as any).user = {
        userId: mongoPayload.userId,
        email: mongoPayload.email,
        role: mongoPayload.role.toUpperCase(),
      };
      return handler(req, res);
    }

    // Both failed
    console.error('[Auth] Token verification failed for all providers. Supabase error:', supError?.message);
    return res.status(401).json({ error: 'Unauthorized: Invalid token' });

  } catch (err: any) {
    console.error('Auth middleware critical error:', err);
    return res.status(500).json({ error: 'Authentication failed', details: err.message });
  }
};
