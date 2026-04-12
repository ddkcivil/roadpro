import type { VercelRequest, VercelResponse } from '@vercel/node';
import { supabasePublic, supabaseAdmin } from './_utils/supabaseClient.js';
import bcrypt from 'bcrypt';
import { withErrorHandler } from './_utils/errorHandler.js';
import { v4 as uuidv4 } from 'uuid';

const handler = async function (req: VercelRequest, res: VercelResponse) {
  const { id, action } = req.query;

  if (req.method === 'GET') {
    try {
      const { data, error } = await supabaseAdmin
        .from('registrations')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      return res.status(200).json(data);
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
        const { data: pendingReg, error: fetchError } = await supabaseAdmin
          .from('registrations')
          .select('*')
          .eq('id', id)
          .single();

        if (fetchError || !pendingReg) return res.status(404).json({ error: 'Pending registration not found' });

        // 2. Create user in Supabase Auth
        // Note: Password should be the original one, but here we only have the hash.
        // In a real flow, you might want to invite the user or have them set a password.
        // For migration compatibility, we assume we can create them (but auth.admin.createUser needs plain password).
        // Since we only have password_hash, this is a limitation of migrating hashed passwords into Supabase Auth directly via admin API.
        // Option: Tell user to reset password, or use a workaround if possible.
        // For now, let's assume we can't easily import the hash into auth.users without specific Supabase support.
        // We'll proceed with creating the profile at least, and maybe use a dummy password or specialized auth import.
        
        const { data: authUser, error: authError } = await supabaseAdmin.auth.admin.createUser({
          email: pendingReg.email.toLowerCase(),
          email_confirm: true,
          user_metadata: {
            name: pendingReg.name,
            role: pendingReg.requested_role
          }
        });

        if (authError) {
          if (authError.message.includes('already exists')) {
             return res.status(409).json({ error: 'User already exists in Auth' });
          }
          throw authError;
        }

        // 3. Create profile
        const { error: profileError } = await supabaseAdmin
          .from('profiles')
          .insert({
            id: authUser.user.id,
            name: pendingReg.name,
            email: pendingReg.email.toLowerCase(),
            phone: pendingReg.phone,
            role: pendingReg.requested_role,
            avatar: `https://ui-avatars.com/api/?name=${encodeURIComponent(pendingReg.name)}&background=random`
          });

        if (profileError) throw profileError;

        // 4. Delete pending registration
        await supabaseAdmin.from('registrations').delete().eq('id', id);

        return res.status(200).json({
          message: 'Registration approved successfully',
          user: { id: authUser.user.id, name: pendingReg.name, email: pendingReg.email, role: pendingReg.requested_role }
        });
      } catch (error: any) {
        console.error('Error approving registration:', error);
        throw error;
      }
    }

    if (action === 'reject') {
      if (!id || typeof id !== 'string') return res.status(400).json({ error: 'Registration ID is required' });

      try {
        const { error } = await supabaseAdmin.from('registrations').delete().eq('id', id);
        if (error) throw error;
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

      const hashedPassword = await bcrypt.hash(password, 10);

      const { data: newReg, error } = await supabasePublic
        .from('registrations')
        .insert({
          id: uuidv4(),
          name,
          email: email.toLowerCase(),
          phone: phone || '',
          password_hash: hashedPassword,
          requested_role: requestedRole,
          status: 'pending'
        })
        .select()
        .single();

      if (error) {
        if (error.code === '23505') return res.status(409).json({ error: 'A registration with this email already exists.' });
        throw error;
      }

      return res.status(201).json({
        message: 'Registration submitted successfully. Awaiting administrator approval.',
        pendingRegistration: newReg,
      });
    } catch (error: any) {
      console.error('Error submitting pending registration:', error);
      throw error;
    }
  }

  if (req.method === 'DELETE') {
    if (!id || typeof id !== 'string') return res.status(400).json({ error: 'Registration ID is required' });

    try {
      const { error } = await supabaseAdmin.from('registrations').delete().eq('id', id);
      if (error) throw error;
      return res.status(204).end();
    } catch (error: any) {
      console.error('Failed to delete registration:', error);
      throw error;
    }
  }

  return res.status(405).json({ error: 'Method Not Allowed' });
};

export default withErrorHandler(handler);

