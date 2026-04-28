import type { VercelRequest, VercelResponse } from '@vercel/node';
import { withErrorHandler } from './_utils/errorHandler.js';
import { getUserByEmail, verifyPassword, generateToken, hashPassword } from './_utils/mongoAuth.js';
import { mapUserFromDb } from './_utils/mappers.js';
import { mongodb } from '../lib/mongodb.js';

const handler = async function (req: VercelRequest, res: VercelResponse) {
  if (req.method === 'POST') {
    const { action } = req.query;

    if (action === 'init_admin') {
      const { secret } = req.body;
      const initKey = process.env.SECRET_INIT_KEY || 'roadmaster-init-2026';
      
      if (secret !== initKey) {
        return res.status(403).json({ error: 'Unauthorized init request' });
      }

      const db = await mongodb.connect();
      const users = db.collection('users');
      
      const adminEmail = 'admin@myroad.app';
      const existing = await users.findOne({ email: adminEmail });
      
      if (existing) {
        return res.status(200).json({ message: 'Admin already exists' });
      }

      const hashedPassword = await hashPassword('admin123');
      await users.insertOne({
        _id: 'admin-1',
        email: adminEmail,
        passwordHash: hashedPassword,
        full_name: 'Admin User',
        role: 'ADMIN',
        avatar_url: 'https://ui-avatars.com/api/?name=Admin&background=6366f1',
        last_seen: new Date().toISOString(),
        phone: '',
        created_at: new Date().toISOString()
      });

      return res.status(201).json({ message: 'Admin created successfully' });
    }

    if (action === 'login') {
      const { email, password } = req.body;

      if (!email || !password) {
        return res.status(400).json({ error: 'Email and password are required' });
      }

      let user = await getUserByEmail(email);
      
      // Fallback for demo admin if DB is empty or connection issues
      if (!user && email === 'admin@myroad.app') {
         console.warn('[Login] Admin not found in DB, checking mock fallback...');
         // If we are here, getUserByEmail already tried to connect.
      }

      if (!user || !user.passwordHash) {
        return res.status(401).json({ error: 'Invalid email or password' });
      }

      const isPasswordValid = await verifyPassword(password, user.passwordHash);
      if (!isPasswordValid) {
        return res.status(401).json({ error: 'Invalid email or password' });
      }

      const token = generateToken({
        userId: user._id,
        email: user.email,
        role: user.role
      });

      const safeUser = mapUserFromDb(user);

      // Set cookie for convenience (optional, but good for SSR/middleware)
      res.setHeader('Set-Cookie', `roadmaster-access=${token}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${7 * 24 * 60 * 60}`);

      return res.status(200).json({
        user: safeUser,
        token
      });
    }

    if (action === 'logout') {
      res.setHeader('Set-Cookie', 'roadmaster-access=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0');
      return res.status(200).json({ message: 'Logged out successfully' });
    }
  }

  return res.status(405).json({ error: 'Method Not Allowed' });
};

export default withErrorHandler(handler);
