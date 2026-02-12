// api/users/index.ts
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { connectToDatabase } from '../_utils/dbConnect.js';
import bcrypt from 'bcrypt';
import { withErrorHandler } from '../_utils/errorHandler.js';
import { IUser } from '../_utils/dbConnect.js';

export default withErrorHandler(async function (req: VercelRequest, res: VercelResponse) {
  if (req.method === 'GET') {
    try {
      const { User } = await connectToDatabase();
      // Fetch all users, excluding the password field
      const users = await User.find({}, '-password');
      res.status(200).json(users);
    } catch (error: any) {
      console.error('Failed to fetch users:', error);
      res.status(500).json({ error: 'Failed to fetch users', details: error.message });
    }
  } else if (req.method === 'POST') {
    try {
      const { User } = await connectToDatabase();
      const { name, email, phone, role, password } = req.body;

      if (!name || !email || !password) {
        res.status(400).json({ error: 'Name, email and password are required' });
        return;
      }

      // Check if user already exists
      const existingUser = await User.findOne({ email: email.toLowerCase() });
      if (existingUser) {
        res.status(409).json({ error: 'User already exists' });
        return;
      }

      // Hash password
      const hashedPassword = await bcrypt.hash(password, 10);

      // Create user
      const user = await User.create({
        id: `user-${Date.now()}`,
        name,
        email: email.toLowerCase(),
        phone: phone || undefined,
        role: role || 'SITE_ENGINEER',
        password: hashedPassword,
        avatar: `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=random`
      });

      // Do not return password
      const userData = user.toObject();
      delete (userData as any).password;
      res.status(201).json(userData);
    } catch (error: any) {
      console.error('Failed to create user:', error);
      res.status(500).json({ error: 'Failed to create user', details: error.message });
    }
  } else {
    res.status(405).json({ error: 'Method Not Allowed' });
  }
})
