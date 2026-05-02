import type { VercelRequest, VercelResponse } from '@vercel/node';
import { mongodb } from '../lib/mongodb.js';
import { supabaseAdmin } from './utils/supabaseClient.js';
import { withErrorHandler } from './utils/errorHandler.js';
import { withAuth } from './utils/auth.js';
import { v4 as uuidv4 } from 'uuid';
import { hashPassword } from './utils/mongoAuth.js';

const handler = async function (req: VercelRequest, res: VercelResponse) {
  const { id, action } = req.query;
  
  // Ensure DB connection
  const db = await mongodb.connect();

  // --- PUBLIC: Submit new registration ---
  if (req.method === 'POST' && !action && !id) {
    try {
      const { name, email, phone, password, requestedRole } = req.body;

      if (!name || !email || !password || !requestedRole) {
        return res.status(400).json({ error: 'Name, email, password, and requested role are required.' });
      }

      // Check for existing registration
      const existingReg = await db.collection('registrations').findOne({ email: email.toLowerCase() });
      if (existingReg) {
        return res.status(409).json({ error: 'A registration with this email already exists.' });
      }

      const newRegId = uuidv4();
      const newReg = {
        _id: newRegId,
        name,
        email: email.toLowerCase(),
        phone: phone || '',
        passwordhash: await hashPassword(password),
        requestedrole: requestedRole,
        status: 'pending',
        created_at: new Date().toISOString()
      };

      console.log('Attempting to insert registration:', JSON.stringify(newReg, null, 2));

      await db.collection('registrations').insertOne(newReg);

      return res.status(201).json({
        message: 'Registration submitted successfully. Awaiting administrator approval.',
        pendingRegistration: { id: newRegId, ...newReg },
      });
    } catch (error: any) {
      console.error('Error submitting pending registration:', error);
      throw error;
    }
  }

  // --- PROTECTED: Admin actions ---
  return withAuth(async (req: VercelRequest, res: VercelResponse) => {
    const userRole = (req as any).user?.role;
    
    if (userRole?.toUpperCase() !== 'ADMIN') {
      return res.status(403).json({ error: 'Forbidden: Admin access required for this action.' });
    }

    if (req.method === 'GET') {
      try {
        const registrations = await db.collection('registrations')
          .find({})
          .toArray();
        
        return res.status(200).json(registrations.sort((a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()));
      } catch (error: any) {
        console.error('Failed to fetch pending registrations:', error);
        throw error;
      }
    }

    if (req.method === 'POST') {
      if (action === 'approve') {
        if (!id || typeof id !== 'string') return res.status(400).json({ error: 'Invalid ID' });

        try {
          const pendingReg = await db.collection('registrations').findOne({ _id: id });
          if (!pendingReg) return res.status(404).json({ error: 'Pending registration not found' });

          const userId = uuidv4(); 
          const { error: supabaseError } = await supabaseAdmin
            .from('profiles')
            .insert([{
              id: userId,
              full_name: pendingReg.name,
              role: pendingReg.requestedrole || pendingReg.requested_role || pendingReg.requestedRole || 'SITE_ENGINEER',
              avatar_url: `https://ui-avatars.com/api/?name=${encodeURIComponent(pendingReg.name)}&background=random`,
              last_seen: new Date().toISOString(),
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString()
            }]);

          if (supabaseError) {
            console.error('Supabase profile creation failed:', supabaseError);
            return res.status(500).json({ error: 'Failed to create user profile in Supabase', details: supabaseError.message });
          }
          
          await db.collection('registrations').deleteOne({ _id: id });

          return res.status(200).json({
            message: 'Registration approved successfully',
            user: { id: userId, name: pendingReg.name, email: pendingReg.email }
          });
        } catch (error: any) {
          console.error('Error approving registration:', error);
          throw error;
        }
      }

      if (action === 'reject') {
        if (!id || typeof id !== 'string') return res.status(400).json({ error: 'Registration ID is required' });

        try {
          const result = await db.collection('registrations').deleteOne({ _id: id });
          if (result.deletedCount === 0) return res.status(404).json({ error: 'Registration not found' });
          return res.status(204).end();
        } catch (error: any) {
          console.error('Failed to reject registration:', error);
          throw error;
        }
      }
    }

    if (req.method === 'DELETE') {
      if (!id || typeof id !== 'string') return res.status(400).json({ error: 'Registration ID is required' });

      try {
        const result = await db.collection('registrations').deleteOne({ _id: id });
        if (result.deletedCount === 0) return res.status(404).json({ error: 'Registration not found' });
        return res.status(204).end();
      } catch (error: any) {
        console.error('Failed to delete registration:', error);
        throw error;
      }
    }

    return res.status(405).json({ error: 'Method Not Allowed' });
  })(req, res);
};

export default withErrorHandler(handler);
