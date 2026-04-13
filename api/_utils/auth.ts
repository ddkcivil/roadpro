import { VercelRequest, VercelResponse } from '@vercel/node';
import { supabasePublic } from './supabaseClient.js';
import { TokenPayload } from './types.js';

export const withAuth = (handler: Function, options: { ignoreExpiration?: boolean } = {}) => async (req: VercelRequest, res: VercelResponse) => {
  let token = null;
  const authHeader = req.headers.authorization;
  
  if (authHeader && authHeader.startsWith('Bearer ')) {
    token = authHeader.split(' ')[1];
  } else if (req.headers.cookie) {
    // Basic cookie parsing
    const cookies = req.headers.cookie.split(';').reduce((acc: any, cookie) => {
      const [name, value] = cookie.trim().split('=');
      acc[name] = value;
      return acc;
    }, {});
    
    // Prefer new access token cookie, fallback to legacy
    token = cookies['roadmaster-access'] || cookies['roadmaster-token'];
  }

  if (!token) {
    return res.status(401).json({ error: 'Unauthorized: No token provided' });
  }

  try {
    const { data: { user }, error } = await supabasePublic.auth.getUser(token);

    if (error || !user) {
      return res.status(401).json({ error: 'Unauthorized: Invalid token', details: error?.message });
    }

    // Map Supabase user to the legacy TokenPayload structure for compatibility
    // Prefer profiles table for role as it's more easily updated than auth metadata
    const { data: profile } = await supabasePublic
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();
    
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

