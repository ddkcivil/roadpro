// api/pending-registrations/[id]/approve.ts
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { connectToDatabase } from '../../_utils/mysqlConnect.js'; // Changed import path
// No longer need mongoose
import bcrypt from 'bcrypt';

import { withErrorHandler } from '../../_utils/errorHandler.js'; // Adjust path as needed
import { UserAttributes, UserCreationAttributes, PendingRegistrationInstance } from '../../_utils/mysqlConnect.js';

export default withErrorHandler(async function (req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    const { User, PendingRegistration } = await connectToDatabase();
    const { id } = req.query; // Access id from req.query for dynamic routes

    if (!id || typeof id !== 'string') {
      res.status(400).json({ error: 'Registration ID is required' });
    }

    // Find pending registration by primary key (id)
    const registration = (await PendingRegistration.findByPk(id as string)) as PendingRegistrationInstance | null;
    
    if (!registration) {
      res.status(404).json({ error: 'Registration not found' });
      return; // Exit early if registration is null
    }
    
    // Generate a temporary password and hash it
    const tempPassword = Math.random().toString(36).slice(-10);
    const hashedPassword = await bcrypt.hash(tempPassword, 10);

    // Create user from registration data using Sequelize's create method
    const user = await User.create({
      id: `user-${Date.now()}`, // Keep original ID generation logic or adjust as needed
      name: registration.name,
      email: registration.email,
      phone: registration.phone || undefined, // Ensure phone is string or undefined
      role: registration.requestedRole,
      password: hashedPassword,
      avatar: `https://ui-avatars.com/api/?name=${encodeURIComponent(registration.name)}&background=random`
    } as any);

    // Delete pending registration using Sequelize's destroy method
    await PendingRegistration.destroy({
      where: { id: id }
    });

    // Return user data (without password)
    // Sequelize models have a .toJSON() method which can be used, or pick specific fields
    const userData = user.toJSON();
    delete userData.password;
    delete userData.updatedAt; // Remove updatedAt as it's not needed for client or token

    // Return user and the temporary password so the approver can share it securely
    res.status(200).json({ user: userData, tempPassword });
  } catch (error: any) {
    console.error('Failed to approve registration:', error);
    res.status(500).json({ error: 'Failed to approve registration', details: error.message });
  }
})
