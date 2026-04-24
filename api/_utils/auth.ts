import { VercelRequest, VercelResponse } from '@vercel/node';
import { supabasePublic, supabaseAdmin, ensureSupabaseConfigured } from './supabaseClient.js';
import { TokenPayload } from './types.js';

export const withAuth = (handler: Function, options: { ignoreExpiration?: boolean } = {}) => async (req: VercelRequest, res: VercelResponse) => {
  ensureSupabaseConfigured();
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

  console.log(`[Auth] Validating token of length ${token.length}`);

  try {
    const { data: { user }, error } = await supabasePublic.auth.getUser(token);

    if (error || !user) {
      console.error('[Auth] getUser failed for token:', token.substring(0, 10) + '...', error);
      const errorMessage = error ? `Unauthorized: ${error.message}` : 'Unauthorized: Invalid token';
      return res.status(401).json({ error: errorMessage, details: error?.message });
    }

    // Map Supabase user to the legacy TokenPayload structure for compatibility
    // Use admin client to bypass potential RLS issues on profiles table during auth
    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .maybeSingle();
    
    const userRole = profile?.role || user.user_metadata?.role || 'SITE_ENGINEER';

    const decoded: TokenPayload = {
      userId: user.id,
      email: user.email || '',
      role: userRole,
    };

    // Add user data to request object for use in handlers
    (req as any).user = decoded;

    return handler(req, res);
  } catch (err: any) {
    console.error('Auth middleware error:', err);
    return res.status(500).json({ error: 'Authentication failed', details: err.message });
  }
};

