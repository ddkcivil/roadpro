import type { VercelRequest, VercelResponse } from '@vercel/node';
const { mongodb } = await import('../lib/mongodb.js');
import { supabaseAdmin } from './utils/supabaseClient.js';
import { withErrorHandler } from './utils/errorHandler.js';
import { withAuth } from './utils/auth.js';
import { v4 as uuidv4 } from 'uuid';

function generateAvatarUrl(name: string): string {
  return `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=random`;
}

const handler = async function (req: VercelRequest, res: VercelResponse) {
  const { id, action } = req.query;
  const userId = (req as any).user?.userId;
  const userRole = (req as any).user?.role;

  // --- HEARTBEAT ---
  if (req.method === 'POST' && action === 'heartbeat') {
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });
    const now = new Date().toISOString();

    // Track activity in Supabase
    try {
      await supabaseAdmin
        .from('profiles')
        .update({ last_seen: now, updated_at: now })
        .eq('id', userId);
    } catch (err) {
      console.warn('[Heartbeat] Supabase update failed:', err);
    }

    return res.status(200).json({ message: 'Heartbeat updated' });
  }

  // --- GET USERS ---
  if (req.method === 'GET') {
    try {
      if (id && typeof id === 'string') {
        // 1. Try Supabase
        const { data: profile, error: sbError } = await supabaseAdmin
          .from('profiles')
          .select('*')
          .eq('id', id)
          .single();

        if (!sbError && profile) {
          return res.status(200).json(profile);
        }

        // 2. Fallback to MongoDB
        console.log(`[User API] User ${id} not found in Supabase, checking MongoDB...`);
        const db = await mongodb.connect();
        const mongoUser = await db.collection('users').findOne({ _id: id });

        if (mongoUser) {
          return res.status(200).json({
            id: mongoUser._id,
            full_name: mongoUser.full_name,
            email: mongoUser.email,
            role: mongoUser.role,
            avatar_url: mongoUser.avatar_url,
            is_legacy: true
          });
        }

        return res.status(404).json({ error: 'User not found' });
      } else {
        // Fetch all (Supabase-first)
        const { data: profiles, error } = await supabaseAdmin
          .from('profiles')
          .select('*');
        
        if (error) {
          console.error('[API Error] Supabase GET all profiles error:', error);
          throw error;
        }
        return res.status(200).json(profiles);
      }
    } catch (error: any) {
      console.error('[API Error] GET users failed:', error);
      throw error;
    }
  }

  // --- CREATE USER ---
  if (req.method === 'POST') {
    if (userRole?.toUpperCase() !== 'ADMIN') {
      return res.status(403).json({ error: 'Only admins can create users' });
    }

    try {
      const { name, email, role, avatar } = req.body;

      if (!name || !email) {
        return res.status(400).json({ error: 'Name and email are required' });
      }

      // Supabase Auth handles the actual user creation.
      // We assume the user has already been created in Auth via a separate flow, 
      // or we just need to create the profile record here.
      const newUserId = uuidv4();
      
      const { data: profile, error } = await supabaseAdmin
        .from('profiles')
        .insert([{
          id: newUserId,
          full_name: name,
          role: role || 'SITE_ENGINEER',
          avatar_url: avatar || generateAvatarUrl(name),
          last_seen: new Date().toISOString(),
          created_at: new Date().toISOString()
        }])
        .select()
        .single();

      if (error) throw error;

      return res.status(201).json(profile);
    } catch (error: any) {
      console.error('Failed to create user profile:', error);
      throw error;
    }
  }

  // --- UPDATE USER ---
  if (req.method === 'PUT') {
    if (!id || typeof id !== 'string') {
      return res.status(400).json({ error: 'User ID is required for update' });
    }

    if (userRole?.toUpperCase() !== 'ADMIN' && userId !== id) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    try {
      const { name, role, avatar, phone } = req.body;
      const updateData: any = { updated_at: new Date().toISOString() };

      if (name) updateData.full_name = name;
      if (role && userRole?.toUpperCase() === 'ADMIN') updateData.role = role;
      if (avatar) updateData.avatar_url = avatar;

      if (Object.keys(updateData).length <= 1) {
        return res.status(400).json({ error: 'No data to update' });
      }

      const { data: updatedProfile, error } = await supabaseAdmin
        .from('profiles')
        .update(updateData)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return res.status(200).json(updatedProfile);

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

    if (userRole?.toUpperCase() !== 'ADMIN') {
      return res.status(403).json({ error: 'Forbidden: Only admins can delete users.' });
    }

    try {
      const { error } = await supabaseAdmin
        .from('profiles')
        .delete()
        .eq('id', id);
        
      if (error) throw error;
      
      return res.status(204).end();
    } catch (error: any) {
      console.error('Failed to delete user profile:', error);
      throw error;
    }
  }

  return res.status(405).json({ error: 'Method Not Allowed' });
};

export default withErrorHandler(withAuth(handler));

