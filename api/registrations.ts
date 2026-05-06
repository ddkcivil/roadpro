import type { VercelRequest, VercelResponse } from '@vercel/node';
import { getSupabaseAdmin, isSupabaseConfigured } from './utils/supabaseClient.js';
import { withErrorHandler } from './utils/errorHandler.js';
import { withAuth } from './utils/auth.js';
import { v4 as uuidv4 } from 'uuid';
import { hashPassword } from './utils/mongoAuth.js';

const handler = async function (req: VercelRequest, res: VercelResponse) {
  const { id, action } = req.query;

  // Check Supabase configuration
  if (!isSupabaseConfigured()) {
    return res.status(503).json({ error: 'Database service not configured' });
  }

  const supabaseAdmin = getSupabaseAdmin();

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
        .select('*')
        .eq('email', email.toLowerCase())
        .maybeSingle();

      if (existingReg) {
        return res.status(409).json({ error: 'A registration with this email already exists.' });
      }

      const newRegId = uuidv4();
      const passwordHash = await hashPassword(password);

      const { data: newReg, error: insertError } = await supabaseAdmin
        .from('registrations')
        .insert([{
          id: newRegId,
          name,
          email: email.toLowerCase(),
          phone: phone || '',
          password_hash: passwordHash,
          requested_role: requestedRole,
          status: 'pending',
          created_at: new Date().toISOString()
        }])
        .select()
        .single();

      if (insertError) {
        console.error('[Registrations] Insert error:', insertError);
        throw insertError;
      }

      console.log('[Registrations] Submitted registration for:', email);

      return res.status(201).json({
        message: 'Registration submitted successfully. Awaiting administrator approval.',
        pendingRegistration: { id: newRegId, name, email, requestedRole },
      });
    } catch (error: any) {
      console.error('[Registrations] Submission error:', error);
      throw error;
    }
  }

  // --- PROTECTED: Admin actions ---
  return await withAuth(async (req: VercelRequest, res: VercelResponse) => {
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

        return res.status(200).json(registrations || []);
      } catch (error: any) {
        console.error('[Registrations] Fetch failed:', error);
        throw error;
      }
    }

    if (req.method === 'POST') {
      if (action === 'approve') {
        if (!id || typeof id !== 'string') return res.status(400).json({ error: 'Invalid ID' });

        try {
          // Get pending registration
          const { data: pendingReg, error: findError } = await supabaseAdmin
            .from('registrations')
            .select('*')
            .eq('id', id)
            .single();

          if (findError || !pendingReg) {
            return res.status(404).json({ error: 'Pending registration not found' });
          }

          const userId = uuidv4();

          // Create user profile in Supabase
          const { error: profileError } = await supabaseAdmin
            .from('profiles')
            .insert([{
              id: userId,
              full_name: pendingReg.name,
              email: pendingReg.email,
              phone: pendingReg.phone || '',
              role: (pendingReg.requested_role || 'SITE_ENGINEER').toUpperCase(),
              avatar_url: `https://ui-avatars.com/api/?name=${encodeURIComponent(pendingReg.name)}&background=random`,
              last_seen: new Date().toISOString(),
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString()
            }]);

          if (profileError) {
            console.error('[Registrations] Profile creation failed:', profileError);
            throw profileError;
          }

          console.log('[Registrations] Approved user created in Supabase:', pendingReg.email);

          // Delete the registration
          const { error: deleteError } = await supabaseAdmin
            .from('registrations')
            .delete()
            .eq('id', id);

          if (deleteError) {
            console.error('[Registrations] Delete failed:', deleteError);
          }

          return res.status(200).json({
            message: 'Registration approved successfully',
            user: { id: userId, name: pendingReg.name, email: pendingReg.email }
          });
        } catch (error: any) {
          console.error('[Registrations] Approval error:', error);
          throw error;
        }
      }

      if (action === 'reject') {
        if (!id || typeof id !== 'string') return res.status(400).json({ error: 'Registration ID is required' });

        try {
          const { error: deleteError } = await supabaseAdmin
            .from('registrations')
            .delete()
            .eq('id', id);

          if (deleteError) {
            console.error('[Registrations] Rejection failed:', deleteError);
            throw deleteError;
          }

          return res.status(204).end();
        } catch (error: any) {
          console.error('[Registrations] Rejection failed:', error);
          throw error;
        }
      }
    }

    if (req.method === 'DELETE') {
      if (!id || typeof id !== 'string') return res.status(400).json({ error: 'Registration ID is required' });

      try {
        const { error: deleteError } = await supabaseAdmin
          .from('registrations')
          .delete()
          .eq('id', id);

        if (deleteError) {
          console.error('[Registrations] Deletion failed:', deleteError);
          throw deleteError;
        }

        return res.status(204).end();
      } catch (error: any) {
        console.error('[Registrations] Deletion failed:', error);
        throw error;
      }
    }

    return res.status(405).json({ error: 'Method Not Allowed' });
  })(req, res);
};

export default withErrorHandler(handler);
