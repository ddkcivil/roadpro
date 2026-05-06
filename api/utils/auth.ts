import { VercelRequest, VercelResponse } from '@vercel/node';
import { supabaseAdmin, isSupabaseConfigured } from './supabaseClient.js';

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
    // Use Supabase JWT Verification only
    const supabaseReady = isSupabaseConfigured();
    if (supabaseReady && supabaseAdmin) {
      try {
        const { data: { user }, error: supError } = await supabaseAdmin.auth.getUser(token);
        
        if (!supError && user) {
          // --- Supabase Authentication Successful ---
          
          // Resolve Role from Supabase profiles ONLY (single source of truth)
          const { data: profile } = await supabaseAdmin
            .from('profiles')
            .select('role')
            .eq('id', user.id)
            .single();

          const userRole = profile?.role ? profile.role.toUpperCase() : 'SITE_ENGINEER';

          (req as any).user = {
            userId: user.id,
            email: user.email,
            role: userRole,
          };

          console.log('[Auth] Supabase auth successful for:', user.email, 'role:', userRole);
          return handler(req, res);
        }
        if (supError) {
          console.log('[Auth] Supabase verification error:', supError.message);
        }
      } catch (supErr: any) {
        console.log('[Auth] Supabase verification exception:', supErr.message);
      }
    } else {
      console.log('[Auth] Supabase not configured.');
    }

    // Token verification failed
    console.error('[Auth] Token verification failed for Supabase.');
    return res.status(401).json({ error: 'Unauthorized: Invalid token' });

  } catch (err: any) {
    console.error('Auth middleware critical error:', err);
    return res.status(500).json({ error: 'Authentication failed', details: err.message });
  }
};
