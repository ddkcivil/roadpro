import type { VercelRequest, VercelResponse } from '@vercel/node';
import { withErrorHandler } from './utils/errorHandler.js';
import { mapUserFromDb } from './utils/mappers.js';
import { getSupabasePublic, isSupabaseConfigured } from './utils/supabaseClient.js';

// Debug: Log startup and env availability
console.log('[Auth API] Server started. Env check:', {
  hasSupabaseUrl: !!(process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL),
  nodeEnv: process.env.NODE_ENV,
  vercelEnv: process.env.VERCEL,
  vercelEnvType: process.env.VERCEL_ENV, // 'production', 'preview', or 'development'
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

        // Use Supabase Auth only
        const supabaseConfigured = isSupabaseConfigured();
        console.log('[Auth API] Supabase configured:', supabaseConfigured);

        if (!supabaseConfigured) {
          return res.status(503).json({ error: 'Authentication service not configured' });
        }

        try {
          console.log('[Auth API] Getting Supabase client...');
          const supabase = getSupabasePublic();
          console.log('[Auth API] Got Supabase client:', !!supabase);
          
          if (supabase) {
            console.log('[Auth API] Calling Supabase signInWithPassword');
            const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
              email,
              password,
            });

            console.log('[Auth API] Supabase response:', { hasData: !!authData?.session, error: authError?.message });

            if (!authError && authData?.session) {
              console.log('[Auth API] Supabase login successful');
              const userId = authData.user.id;
              const { data: profile, error: profError } = await supabase
                .from('profiles')
                .select('*')
                .eq('id', userId)
                .single();

              if (profError) console.warn('[Auth API] Supabase profile fetch error:', profError.message);

              res.setHeader('Set-Cookie', `roadmaster-access=${authData.session.access_token}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${7 * 24 * 60 * 60}`);

              const safeUser = mapUserFromDb({
                id: userId,
                email: authData.user.email,
                ...profile
              });

              return res.status(200).json({
                user: safeUser,
                token: authData.session.access_token
              });
            } else {
              console.log('[Auth API] Supabase auth error:', authError?.message);
              return res.status(401).json({ error: 'Invalid email or password' });
            }
          }
        } catch (supEx: any) {
          console.error('[Auth API] Supabase auth exception:', supEx.message, supEx.stack);
          return res.status(500).json({ error: 'Authentication temporarily unavailable' });
        }
       } // end login

       // --- SIGNUP ---
       if (action === 'signup') {
         const { email, password, name } = req.body;
         console.log('[Auth API] Signup attempt for:', email);

         if (!email || !password || !name) {
           return res.status(400).json({ error: 'Email, password, and name are required' });
         }

         // Use Supabase Auth only
         const supabaseConfigured = isSupabaseConfigured();
         console.log('[Auth API] Supabase configured:', supabaseConfigured);

         if (!supabaseConfigured) {
           return res.status(503).json({ error: 'Authentication service not configured' });
         }

         try {
           console.log('[Auth API] Getting Supabase client...');
           const supabase = getSupabasePublic();
           console.log('[Auth API] Got Supabase client:', !!supabase);

           if (supabase) {
             console.log('[Auth API] Calling Supabase signUp');
             const { data: authData, error: authError } = await supabase.auth.signUp({
               email,
               password,
               options: {
                 data: {
                   name: name
                 }
               }
             });

             console.log('[Auth API] Supabase signUp response:', { hasUser: !!authData?.user, error: authError?.message });

             if (!authError && authData?.user) {
               console.log('[Auth API] Supabase signup successful');
               // Note: Supabase sends a confirmation email by default
               // We don't set a cookie because the user needs to verify email first
               return res.status(200).json({
                 user: {
                   id: authData.user.id,
                   email: authData.user.email,
                   name: authData.user.user_metadata?.name || name
                 },
                 message: 'Check your email to complete registration'
               });
             } else {
               console.log('[Auth API] Supabase auth error:', authError?.message);
               return res.status(400).json({ error: authError?.message || 'Signup failed' });
             }
           }
         } catch (supEx: any) {
           console.error('[Auth API] Supabase signup exception:', supEx.message, supEx.stack);
           return res.status(500).json({ error: 'Signup temporarily unavailable' });
         }
       } // end signup

       // --- VERIFY ---
      if (action === 'verify') {
        let token = null;
        const authHeader = req.headers.authorization;
        if (authHeader && authHeader.startsWith('Bearer ')) {
          token = authHeader.split(' ')[1];
        } else if (req.headers.cookie) {
          const cookies = (req.headers.cookie || '').split(';').reduce((acc: any, cookie) => {
            const [name, value] = cookie.trim().split('=');
            if (name) acc[name] = value;
            return acc;
          }, {});
          token = cookies['roadmaster-access'];
        }

        if (!token) {
          return res.status(401).json({ valid: false, error: 'No token provided' });
        }

        // Use Supabase for verification
        try {
          const supabase = getSupabasePublic();
          if (supabase) {
            const { data: { user }, error: supError } = await supabase.auth.getUser(token);
            if (!supError && user) {
              return res.status(200).json({ 
                valid: true, 
                provider: 'supabase',
                user: {
                  userId: user.id,
                  email: user.email,
                  role: 'RESOLVE_VIA_PROFILE'
                }
              });
            }
          }
        } catch (e: any) {
          console.warn('[Auth API] Supabase verify exception:', e.message);
        }

        return res.status(401).json({ valid: false, error: 'Invalid or expired token' });
      } // end verify

// --- REFRESH ---
      if (action === 'refresh') {
        const refreshToken = req.body?.refresh_token;
        
        if (!refreshToken) {
          return res.status(400).json({ error: 'Refresh token required' });
        }

        try {
          const supabase = getSupabasePublic();
          if (supabase) {
            const { data: sessionData, error: refreshError } = await supabase.auth.refreshSession({
              refresh_token: refreshToken,
            });

            if (!refreshError && sessionData?.session) {
              return res.status(200).json({
                session: sessionData.session,
                token: sessionData.session.access_token
              });
            }
          }
          return res.status(401).json({ error: 'Failed to refresh session' });
        } catch (e: any) {
          console.error('[Auth API] Refresh error:', e.message);
          return res.status(500).json({ error: 'Failed to refresh session' });
        }
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
    return res.status(500).json({ error: 'Internal Server Error', message: criticalErr.message });
  }
};

export default withErrorHandler(handler);
