import { VercelRequest, VercelResponse } from '@vercel/node';
import { getSupabaseAdmin, isSupabaseConfigured } from './supabaseClient.js';

export const withAuth = (handler: Function, options: { ignoreExpiration?: boolean } = {}) => async (req: VercelRequest, res: VercelResponse) => {
  let token = null;
  const authHeader = req.headers.authorization;
  const cookieHeader = req.headers.cookie;
  
  // Enhanced logging for debugging
  console.log(`[Auth Middleware] Request: ${req.method} ${req.url}`, {
    hasAuthHeader: !!authHeader,
    authHeaderPrefix: authHeader ? authHeader.substring(0, 20) : 'none',
    hasCookieHeader: !!cookieHeader,
    cookieHeaderPreview: cookieHeader ? cookieHeader.substring(0, 50) + '...' : 'none',
    timestamp: new Date().toISOString()
  });

  if (authHeader && authHeader.startsWith('Bearer ')) {
    token = authHeader.split(' ')[1];
    console.log('[Auth Middleware] ✓ Token found in Authorization header, length:', token.length);
  } else if (cookieHeader) {
    const cookies = (cookieHeader || '').split(';').reduce((acc: any, cookie) => {
      if (!cookie) return acc;
      const [name, value] = cookie.trim().split('=');
      if (name) acc[name] = value;
      return acc;
    }, {});
    token = cookies['roadmaster-access'];
    console.log('[Auth Middleware] Token from cookie:', token ? `found (${token.length} chars)` : 'NOT FOUND');
  }

  if (!token) {
    console.error('[Auth Middleware] ⚠ No token found in Authorization header or roadmaster-access cookie.');
    console.error('[Auth Middleware] Request details:', {
      url: req.url,
      method: req.method,
      hasAuthHeader: !!authHeader,
      hasCookieHeader: !!cookieHeader,
      timestamp: new Date().toISOString()
    });
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
