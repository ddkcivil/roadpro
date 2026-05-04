import type { VercelRequest, VercelResponse } from '@vercel/node';
import { withErrorHandler } from './utils/errorHandler.js';
import { getUserByEmail, verifyPassword, generateToken, verifyToken } from './utils/mongoAuth.js';
import { mapUserFromDb } from './utils/mappers.js';
import { supabasePublic, isSupabaseConfigured } from './utils/supabaseClient.js';

console.log('[Auth API] Initialized');

const handler = async function (req: VercelRequest, res: VercelResponse) {
  const { action } = req.query;

  // Ensure JSON response
  res.setHeader('Content-Type', 'application/json');

  if (req.method === 'POST') {
    // --- LOGIN ---
    if (action === 'login') {
      const { email, password } = req.body;
      console.log('[Auth API] Login attempt for:', email);

      if (!email || !password) {
        return res.status(400).json({ error: 'Email and password are required' });
      }

      try {
        // Check Supabase configuration FIRST (without throwing)
        const supabaseReady = isSupabaseConfigured();
        console.log('[Auth API] Supabase configured:', supabaseReady);

        // 1. Try Supabase Auth (if configured)
        if (supabaseReady) {
          console.log('[Auth API] Calling Supabase signInWithPassword');
          const { data: authData, error: authError } = await supabasePublic.auth.signInWithPassword({
            email,
            password,
          });

          if (authError) {
            console.log('[Auth API] Supabase auth error:', authError.message);
            // Proceed to MongoDB fallback if Supabase auth fails
          } else if (authData?.session) {
            console.log('[Auth API] Supabase login successful');
            const userId = authData.user.id;
            const { data: profile, error: profError } = await supabasePublic
              .from('profiles')
              .select('*')
              .eq('id', userId)
              .single();

            if (profError) console.log('[Auth API] Supabase profile fetch error:', profError.message);

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
          }
          // If Supabase auth failed (authError present or no session), we fall through to MongoDB
        } else {
          console.log('[Auth API] Supabase not configured, skipping to MongoDB fallback.');
        }
      } catch (error: any) {
        // Catch any exceptions that occur during the Supabase flow
        console.error('[Auth API] Supabase flow exception:', error.message);
        // Fall through to MongoDB if Supabase flow throws an exception
      }

      // 2. Fallback to MongoDB (Legacy)
      console.log('[Auth API] Checking MongoDB fallback...');
      const user = await getUserByEmail(email);

      if (!user || !user.passwordHash || !(await verifyPassword(password, user.passwordHash))) {
        return res.status(401).json({ error: 'Invalid email or password' });
      }

      const token = generateToken({
        userId: user._id,
        email: user.email,
        role: user.role
      });

      const safeUser = mapUserFromDb(user);
      res.setHeader('Set-Cookie', `roadmaster-access=${token}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${7 * 24 * 60 * 60}`);

      return res.status(200).json({
        user: safeUser,
        token
      });
    }

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

      // 1. Try Supabase
      try {
        const supabaseReady = isSupabaseConfigured();
        if (supabaseReady) {
          const { data: { user }, error: supError } = await supabasePublic.auth.getUser(token);
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

      // 2. Try MongoDB
      const payload = await verifyToken(token);
      if (payload) {
        return res.status(200).json({ valid: true, provider: 'mongodb', user: payload });
      }

      return res.status(401).json({ valid: false, error: 'Invalid or expired token' });
    }

    // --- LOGOUT ---
    if (action === 'logout') {
      res.setHeader('Set-Cookie', 'roadmaster-access=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0');
      return res.status(200).json({ message: 'Logged out successfully' });
    }
  }

  return res.status(405).json({ error: 'Method Not Allowed' });
};

export default withErrorHandler(handler);
