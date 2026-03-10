import type { VercelRequest, VercelResponse } from '@vercel/node';
import { connectToDatabase } from './_utils/dbConnect.js';
import bcrypt from 'bcrypt';
import { withErrorHandler } from './_utils/errorHandler.js';
import { generateUniqueId } from './_utils/uuidUtils.js';

const handler = async function (req: VercelRequest, res: VercelResponse) {
  const { id, action } = req.query;

  if (req.method === 'GET') {
    try {
      const { PendingRegistration } = await connectToDatabase();
      const pendingRegistrations = await PendingRegistration.find();
      return res.status(200).json(pendingRegistrations);
    } catch (error: any) {
      console.error('Failed to fetch pending registrations:', error);
      return res.status(500).json({ error: 'Failed to fetch pending registrations', details: error.message });
    }
  } 
  
  if (req.method === 'POST') {
    if (action === 'approve') {
      if (!id || typeof id !== 'string') return res.status(400).json({ error: 'Invalid ID' });

      try {
        const { User, PendingRegistration } = await connectToDatabase();
        const pendingReg = await PendingRegistration.findOne({ id });
        if (!pendingReg) return res.status(404).json({ error: 'Pending registration not found' });

        const existingUser = await User.findOne({ email: pendingReg.email.toLowerCase() });
        if (existingUser) return res.status(400).json({ error: 'User with this email already exists' });

        const newUser = new User({
          id: pendingReg.id,
          name: pendingReg.name,
          email: pendingReg.email.toLowerCase(),
          phone: pendingReg.phone,
          password: pendingReg.password, // Use the hashed password from registration
          role: pendingReg.requestedRole,
          avatar: `https://ui-avatars.com/api/?name=${encodeURIComponent(pendingReg.name)}&background=random`
        });

        await newUser.save();
        await PendingRegistration.deleteOne({ id });

        return res.status(200).json({
          message: 'Registration approved successfully',
          user: { id: newUser.id, name: newUser.name, email: newUser.email, role: newUser.role }
        });
      } catch (error: any) {
        console.error('Error approving registration:', error);
        return res.status(500).json({ error: 'Failed to approve registration', details: error.message });
      }
    }

    if (action === 'reject') {
      if (!id || typeof id !== 'string') return res.status(400).json({ error: 'Registration ID is required' });

      try {
        const { PendingRegistration } = await connectToDatabase();
        const registration = await PendingRegistration.findOneAndDelete({ id });
        if (!registration) return res.status(404).json({ error: 'Registration not found' });
        return res.status(204).end();
      } catch (error: any) {
        console.error('Failed to reject registration:', error);
        return res.status(500).json({ error: 'Failed to reject registration', details: error.message });
      }
    }

    // Default POST: Submit new registration
    try {
      const { PendingRegistration, User } = await connectToDatabase();
      const { name, email, phone, password, requestedRole } = req.body;

      if (!name || !email || !password || !requestedRole) {
        return res.status(400).json({ error: 'Name, email, password, and requested role are required.' });
      }

      if (!/^[\w\.-]+@[\w\.-]+\.[a-zA-Z]{2,}$/.test(email)) {
        return res.status(400).json({ error: 'Please enter a valid email address.' });
      }

      if (password.length < 6) {
        return res.status(400).json({ error: 'Password must be at least 6 characters.' });
      }

      const existingPending = await PendingRegistration.findOne({ email: email.toLowerCase() });
      if (existingPending) return res.status(409).json({ error: 'A pending registration with this email already exists.' });

      const existingUser = await User.findOne({ email: email.toLowerCase() });
      if (existingUser) return res.status(409).json({ error: 'A user with this email already exists.' });

      const hashedPassword = await bcrypt.hash(password, 10);

      const newPendingRegistration = new PendingRegistration({
        id: generateUniqueId(),
        name,
        email: email.toLowerCase(),
        phone: phone || '',
        password: hashedPassword,
        requestedRole,
        status: 'pending'
      });

      await newPendingRegistration.save();

      return res.status(201).json({
        message: 'Registration submitted successfully. Awaiting administrator approval.',
        pendingRegistration: newPendingRegistration,
      });
    } catch (error: any) {
      console.error('Error submitting pending registration:', error);
      return res.status(500).json({ error: 'Failed to submit registration.', details: error.message });
    }
  }

  if (req.method === 'DELETE') {
    if (!id || typeof id !== 'string') return res.status(400).json({ error: 'Registration ID is required' });

    try {
      const { PendingRegistration } = await connectToDatabase();
      const registration = await PendingRegistration.findOneAndDelete({ id });
      if (!registration) return res.status(404).json({ error: 'Registration not found' });
      return res.status(204).end();
    } catch (error: any) {
      console.error('Failed to delete registration:', error);
      return res.status(500).json({ error: 'Failed to delete registration', details: error.message });
    }
  }

  return res.status(405).json({ error: 'Method Not Allowed' });
};

export default withErrorHandler(handler);
