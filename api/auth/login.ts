// api/auth/login.ts
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { connectToDatabase } from '../_utils/mysqlConnect.js'; // Changed import path
// No longer need mongoose
import bcrypt from 'bcrypt';

import { withErrorHandler } from '../_utils/errorHandler.js';
import { UserAttributes, UserInstance } from '../_utils/mysqlConnect.js';

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
    const user = (await User.findOne({ 
      where: { email: email.toLowerCase() },
      attributes: ['id', 'name', 'email', 'phone', 'password', 'role', 'avatar', 'createdAt', 'updatedAt'] // Explicitly select all attributes, including password
    })) as UserInstance | null;
    if (!user) {
      res.status(401).json({ error: 'Invalid credentials' });
    }

    // Check password using bcrypt
    if (!user) { // Sequelize instances have direct property access, ensuring user is not null
      res.status(401).json({ error: 'Invalid credentials' });
      return; // Added return to exit early if user is null
    }

    if (!user.password) { // Check if password exists on the user instance
      res.status(401).json({ error: 'Invalid credentials' });
      return; // Added return to exit early if password is not found
    }

    const passwordMatch = await bcrypt.compare(password, user.password);
    if (!passwordMatch) {
      res.status(401).json({ error: 'Invalid credentials' });
    }

    // Return user data (without password)
    // Sequelize instances have a .toJSON() method or you can extract specific fields
    const userData = user.toJSON();
    delete userData.password;

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
