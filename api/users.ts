import type { VercelRequest, VercelResponse } from '@vercel/node';
import { getSupabaseAdmin, isSupabaseConfigured } from './_utils/supabaseClient.js';
import { withErrorHandler } from './_utils/errorHandler.js';
import { withAuth } from './_utils/auth.js';
import { mapUserFromDb } from './_utils/mappers.js';
import { v4 as uuidv4 } from 'uuid';

function generateAvatarUrl(name: string): string {
  return `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=random`;
}

const handler = async function (req: VercelRequest, res: VercelResponse) {
  // Get Supabase admin client using getter
  if (!isSupabaseConfigured()) {
    console.error('[API /users] Supabase not configured - check SUPABASE_URL and SUPABASE_ANON_KEY');
    return res.status(503).json({ error: 'Database service not configured', hint: 'Set SUPABASE_URL and SUPABASE_ANON_KEY in Vercel env' });
  }
  const supabaseAdmin = getSupabaseAdmin();
  if (!supabaseAdmin) {
    console.error('[API /users] Admin client null - check SUPABASE_SERVICE_ROLE_KEY');
    return res.status(503).json({ error: 'Database service not available', hint: 'Set SUPABASE_SERVICE_ROLE_KEY in Vercel env' });
  }
  
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
        // Get user from Supabase - specify columns explicitly to avoid missing column errors
        const { data: profile, error: sbError } = await supabaseAdmin
          .from('profiles')
          .select('id, email, full_name, role, avatar_url, phone, last_seen, created_at, updated_at')
          .eq('id', id)
          .single();

        if (sbError) {
          console.error('[API Error] GET profile by ID error:', sbError.message, '| ID:', id);
          return res.status(404).json({ error: 'User not found', details: sbError.message });
        }

if (!profile) {
          return res.status(404).json({ error: 'User not found' });
        }

        return res.status(200).json(mapUserFromDb(profile));
      } else {
        // Fetch all users from Supabase - specify columns explicitly
        const { data: profiles, error } = await supabaseAdmin
          .from('profiles')
          .select('id, email, full_name, role, avatar_url, phone, last_seen, created_at, updated_at');
        
        if (error) {
          console.error('[API Error] Supabase GET all profiles error:', error.message, error.code);
          return res.status(500).json({ error: 'Failed to fetch users', details: error.message });
        }
        
console.log(`[API] GET /users - found ${profiles?.length || 0} profiles`);
        return res.status(200).json((profiles || []).map(mapUserFromDb));
      }
    } catch (error: any) {
      console.error('[API Error] GET users failed:', error.message, error.stack);
      throw error;
    }
  }

// --- CREATE USER ---
  if (req.method === 'POST') {
    if (userRole?.toUpperCase() !== 'ADMIN') {
      return res.status(403).json({ error: 'Only admins can create users' });
    }

    try {
      const { name, email, role, avatar, phone } = req.body;

      if (!name || !email) {
        return res.status(400).json({ error: 'Name and email are required' });
      }

      const newUserId = uuidv4();
      
      const { data: profile, error } = await supabaseAdmin
        .from('profiles')
        .insert([{
          id: newUserId,
          full_name: name,
          email: email,
          phone: phone || null,
          role: role || 'SITE_ENGINEER',
          avatar_url: avatar || generateAvatarUrl(name),
          last_seen: new Date().toISOString(),
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }])
        .select('id, email, full_name, role, avatar_url, phone, last_seen, created_at, updated_at')
        .single();

      if (error) {
        console.error('[API Error] CREATE user error:', error.message, error.code, error.details);
return res.status(500).json({ error: 'Failed to create user', details: error.message });
      }
      
      return res.status(201).json(mapUserFromDb(profile));
    } catch (error: any) {
      console.error('[API Error] CREATE user exception:', error.message, error.stack);
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
      const { name, email, role, avatar, phone } = req.body;
      const updateData: any = { updated_at: new Date().toISOString() };

      if (name) updateData.full_name = name;
      if (email) updateData.email = email;
      if (phone !== undefined) updateData.phone = phone;
      if (role && userRole?.toUpperCase() === 'ADMIN') updateData.role = role;
      if (avatar) updateData.avatar_url = avatar;

      if (Object.keys(updateData).length <= 1) {
        return res.status(400).json({ error: 'No data to update' });
      }

      const { data: updatedProfile, error } = await supabaseAdmin
        .from('profiles')
        .update(updateData)
        .eq('id', id)
        .select('id, email, full_name, role, avatar_url, phone, last_seen, created_at, updated_at')
        .single();

      if (error) {
        console.error('[API Error] UPDATE user error:', error.message, error.code, error.details);
        return res.status(500).json({ error: 'Failed to update user', details: error.message });
      }
      
return res.status(200).json(mapUserFromDb(updatedProfile));

    } catch (error: any) {
      console.error('[API Error] UPDATE user exception:', error.message, error.stack);
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
        
      if (error) {
        console.error('[API Error] DELETE user error:', error.message, error.code, error.details);
        return res.status(500).json({ error: 'Failed to delete user', details: error.message });
      }
      
      return res.status(204).end();
    } catch (error: any) {
      console.error('[API Error] DELETE user exception:', error.message, error.stack);
      throw error;
    }
  }

  return res.status(405).json({ error: 'Method Not Allowed' });
};

export default withErrorHandler(withAuth(handler));
