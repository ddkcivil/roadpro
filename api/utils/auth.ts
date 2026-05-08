import { VercelRequest, VercelResponse } from '@vercel/node';
import { getSupabaseAdmin, isSupabaseConfigured } from './supabaseClient.js';

export const withAuth = (handler: Function, options: { ignoreExpiration?: boolean } = {}) => async (req: VercelRequest, res: VercelResponse) => {
  let token = null;
  const authHeader = req.headers.authorization;
  const cookieHeader = req.headers.cookie;
  
  if (authHeader && authHeader.startsWith('Bearer ')) {
    token = authHeader.split(' ')[1];
  } else if (cookieHeader) {
    // Optimized cookie extraction
    const match = cookieHeader.match(/roadmaster-access=([^;]+)/);
    if (match) token = match[1];
  }

  if (!token) {
    console.error(`[Auth Middleware] 401 Unauthorized: ${req.method} ${req.url} - No token found.`);
    return res.status(401).json({ error: 'Unauthorized: No token provided' });
  }

  try {
    const supabaseReady = isSupabaseConfigured();
    const supabaseAdmin = supabaseReady ? getSupabaseAdmin() : null;
    
    if (supabaseReady && supabaseAdmin) {
      const { data: { user }, error: supError } = await supabaseAdmin.auth.getUser(token);
      
      if (!supError && user) {
        // Resolve Role from Supabase profiles ONLY (single source of truth)
        const { data: profile } = await supabaseAdmin
          .from('profiles')
          .select('role')
          .eq('id', user.id)
          .single();
          
        const userRole = (profile?.role || 'SITE_ENGINEER').toUpperCase();

        (req as any).user = {
          userId: user.id,
          email: user.email,
          role: userRole,
        };

        // Minimal success log
        console.log(`[Auth] ✓ ${user.email} (${userRole}) authorized for ${req.method} ${req.url}`);
        return handler(req, res);
      }
    }

    // Token verification failed
    console.error(`[Auth] 401 Unauthorized: Invalid token for ${req.method} ${req.url}`);
    return res.status(401).json({ error: 'Unauthorized: Invalid token', code: 'AUTH_FAILED' });

  } catch (err: any) {
    console.error(`[Auth] 500 Critical Error: ${err.message}`);
    return res.status(500).json({ error: 'Authentication failed', details: err.message });
  }
};
