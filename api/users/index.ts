// api/users/index.ts
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { connectToDatabase } from '../_utils/mysqlConnect.js'; // Changed import path
// No longer need mongoose
import bcrypt from 'bcrypt';

import { withErrorHandler } from '../_utils/errorHandler.js'; // Adjust path as needed
import { UserAttributes, UserCreationAttributes } from '../_utils/mysqlConnect.js';

export default withErrorHandler(async function (req: VercelRequest, res: VercelResponse) {
  if (req.method === 'GET') {
    try {
      const { User } = await connectToDatabase();
      // Fetch all users, excluding the password field
      const users = await User.findAll({ attributes: { exclude: ['password'] } }); // Sequelize: findAll
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
      }

      // Check if user already exists
      const existingUser = await User.findOne({ where: { email: email.toLowerCase() } }); // Sequelize findOne with where
      if (existingUser) {
        res.status(409).json({ error: 'User already exists' });
      }

      // Hash password
      const hashedPassword = await bcrypt.hash(password, 10);

      // Create user using Sequelize's create method
      const user = await User.create({
        id: `user-${Date.now()}`, // Keep original ID generation logic or adjust as needed
        name,
        email: email.toLowerCase(),
        phone: phone || undefined, // Ensure phone is string or undefined
        role: role || 'SITE_ENGINEER', // Default role if not provided
        password: hashedPassword,
        avatar: `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=random`
      } as any);

      // Do not return password - use toJSON() and exclude
      const userData = user.toJSON();
      delete userData.password;
      res.status(201).json(userData);
    } catch (error: any) {
      console.error('Failed to create user:', error);
      res.status(500).json({ error: 'Failed to create user', details: error.message });
    }
  } else {
    res.status(405).json({ error: 'Method Not Allowed' });
  }
})