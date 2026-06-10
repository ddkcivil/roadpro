import type { VercelRequest, VercelResponse } from '@vercel/node';
import { getSupabaseAdmin, getSupabasePublic, isSupabaseConfigured } from './_utils/supabaseClient.js';
import { withErrorHandler } from './_utils/errorHandler.js';
import { withAuth } from './_utils/auth.js';
import { generateUniqueId } from './_utils/uuidUtils.js';
import { hashPassword } from './_utils/authUtils.js';

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

          // Get password hash from registration
          const passwordHash = pendingReg.password_hash;

          if (!passwordHash) {
            return res.status(400).json({ error: 'No password hash found in registration' });
          }

          const userId = uuidv4();

          // Step 1: Create a Supabase Auth user using admin API (so they can login)
          const { data: authUserData, error: authUserError } = await supabaseAdmin.auth.admin.createUser({
            email: pendingReg.email,
            password: pendingReg.password || 'TempPass123!', // Use original password if available
            email_confirm: true,
            user_metadata: {
              full_name: pendingReg.name
            }
          });

          if (authUserError) {
            console.error('[Registrations] Auth user creation failed:', authUserError.message);
            // Continue anyway - profile can still be created
          }

          const authUserId = authUserData?.user?.id || userId;

          // Step 2: Create user profile in Supabase tables (links to auth user)
          const { error: profileError } = await supabaseAdmin
            .from('profiles')
            .insert([{
              id: authUserId,
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

          console.log('[Registrations] Approved user created in Supabase Auth + Profile:', pendingReg.email);

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
            user: { id: authUserId, name: pendingReg.name, email: pendingReg.email }
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
