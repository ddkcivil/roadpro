import type { VercelRequest, VercelResponse } from '@vercel/node';
import { getSupabaseAdmin, getSupabasePublic, isSupabaseConfigured } from './_utils/supabaseClient.js';
import { withErrorHandler } from './_utils/errorHandler.js';
import { withAuth } from './_utils/auth.js';
import { generateUniqueId, uuidv4 } from './_utils/uuidUtils.js';
import { hashPassword } from './_utils/authUtils.js';
import crypto from 'crypto';

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

          // FIX: Generate a secure temporary password instead of using pendingReg.password (which doesn't exist)
          // The user will reset their password on first login via "Forgot Password"
          const tempPassword = crypto.randomBytes(16).toString('hex') + 'Aa1!';

          // FIX: Check if user already exists in Auth before attempting to create
          // This prevents 500 errors from duplicate auth user creation
          const { data: existingAuthUsers } = await supabaseAdmin.auth.admin.listUsers();
          const existingAuthUser = existingAuthUsers?.users?.find(
            (u: any) => u.email?.toLowerCase() === pendingReg.email.toLowerCase()
          );

          let authUserId: string;
          let authUserCreated = false;

          if (existingAuthUser) {
            // User already exists in Auth — use their existing ID
            authUserId = existingAuthUser.id;
            console.log('[Registrations] Found existing auth user:', pendingReg.email, 'ID:', authUserId);

            // Update their password so they can login
            const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(
              authUserId,
              { password: tempPassword }
            );

            if (updateError) {
              console.warn('[Registrations] Could not update existing user password:', updateError.message);
              // Non-blocking — user might have a method to reset password
            }
          } else {
            // Create a Supabase Auth user using admin API (so they can login)
            const { data: authUserData, error: authUserError } = await supabaseAdmin.auth.admin.createUser({
              email: pendingReg.email,
              password: tempPassword,
              email_confirm: true,
              user_metadata: {
                full_name: pendingReg.name
              }
            });

            if (authUserError) {
              console.error('[Registrations] Auth user creation failed:', authUserError.message);
              return res.status(500).json({
                error: 'Failed to create user account',
                details: authUserError.message
              });
            }

            authUserId = authUserData?.user?.id || userId;
            authUserCreated = true;
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
              // If auth user was created but profile failed, clean up the auth user
              if (authUserCreated) {
                try {
                  await supabaseAdmin.auth.admin.deleteUser(authUserId);
                  console.log('[Registrations] Cleaned up auth user after profile creation failure');
                } catch (cleanupErr) {
                  console.warn('[Registrations] Failed to clean up auth user:', cleanupErr);
                }
              }
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