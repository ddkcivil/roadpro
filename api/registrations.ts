import type { VercelRequest, VercelResponse } from '@vercel/node';
import { getSupabaseAdmin, getSupabasePublic, isSupabaseConfigured } from './_utils/supabaseClient.js';
import { withErrorHandler } from './_utils/errorHandler.js';
import { withAuth } from './_utils/auth.js';
import { generateUniqueId, uuidv4 } from './_utils/uuidUtils.js';

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

      // Check for existing registration or Auth user with this email
      const { data: existingReg, error: checkError } = await supabaseAdmin
        .from('registrations')
        .select('*')
        .eq('email', email.toLowerCase())
        .maybeSingle();

      if (existingReg) {
        return res.status(409).json({ error: 'A registration with this email already exists.' });
      }

      // Also check if an Auth user already exists for this email
      const { data: existingAuthUsers } = await supabaseAdmin.auth.admin.listUsers();
      const existingAuthUser = existingAuthUsers?.users?.find(
        (u: any) => u.email?.toLowerCase() === email.toLowerCase()
      );

      let authUserId: string | undefined;

      if (existingAuthUser) {
        // User already has an Auth account (e.g., previously created manually or re-registration).
        // Keep their existing password, just link this registration to them.
        authUserId = existingAuthUser.id;
        console.warn('[Registrations] Auth user already exists for', email, 'ID:', authUserId);
      } else {
        // Create Supabase Auth user at registration time (not approval time)
        // so the user's chosen password is used for the Auth account.
        const { data: authUserData, error: authUserError } = await supabaseAdmin.auth.admin.createUser({
          email: email.toLowerCase(),
          password: password,
          email_confirm: false,
          user_metadata: {
            full_name: name,
            registration_pending: true
          }
        });

        if (authUserError) {
          console.error('[Registrations] Auth user creation failed:', authUserError.message);
          return res.status(500).json({
            error: 'Failed to create user account',
            details: authUserError.message
          });
        }

        authUserId = authUserData?.user?.id;
      }

      const newRegId = uuidv4();

      const { data: newReg, error: insertError } = await supabaseAdmin
        .from('registrations')
        .insert([{
          id: newRegId,
          name,
          email: email.toLowerCase(),
          phone: phone || '',
          auth_user_id: authUserId,
          requested_role: requestedRole,
          status: 'pending',
          created_at: new Date().toISOString()
        }])
        .select()
        .single();

      if (insertError) {
        console.error('[Registrations] Insert error:', insertError);
        // Clean up the auth user if registration insert fails
        try {
          await supabaseAdmin.auth.admin.deleteUser(authUserId);
        } catch (e) {
          console.warn('[Registrations] Failed to clean up auth user:', e);
        }
        throw insertError;
      }

      console.log('[Registrations] Submitted registration for:', email, 'Auth ID:', authUserId);

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

          // Auth user was already created at registration time with the user's chosen password.
          // Now we just need to confirm their email and create their profile.
          const authUserId = pendingReg.auth_user_id;

          if (!authUserId) {
            return res.status(400).json({ error: 'No auth user ID found in registration. User may need to re-register.' });
          }

          // Confirm the user's email so they can login
          const { error: confirmError } = await supabaseAdmin.auth.admin.updateUserById(
            authUserId,
            { email_confirm: true }
          );

          if (confirmError) {
            console.error('[Registrations] Email confirmation failed:', confirmError.message);
            // Non-blocking — try to continue
          }

          // FIX: Check if profile already exists — if so, update it instead of inserting
          const { data: existingProfile } = await supabaseAdmin
            .from('profiles')
            .select('id')
            .eq('id', authUserId)
            .maybeSingle();

          if (existingProfile) {
            // Profile already exists — update it
            const { error: profileUpdateError } = await supabaseAdmin
              .from('profiles')
              .update({
                full_name: pendingReg.name,
                email: pendingReg.email,
                phone: pendingReg.phone || '',
                role: (pendingReg.requested_role || 'SITE_ENGINEER').toUpperCase(),
                avatar_url: `https://ui-avatars.com/api/?name=${encodeURIComponent(pendingReg.name)}&background=random`,
                last_seen: new Date().toISOString(),
                updated_at: new Date().toISOString()
              })
              .eq('id', authUserId);

            if (profileUpdateError) {
              console.error('[Registrations] Profile update failed:', profileUpdateError.message);
              // Non-blocking — profile already exists
            }
          } else {
            // Create user profile in Supabase tables (links to auth user)
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
          }

          console.log('[Registrations] Approved user:', pendingReg.email, 'Auth ID:', authUserId);

          // Delete the registration
          const { error: deleteError } = await supabaseAdmin
            .from('registrations')
            .delete()
            .eq('id', id);

          if (deleteError) {
            console.error('[Registrations] Delete failed:', deleteError);
          }

// Return user object directly so the frontend can use it as a User
return res.status(200).json({
            id: authUserId,
            name: pendingReg.name,
            email: pendingReg.email,
            role: (pendingReg.requested_role || 'SITE_ENGINEER').toUpperCase(),
            phone: pendingReg.phone || '',
            avatar: `https://ui-avatars.com/api/?name=${encodeURIComponent(pendingReg.name)}&background=random`,
            _id: authUserId
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