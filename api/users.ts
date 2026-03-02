import type { VercelRequest, VercelResponse } from '@vercel/node';
import { connectToDatabase } from './_utils/dbConnect.js';
import bcrypt from 'bcrypt';
import { withErrorHandler } from './_utils/errorHandler.js';
import { withAuth } from './_utils/auth.js';

const handler = async function (req: VercelRequest, res: VercelResponse) {
  const { id } = req.query;

  if (req.method === 'GET') {
    try {
      const { User } = await connectToDatabase();
      if (id) {
        const user = await User.findOne({ id }, '-password');
        if (!user) return res.status(404).json({ error: 'User not found' });
        return res.status(200).json(user);
      } else {
        const users = await User.find({}, '-password');
        return res.status(200).json(users);
      }
    } catch (error: any) {
      console.error('Failed to fetch users:', error);
      return res.status(500).json({ error: 'Failed to fetch users', details: error.message });
    }
  } 
  
  if (req.method === 'POST') {
    const userRole = (req as any).user?.role;
    if (userRole !== 'Admin' && userRole !== 'ADMIN') {
      return res.status(403).json({ error: 'Only admins can create users directly' });
    }

    try {
      const { User } = await connectToDatabase();
      const { name, email, phone, role, password, avatar } = req.body;

      if (!name || !email || !password) {
        return res.status(400).json({ error: 'Name, email and password are required' });
      }

      const existingUser = await User.findOne({ email: email.toLowerCase() });
      if (existingUser) return res.status(409).json({ error: 'User already exists' });

      const hashedPassword = await bcrypt.hash(password, 10);
      const user = await User.create({
        id: `user-${Date.now()}`,
        name,
        email: email.toLowerCase(),
        phone: phone || undefined,
        role: role || 'SITE_ENGINEER',
        password: hashedPassword,
        avatar: avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=random`
      });

      const userData = user.toObject();
      delete (userData as any).password;
      return res.status(201).json(userData);
    } catch (error: any) {
      console.error('Failed to create user:', error);
      return res.status(500).json({ error: 'Failed to create user', details: error.message });
    }
  }

  if (req.method === 'PUT') {
    if (!id || typeof id !== 'string') {
      return res.status(400).json({ error: 'User ID is required' });
    }

    try {
      const { User } = await connectToDatabase();
      const { name, email, phone, role, avatar } = req.body;

      if (!name || !email || !role) {
        return res.status(400).json({ error: 'Name, email, and role are required' });
      }

      const user = await User.findOne({ id });
      if (!user) return res.status(404).json({ error: 'User not found' });

      if (email.toLowerCase() !== user.email.toLowerCase()) {
        const existingUser = await User.findOne({ email: email.toLowerCase() });
        if (existingUser) return res.status(409).json({ error: 'A user with this email already exists.' });
      }

      user.name = name;
      user.email = email.toLowerCase();
      user.phone = phone || undefined;
      user.role = role;
      if (avatar) user.avatar = avatar;
      await user.save();

      const userData = user.toObject();
      delete (userData as any).password;
      return res.status(200).json(userData);
    } catch (error: any) {
      console.error('Failed to update user:', error);
      return res.status(500).json({ error: 'Failed to update user', details: error.message });
    }
  }

  if (req.method === 'DELETE') {
    if (!id || typeof id !== 'string') {
      return res.status(400).json({ error: 'User ID is required' });
    }

    try {
      const { User } = await connectToDatabase();
      const user = await User.findOneAndDelete({ id });
      if (!user) return res.status(404).json({ error: 'User not found' });
      return res.status(204).end();
    } catch (error: any) {
      console.error('Failed to delete user:', error);
      return res.status(500).json({ error: 'Failed to delete user', details: error.message });
    }
  }

  return res.status(405).json({ error: 'Method Not Allowed' });
};

export default withErrorHandler(withAuth(handler));
