import type { VercelRequest, VercelResponse } from '@vercel/node';
import { withErrorHandler } from './utils/errorHandler';
import { getUserByEmail, verifyPassword, generateToken } from './utils/mongoAuth';
import { mapUserFromDb } from './utils/mappers';
import { supabasePublic } from './utils/supabaseClient.js';

console.log('[Auth API] Initialized');

const handler = async function (req: VercelRequest, res: VercelResponse) {
  const { action } = req.query;

  if (req.method === 'POST') {
    // --- LOGIN ---
    if (action === 'login') {
      const { email, password } = req.body;
      console.log('[Auth API] Login attempt for:', email);

      if (!email || !password) {
        return res.status(400).json({ error: 'Email and password are required' });
      }

      // 1. Try Supabase Auth
      const { data: authData, error: authError } = await supabasePublic.auth.signInWithPassword({
        email,
        password,
      });

      if (!authError && authData.session) {
        const userId = authData.user.id;
        const { data: profile } = await supabasePublic
          .from('profiles')
          .select('*')
          .eq('id', userId)
          .single();

        res.setHeader('Set-Cookie', `roadmaster-access=${authData.session.access_token}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${7 * 24 * 60 * 60}`);
        
        return res.status(200).json({
          user: {
            id: userId,
            email: authData.user.email,
            full_name: profile?.full_name || 'User',
            role: (profile?.role || 'SITE_ENGINEER').toUpperCase(),
            avatar_url: profile?.avatar_url
          },
          token: authData.session.access_token
        });
      }

      // 2. Fallback to MongoDB (Legacy)
      console.log('[Auth API] Supabase login failed, checking MongoDB fallback...');
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

    // --- VERIFY & LOGOUT ---
    // (Existing verify/logout implementation...)


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

      const payload = await verifyToken(token);
      if (!payload) {
        return res.status(401).json({ valid: false, error: 'Invalid or expired token' });
      }

      return res.status(200).json({ valid: true, user: payload });
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

