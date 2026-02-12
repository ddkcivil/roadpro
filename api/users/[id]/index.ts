// api/users/[id]/index.ts
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { connectToDatabase } from '../../_utils/dbConnect.js';
import bcrypt from 'bcrypt';
import { withErrorHandler } from '../../_utils/errorHandler.js';
import { IUser } from '../../_utils/dbConnect.js';

export default withErrorHandler(async function (req: VercelRequest, res: VercelResponse) {
  if (req.method === 'PUT') {
    try {
      const { User } = await connectToDatabase();
      const { id } = req.query;

      if (!id || typeof id !== 'string') {
        res.status(400).json({ error: 'User ID is required' });
        return;
      }

      const { name, email, phone, role } = req.body;

      if (!name || !email || !role) {
        res.status(400).json({ error: 'Name, email, and role are required' });
        return;
      }

      // Basic email format validation
      if (!/^[\w\.-]+@[\w\.-]+\.[a-zA-Z]{2,}$/.test(email)) {
        res.status(400).json({ error: 'Please enter a valid email address.' });
        return;
      }

      // Find user
      const user = await User.findById(id);

      if (!user) {
        res.status(404).json({ error: 'User not found' });
        return;
      }

      // Check for email uniqueness if email is being changed
      if (email.toLowerCase() !== user.email.toLowerCase()) {
        const existingUser = await User.findOne({ email: email.toLowerCase() });
        if (existingUser) {
          res.status(409).json({ error: 'A user with this email already exists.' });
          return;
        }
      }

      // Update user
      user.name = name;
      user.email = email.toLowerCase();
      user.phone = phone || undefined;
      user.role = role;
      await user.save();

      // Return updated user data (without password)
      const userData = user.toObject();
      delete (userData as any).password;
      res.status(200).json(userData);
    } catch (error: any) {
      console.error('Failed to update user:', error);
      res.status(500).json({ error: 'Failed to update user', details: error.message });
    }
  } else if (req.method === 'DELETE') {
    try {
      const { User } = await connectToDatabase();
      const { id } = req.query;

      if (!id || typeof id !== 'string') {
        res.status(400).json({ error: 'User ID is required' });
        return;
      }

      // Delete user
      const user = await User.findByIdAndDelete(id);

      if (!user) {
        res.status(404).json({ error: 'User not found' });
        return;
      }

      res.status(204).send(''); // 204 No Content for successful deletion
    } catch (error: any) {
      console.error('Failed to delete user:', error);
      res.status(500).json({ error: 'Failed to delete user', details: error.message });
    }
  } else {
    res.status(405).json({ error: 'Method Not Allowed' });
  }
})
