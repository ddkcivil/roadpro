import { VercelRequest, VercelResponse } from '@vercel/node';
import { getSupabaseAdmin, isSupabaseConfigured } from './supabaseClient.js';

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
    console.log('[Auth] Supabase configured:', supabaseReady);
    
    const supabaseAdmin = supabaseReady ? getSupabaseAdmin() : null;
    console.log('[Auth] Supabase admin client:', supabaseAdmin ? 'available' : 'NULL');
    
    if (supabaseReady && supabaseAdmin) {
      try {
        console.log('[Auth] Calling supabaseAdmin.auth.getUser...');
        const { data: { user }, error: supError } = await supabaseAdmin.auth.getUser(token);
        console.log('[Auth] getUser completed, error:', supError?.message, 'user:', user ? 'found' : 'not found');
        
        if (!supError && user) {
          // --- Supabase Authentication Successful ---
          console.log('[Auth] User authenticated, resolving role from profiles...');
          
          // Resolve Role from Supabase profiles ONLY (single source of truth)
          const { data: profile, error: profileError } = await supabaseAdmin
            .from('profiles')
            .select('role')
            .eq('id', user.id)
            .single();
            
          console.log('[Auth] Profile query result:', profileError ? profileError.message : 'success', 'role:', profile?.role);

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
        console.log('[Auth] Supabase verification exception:', supErr.message, supErr.stack);
      }
    } else {
      console.log('[Auth] Supabase not configured.');
    }

    // Token verification failed - return 401 with detailed error
    console.error('[Auth] Token verification failed for Supabase.');
    return res.status(401).json({ error: 'Unauthorized: Invalid token', code: 'AUTH_FAILED' });

  } catch (err: any) {
    console.error('Auth middleware critical error:', err);
    return res.status(500).json({ error: 'Authentication failed', details: err.message });
  }
};
