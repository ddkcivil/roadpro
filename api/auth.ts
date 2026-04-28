import type { VercelRequest, VercelResponse } from '@vercel/node';
import { withErrorHandler } from './_utils/errorHandler.js';
import { getUserByEmail, verifyPassword, generateToken, hashPassword } from './_utils/mongoAuth.js';
import { mapUserFromDb } from './_utils/mappers.js';
import { mongodb } from '../lib/mongodb.js';

const handler = async function (req: VercelRequest, res: VercelResponse) {
  if (req.method === 'POST') {
    const { action } = req.query;

    if (action === 'login') {
      const { email, password } = req.body;

      if (!email || !password) {
        return res.status(400).json({ error: 'Email and password are required' });
      }

      const user = await getUserByEmail(email);

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
