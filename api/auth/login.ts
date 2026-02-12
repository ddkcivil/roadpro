// api/auth/login.ts
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { connectToDatabase } from '../_utils/dbConnect.js';
import bcrypt from 'bcrypt';

import { withErrorHandler } from '../_utils/errorHandler.js';
import { IUser } from '../_utils/dbConnect.js';

export default withErrorHandler(async function (req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    const { User } = await connectToDatabase();
    const { email, password } = req.body;

    if (!email || !password) {
      res.status(400).json({ error: 'Email and password are required' });
    }

    // Find user by email
    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) {
      res.status(401).json({ error: 'Invalid credentials' });
      return;
    }

    // Check password using bcrypt
    if (!user.password) {
      res.status(401).json({ error: 'Invalid credentials' });
      return;
    }

    const passwordMatch = await bcrypt.compare(password, user.password);
    if (!passwordMatch) {
      res.status(401).json({ error: 'Invalid credentials' });
      return;
    }

    // Return user data (without password)
    const userData = user.toObject();
    delete (userData as any).password;

    res.status(200).json({
      success: true,
      user: userData,
      token: `token-${user.id}-${Date.now()}`
    });
  } catch (error: any) {
    console.error('Login failed:', error);
    // Removed Mongoose-specific error check
    res.status(500).json({ error: 'Login failed', details: error.message });
  }
})
