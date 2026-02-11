// api/users/[id]/index.ts
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { connectToDatabase } from '../../_utils/mysqlConnect.js'; // Changed import path
import bcrypt from 'bcrypt';
import { withErrorHandler } from '../../_utils/errorHandler.js'; // Adjust path as needed
import { UserAttributes, UserInstance } from '../../_utils/mysqlConnect.js';

export default withErrorHandler(async function (req: VercelRequest, res: VercelResponse) {
  if (req.method === 'PUT') {
    try {
      const { User } = await connectToDatabase();
      const { id } = req.query; // Access id from req.query for dynamic routes

      if (!id || typeof id !== 'string') {
        res.status(400).json({ error: 'User ID is required' });
      }

      const { name, email, phone, role } = req.body;

      if (!name || !email || !role) {
        res.status(400).json({ error: 'Name, email, and role are required' });
      }

      // Basic email format validation
      if (!/^[\w\.-]+@[\w\.-]+\.[a-zA-Z]{2,}$/.test(email)) {
        res.status(400).json({ error: 'Please enter a valid email address.' });
      }

      // Find user by primary key
      const user = (await User.findByPk(id as string)) as UserInstance | null;

      if (!user) {
        res.status(404).json({ error: 'User not found' });
        return;
      }

      // Check for email uniqueness if email is being changed
      if (email.toLowerCase() !== user.email.toLowerCase()) {
        const existingUser = await User.findOne({ where: { email: email.toLowerCase() } });
        if (existingUser) {
          res.status(409).json({ error: 'A user with this email already exists.' });
        }
      }

      // Update user
      await user.update({
        name,
        email: email.toLowerCase(),
        phone: phone || undefined,
        role
      });

      // Return updated user data (without password)
      const userData = user.toJSON();
      delete userData.password;
      res.status(200).json(userData);
    } catch (error: any) {
      console.error('Failed to update user:', error);
      res.status(500).json({ error: 'Failed to update user', details: error.message });
    }
  } else if (req.method === 'DELETE') {
    try {
      const { User } = await connectToDatabase();
      const { id } = req.query; // Access id from req.query for dynamic routes

      if (!id || typeof id !== 'string') {
        res.status(400).json({ error: 'User ID is required' });
      }

      // Use Sequelize's destroy method for deletion
      const result = await User.destroy({
        where: { id: id }
      });

      // result will be 0 if no records were deleted (i.e., not found)
      if (result === 0) {
        res.status(404).json({ error: 'User not found' });
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
