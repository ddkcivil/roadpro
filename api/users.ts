import type { VercelRequest, VercelResponse } from '@vercel/node';
import { supabasePublic, supabaseAdmin } from './_utils/supabaseClient.js';
import { withErrorHandler } from './_utils/errorHandler.js';
import { withAuth } from './_utils/auth.js';

// Helper to generate avatar URL, similar to the original
function generateAvatarUrl(name: string): string {
  return `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=random`;
}

const handler = async function (req: VercelRequest, res: VercelResponse) {
  const { id, action } = req.query;
  const userId = (req as any).user?.userId;
  const userRole = (req as any).user?.role;

  // --- HEARTBEAT (already using Supabase) ---
  if (req.method === 'POST' && action === 'heartbeat') {
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });
    const { error } = await supabaseAdmin
      .from('profiles')
      .update({ last_seen: new Date().toISOString() })
      .eq('id', userId);

    if (error) throw error; // Let withErrorHandler handle it
    return res.status(200).json({ message: 'Heartbeat updated' });
  }

  // --- GET USERS ---
  if (req.method === 'GET') {
    try {
      let query = supabasePublic.from('profiles').select('id, full_name, email, phone, role, avatar_url, last_seen');

      if (id) {
        // Fetch a specific user
        const { data, error } = await query.eq('id', id).single();
        if (error) throw error;
        if (!data) return res.status(404).json({ error: 'User not found' });
        return res.status(200).json(data);
      } else {
        // Fetch all users for chat/messaging feature
        const { data, error } = await query;
        if (error) throw error;
        return res.status(200).json(data);
      }
    } catch (error: any) {
      console.error('Failed to fetch users:', error);
      throw error; // Let withErrorHandler handle it
    }
  }

  // --- CREATE USER ---
  if (req.method === 'POST') {
    if (userRole !== 'Admin' && userRole !== 'ADMIN') {
      return res.status(403).json({ error: 'Only admins can create users' });
    }

    try {
      const { name, email, phone, role, password, avatar } = req.body;

      if (!name || !email || !password) {
        return res.status(400).json({ error: 'Name, email, and password are required' });
      }

      // Check if email already exists in profiles table
      const { data: existingUser, error: checkError } = await supabasePublic
        .from('profiles')
        .select('id')
        .eq('email', email.toLowerCase())
        .single();

      if (checkError && checkError.message !== 'No single row found') throw checkError; // Rethrow other errors
      if (existingUser) {
        return res.status(409).json({ error: 'User with this email already exists.' });
      }

      // Create user in Supabase Auth
      const { data: newUser, error: authError } = await supabaseAdmin.auth.admin.createUser({
        email: email.toLowerCase(),
        password: password,
        user_metadata: {
          name: name,
          phone: phone,
          role: role || 'SITE_ENGINEER',
          avatar: avatar || generateAvatarUrl(name),
        },
      });

      if (authError) throw authError;

      // Insert user details into profiles table
      const { error: profileError } = await supabasePublic.from('profiles').insert({
        id: newUser.user.id, // Supabase auth user ID
        full_name: name,
        email: email.toLowerCase(),
        phone: phone,
        role: role || 'SITE_ENGINEER',
        avatar_url: avatar || generateAvatarUrl(name),
        last_seen: new Date().toISOString(), // Initialize last_seen
      });

      if (profileError) throw profileError;

      // Return created user data (excluding password)
      const userData = {
        id: newUser.user.id,
        full_name: name,
        email: email.toLowerCase(),
        phone: phone,
        role: role || 'SITE_ENGINEER',
        avatar_url: avatar || generateAvatarUrl(name),
        last_seen: new Date().toISOString(),
      };
      return res.status(201).json(userData);
    } catch (error: any) {
      console.error('Failed to create user:', error);
      throw error;
    }
  }

  // --- UPDATE USER ---
  if (req.method === 'PUT') {
    if (!id || typeof id !== 'string') {
      return res.status(400).json({ error: 'User ID is required for update' });
    }

    // Authorize: User can update their own profile, or admin can update any profile.
    if (userRole !== 'Admin' && userRole !== 'ADMIN' && userId !== id) {
      return res.status(403).json({ error: 'Forbidden: You can only update your own profile or as an admin.' });
    }

    try {
      const { name, email, phone, role, avatar, password } = req.body;

      // Validate required fields if they are present in the body
      if (!name || !email || !role) {
        return res.status(400).json({ error: 'Name, email, and role are required fields for update' });
      }

      // Check if email already exists for another user
      if (email) {
        const { data: existingUser, error: checkError } = await supabasePublic
          .from('profiles')
          .select('id')
          .eq('email', email.toLowerCase())
          .neq('id', id) // Ensure it's not the current user's email
          .single();

        if (checkError && checkError.message !== 'No single row found') throw checkError;
        if (existingUser) {
          return res.status(409).json({ error: 'A user with this email already exists.' });
        }
      }

      // Update Supabase Auth user if password is changed
      if (password) {
        if (password.length < 6) {
          return res.status(400).json({ error: 'Password must be at least 6 characters' });
        }
        const { error: authUpdateError } = await supabaseAdmin.auth.admin.updateUserById(id, {
          password: password,
        });
        if (authUpdateError) throw authUpdateError;
      }

      // Update user details in profiles table
      const { error: profileUpdateError } = await supabasePublic
        .from('profiles')
        .update({
          full_name: name,
          email: email.toLowerCase(),
          phone: phone,
          role: role,
          avatar_url: avatar || generateAvatarUrl(name), // Ensure avatar is set, regenerate if not provided
        })
        .eq('id', id);

      if (profileUpdateError) throw profileUpdateError;

      // Fetch updated user data to return
      const { data: updatedUser, error: fetchError } = await supabasePublic
        .from('profiles')
        .select('id, full_name, email, phone, role, avatar_url, last_seen')
        .eq('id', id)
        .single();


      if (fetchError) throw fetchError;
      if (!updatedUser) return res.status(404).json({ error: 'User not found after update' });

      return res.status(200).json(updatedUser);

    } catch (error: any) {
      console.error('Failed to update user:', error);
      throw error;
    }
  }

  // --- DELETE USER ---
  if (req.method === 'DELETE') {
    if (!id || typeof id !== 'string') {
      return res.status(400).json({ error: 'User ID is required for deletion' });
    }

    // Authorize: Only admins can delete users.
    if (userRole !== 'Admin' && userRole !== 'ADMIN') {
      return res.status(403).json({ error: 'Forbidden: Only admins can delete users.' });
    }

    try {
      // Delete user from Supabase Auth. This *should* cascade delete from profiles if RLS is set up correctly.
      // If not, we might need to delete from profiles first.
      const { error: authDeleteError } = await supabaseAdmin.auth.admin.deleteUser(id);
      if (authDeleteError) throw authDeleteError;

      return res.status(204).end(); // No content to send back on successful deletion
    } catch (error: any) {
      console.error('Failed to delete user:', error);
      throw error;
    }
  }

  return res.status(405).json({ error: 'Method Not Allowed' });
};

export default withErrorHandler(withAuth(handler));
