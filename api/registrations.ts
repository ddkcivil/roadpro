import type { VercelRequest, VercelResponse } from '@vercel/node';
import { supabaseAdmin } from './utils/supabaseClient.js';
import { withErrorHandler } from './utils/errorHandler.js';
import { withAuth } from './utils/auth.js';
import { hashPassword } from './utils/mongoAuth.js';

const handler = async function (req: VercelRequest, res: VercelResponse) {
  const { id, action } = req.query;

  // --- PUBLIC: Submit new registration ---
  if (req.method === 'POST' && !action && !id) {
    try {
      const { name, email, phone, password, requestedRole } = req.body;

      if (!name || !email || !password || !requestedRole) {
        return res.status(400).json({ error: 'Name, email, password, and requested role are required.' });
      }

      // Check for existing registration in Supabase
      const { data: existingReg, error: checkError } = await supabaseAdmin
        .from('registrations')
        .select('id')
        .eq('email', email.toLowerCase())
        .single();

      if (existingReg) {
        return res.status(409).json({ error: 'A registration with this email already exists.' });
      }

      const password_hash = await hashPassword(password);
      
      const { data: newReg, error: insertError } = await supabaseAdmin
        .from('registrations')
        .insert([{
          name,
          email: email.toLowerCase(),
          phone: phone || '',
          password_hash,
          requested_role: requestedRole,
          status: 'pending'
        }])
        .select()
        .single();

      if (insertError) throw insertError;

      // Normalize for frontend compatibility
      const normalized = { ...newReg, _id: newReg.id };

      return res.status(201).json({
        message: 'Registration submitted successfully. Awaiting administrator approval.',
        pendingRegistration: normalized,
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
        const { data: registrations, error } = await supabaseAdmin
          .from('registrations')
          .select('*')
          .order('created_at', { ascending: false });
        
        if (error) throw error;
        
        // Normalize for frontend compatibility (both id and _id)
        const normalized = (registrations || []).map(r => ({ ...r, _id: r.id }));
        return res.status(200).json(normalized);
      } catch (error: any) {
        console.error('Failed to fetch pending registrations:', error);
        throw error;
      }
    }

    if (req.method === 'POST') {
      if (action === 'approve') {
        const targetId = id || req.body.id;
        if (!targetId || typeof targetId !== 'string' || targetId === 'undefined') {
          return res.status(400).json({ error: 'Invalid ID' });
        }

        try {
          // Try fetching from registrations table (Supabase)
          const { data: pendingReg, error: fetchError } = await supabaseAdmin
            .from('registrations')
            .select('*')
            .eq('id', targetId)
            .single();

          if (fetchError || !pendingReg) {
            console.error('Pending registration not found for ID:', targetId);
            return res.status(404).json({ error: 'Pending registration not found' });
          }

          // Create Supabase Profile
          const { data: profile, error: supabaseError } = await supabaseAdmin
            .from('profiles')
            .insert([{
              full_name: pendingReg.name,
              role: pendingReg.requested_role || 'SITE_ENGINEER',
              avatar_url: `https://ui-avatars.com/api/?name=${encodeURIComponent(pendingReg.name)}&background=random`,
              last_seen: new Date().toISOString()
            }])
            .select()
            .single();

          if (supabaseError) {
            console.error('Supabase profile creation failed:', supabaseError);
            return res.status(500).json({ error: 'Failed to create user profile in Supabase', details: supabaseError.message });
          }
          
          await supabaseAdmin.from('registrations').delete().eq('id', targetId);

          return res.status(200).json({
            message: 'Registration approved successfully',
            user: { id: profile.id, name: pendingReg.name, email: pendingReg.email, _id: profile.id }
          });
        } catch (error: any) {
          console.error('Error approving registration:', error);
          throw error;
        }
      }

      if (action === 'reject') {
        const targetId = id || req.body.id;
        if (!targetId || typeof targetId !== 'string' || targetId === 'undefined') {
          return res.status(400).json({ error: 'Registration ID is required' });
        }

        try {
          const { error: deleteError } = await supabaseAdmin.from('registrations').delete().eq('id', targetId);
          if (deleteError) throw deleteError;
          return res.status(204).end();
        } catch (error: any) {
          console.error('Failed to reject registration:', error);
          throw error;
        }
      }
    }

    if (req.method === 'DELETE') {
      const targetId = id || req.body.id;
      if (!targetId || typeof targetId !== 'string' || targetId === 'undefined') {
          return res.status(400).json({ error: 'Registration ID is required' });
      }

      try {
        const { error: deleteError } = await supabaseAdmin.from('registrations').delete().eq('id', targetId);
        if (deleteError) throw deleteError;
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
