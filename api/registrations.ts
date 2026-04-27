import type { VercelRequest, VercelResponse } from '@vercel/node';
import { mongodb } from '../lib/mongodb.js';
import { withErrorHandler } from './_utils/errorHandler.js';
import { v4 as uuidv4 } from 'uuid';
import { hashPassword } from './_utils/mongoAuth.js';

const handler = async function (req: VercelRequest, res: VercelResponse) {
  const { id, action } = req.query;

  if (req.method === 'GET') {
    try {
      const registrations = await mongodb.db.collection('registrations')
        .find({})
        .sort({ created_at: -1 })
        .toArray();

      return res.status(200).json(registrations);
    } catch (error: any) {
      console.error('Failed to fetch pending registrations:', error);
      throw error;
    }
  } 
  
  if (req.method === 'POST') {
    if (action === 'approve') {
      if (!id || typeof id !== 'string') return res.status(400).json({ error: 'Invalid ID' });

      try {
        // 1. Get pending registration
        const pendingReg = await mongodb.db.collection('registrations').findOne({ _id: id });

        if (!pendingReg) return res.status(404).json({ error: 'Pending registration not found' });

        // 2. Check if user already exists
        const existingUser = await mongodb.db.collection('users').findOne({ email: pendingReg.email.toLowerCase() });
        if (existingUser) {
          return res.status(409).json({ error: 'User already exists' });
        }

        // 3. Create user in MongoDB
        const hashedPassword = await hashPassword(pendingReg.passwordhash || pendingReg.password || `temp-${uuidv4()}`);
        const newUserId = uuidv4();
        const role = pendingReg.requestedrole || pendingReg.requested_role || pendingReg.requestedRole || 'SITE_ENGINEER';

        const newUser = {
          _id: newUserId,
          email: pendingReg.email.toLowerCase(),
          passwordHash: hashedPassword,
          full_name: pendingReg.name,
          phone: pendingReg.phone || '',
          role: role,
          avatar_url: `https://ui-avatars.com/api/?name=${encodeURIComponent(pendingReg.name)}&background=random`,
          last_seen: new Date().toISOString(),
          created_at: new Date().toISOString()
        };

        await mongodb.db.collection('users').insertOne(newUser);

        // 4. Delete pending registration
        await mongodb.db.collection('registrations').deleteOne({ _id: id });

        return res.status(200).json({
          message: 'Registration approved successfully',
          user: { id: newUserId, name: pendingReg.name, email: pendingReg.email, role: role }
        });
      } catch (error: any) {
        console.error('Error approving registration:', error);
        throw error;
      }
    }

    if (action === 'reject') {
      if (!id || typeof id !== 'string') return res.status(400).json({ error: 'Registration ID is required' });

      try {
        const result = await mongodb.db.collection('registrations').deleteOne({ _id: id });
        if (result.deletedCount === 0) return res.status(404).json({ error: 'Registration not found' });
        return res.status(204).end();
      } catch (error: any) {
        console.error('Failed to reject registration:', error);
        throw error;
      }
    }

    // Default POST: Submit new registration
    try {
      const { name, email, phone, password, requestedRole } = req.body;

      if (!name || !email || !password || !requestedRole) {
        return res.status(400).json({ error: 'Name, email, password, and requested role are required.' });
      }

      // Check for existing registration
      const existingReg = await mongodb.db.collection('registrations').findOne({ email: email.toLowerCase() });
      if (existingReg) {
        return res.status(409).json({ error: 'A registration with this email already exists.' });
      }

      const newRegId = uuidv4();
      const newReg = {
        _id: newRegId,
        name,
        email: email.toLowerCase(),
        phone: phone || '',
        passwordhash: password, 
        requestedrole: requestedRole,
        status: 'pending',
        created_at: new Date().toISOString()
      };

      await mongodb.db.collection('registrations').insertOne(newReg);

      return res.status(201).json({
        message: 'Registration submitted successfully. Awaiting administrator approval.',
        pendingRegistration: { id: newRegId, ...newReg },
      });
    } catch (error: any) {
      console.error('Error submitting pending registration:', error);
      throw error;
    }
  }

  if (req.method === 'DELETE') {
    if (!id || typeof id !== 'string') return res.status(400).json({ error: 'Registration ID is required' });

    try {
      const result = await mongodb.db.collection('registrations').deleteOne({ _id: id });
      if (result.deletedCount === 0) return res.status(404).json({ error: 'Registration not found' });
      return res.status(204).end();
    } catch (error: any) {
      console.error('Failed to delete registration:', error);
      throw error;
    }
  }

  return res.status(405).json({ error: 'Method Not Allowed' });
};

export default withErrorHandler(handler);
