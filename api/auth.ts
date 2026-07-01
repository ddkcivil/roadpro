import type { VercelRequest, VercelResponse } from '@vercel/node';
import { withErrorHandler } from './_utils/errorHandler.js';
import { mapUserFromDb } from './_utils/mappers.js';
import { getSupabasePublic, isSupabaseConfigured, getSupabaseConfigStatus } from './_utils/supabaseClient.js';

// Debug: Log startup and env availability
const configStatus = getSupabaseConfigStatus();

console.log('[Auth API] Server started. Env check:', {
  hasSupabaseUrl: configStatus.hasUrl,
  hasSupabaseKey: configStatus.hasKey,
  urlValid: configStatus.urlValid,
  keyValid: configStatus.keyValid,
  nodeEnv: process.env.NODE_ENV,
  vercelEnv: process.env.VERCEL,
  vercelEnvType: process.env.VERCEL_ENV,
  vercelRegion: process.env.VERCEL_REGION,
  timestamp: new Date().toISOString()
});

const handler = async function (req: VercelRequest, res: VercelResponse) {
  // ALWAYS set JSON header first
  res.setHeader('Content-Type', 'application/json');

  try {
    const { action } = req.query;

    if (req.method === 'POST') {
      // --- LOGIN ---
      if (action === 'login') {
        const { email, password } = req.body;
        console.log('[Auth API] Login attempt for:', email);

        if (!email || !password) {
          return res.status(400).json({ error: 'Email and password are required' });
        }

        const supabaseConfigured = isSupabaseConfigured();
        if (!supabaseConfigured) {
          console.error('[Auth API] Supabase not configured - check SUPABASE_URL and SUPABASE_ANON_KEY');
          return res.status(503).json({ error: 'Authentication service not configured', hint: 'Set SUPABASE_URL and SUPABASE_ANON_KEY in Vercel env' });
        }

        let supabase = null;
        try {
          supabase = getSupabasePublic();
          if (!supabase) {
            console.error('[Auth API] Public client null - check SUPABASE_ANON_KEY');
            return res.status(503).json({ error: 'Authentication service not configured', hint: 'Verify SUPABASE_ANON_KEY is valid' });
          }
          
          const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
            email,
            password,
          });

          if (authError) {
            console.log('[Auth API] Supabase auth error:', authError.message);
            return res.status(401).json({ error: 'Invalid email or password' });
          }

          if (!authData?.session) {
            return res.status(401).json({ error: 'Invalid email or password' });
          }

          const userId = authData.user.id;
          
          let profile = null;
          try {
            const { data: profileData } = await supabase
              .from('profiles')
              .select('*')
              .eq('id', userId)
              .single();
            profile = profileData;
          } catch (profErr: any) {
            console.warn('[Auth API] Profile fetch exception:', profErr.message);
          }

          res.setHeader('Set-Cookie', `roadmaster-access=${authData.session.access_token}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${7 * 24 * 60 * 60}`);

          const safeUser = mapUserFromDb({
            id: userId,
            email: authData.user.email,
            ...(profile || {})
          });

          return res.status(200).json({
            user: safeUser,
            token: authData.session.access_token,
            refreshToken: authData.session.refresh_token // <-- FIX: return refresh token so frontend can refresh expired tokens
          });
        } catch (supEx: any) {
          console.error('[Auth API] Supabase auth exception:', supEx.message);
          return res.status(503).json({ error: 'Authentication temporarily unavailable.' });
        }
      } // end login

      // --- SIGNUP ---
      if (action === 'signup') {
        const { email, password, name } = req.body;
        if (!email || !password || !name) {
          return res.status(400).json({ error: 'Email, password, and name are required' });
        }

        const supabase = getSupabasePublic();
        if (!supabase) return res.status(503).json({ error: 'Auth service error' });

        const { data: authData, error: authError } = await supabase.auth.signUp({
          email,
          password,
          options: { data: { name } }
        });

        if (!authError && authData?.user) {
          return res.status(200).json({
            user: { id: authData.user.id, email: authData.user.email, name },
            message: 'Check your email to complete registration'
          });
        }
        return res.status(400).json({ error: authError?.message || 'Signup failed' });
      } // end signup

      // --- VERIFY ---
      if (action === 'verify') {
        let token = null;
        const authHeader = req.headers.authorization;
        if (authHeader?.startsWith('Bearer ')) {
          token = authHeader.split(' ')[1];
        } else if (req.headers.cookie) {
          const cookies = req.headers.cookie.split(';').reduce((acc: any, cookie) => {
            const [name, value] = cookie.trim().split('=');
            if (name) acc[name] = value;
            return acc;
          }, {});
          // Must URL-decode since frontend encodes with encodeURIComponent
          const rawToken = cookies['roadmaster-access'];
          if (rawToken) token = decodeURIComponent(rawToken);
        }

        if (!token) return res.status(401).json({ valid: false, error: 'No token' });

        const supabase = getSupabasePublic();
        if (supabase) {
          const { data: { user } } = await supabase.auth.getUser(token);
          if (user) {
            return res.status(200).json({ valid: true, user: { userId: user.id, email: user.email } });
          }
        }
        return res.status(401).json({ valid: false, error: 'Invalid token' });
      } // end verify

      // --- REFRESH ---
      if (action === 'refresh') {
        const refreshToken = req.body?.refresh_token;
        if (!refreshToken) return res.status(400).json({ error: 'Refresh token required' });

        const supabase = getSupabasePublic();
        if (supabase) {
          const { data: sessionData, error: refreshError } = await supabase.auth.refreshSession({
            refresh_token: refreshToken,
          });

          if (!refreshError && sessionData?.session) {
            // Update the cookie with the new access token
            res.setHeader('Set-Cookie', `roadmaster-access=${sessionData.session.access_token}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${7 * 24 * 60 * 60}`);
            
            return res.status(200).json({ 
              session: sessionData.session, 
              token: sessionData.session.access_token,
              refreshToken: sessionData.session.refresh_token // <-- FIX: return new refresh token (rotated)
            });
          }
        }
        return res.status(401).json({ error: 'Failed to refresh session' });
      }

      // --- LOGOUT ---
      if (action === 'logout') {
        res.setHeader('Set-Cookie', 'roadmaster-access=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0');
        return res.status(200).json({ message: 'Logged out successfully' });
      }
    } // end POST

    return res.status(405).json({ error: 'Method Not Allowed' });
  } catch (criticalErr: any) {
    console.error('[Auth API] CRITICAL UNCAUGHT ERROR:', criticalErr);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
};

export default withErrorHandler(handler);