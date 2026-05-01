import type { VercelRequest, VercelResponse } from '@vercel/node';
import { mongodb } from '../../lib/mongodb.ts';
import { supabaseAdmin } from './_utils/supabaseClient.js';
import { withErrorHandler } from './_utils/errorHandler.js';
import { withAuth } from './_utils/auth.js';
import { mapUserFromDb } from './_utils/mappers.js';
import { hashPassword, getUserByEmail, getUserById } from './_utils/mongoAuth.js';
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
    
    // Update MongoDB if available
    try {
      const db = await mongodb.connect();
      await db.collection('users').updateOne(
        { _id: userId },
        { $set: { last_seen: now } }
      );
    } catch (err) {
      console.warn('[Heartbeat] Mongo update failed (expected if user is Supabase-only):', err);
    }

    // Update Supabase if available
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
        // Fetch a specific user
        const user = await getUserById(id);
        if (!user) return res.status(404).json({ error: 'User not found' });
        return res.status(200).json(mapUserFromDb(user));
      } else {
        // Fetch all users
        const db = await mongodb.connect();
        const users = await db.collection('users').find({}).toArray();
        return res.status(200).json(users.map(mapUserFromDb));
      }
    } catch (error: any) {
      console.error('Failed to fetch users:', error);
      throw error;
    }
  }

  // --- CREATE USER ---
  if (req.method === 'POST') {
    if (userRole?.toUpperCase() !== 'ADMIN') {
      return res.status(403).json({ error: 'Only admins can create users' });
    }

    try {
      const { name, email, phone, role, password, avatar } = req.body;

      if (!name || !email || !password) {
        return res.status(400).json({ error: 'Name, email, and password are required' });
      }

      // Check if user already exists
      const existingUser = await getUserByEmail(email);
      if (existingUser) {
        return res.status(409).json({ error: 'User already exists' });
      }

      const hashedPassword = await hashPassword(password);
      const newUserId = uuidv4();
      
      const newUser = {
        _id: newUserId,
        email: email.toLowerCase(),
        passwordHash: hashedPassword,
        full_name: name,
        phone: phone || '',
        role: role || 'SITE_ENGINEER',
        avatar_url: avatar || generateAvatarUrl(name),
        last_seen: new Date().toISOString(),
        created_at: new Date().toISOString()
      };

      const db = await mongodb.connect();
      await db.collection('users').insertOne(newUser);

      return res.status(201).json(mapUserFromDb(newUser));
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

    if (userRole?.toUpperCase() !== 'ADMIN' && userId !== id) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    try {
      const { name, role, avatar, password, phone } = req.body;
      const updateData: any = {};

      if (name) updateData.full_name = name;
      if (role && userRole?.toUpperCase() === 'ADMIN') updateData.role = role;
      if (avatar) updateData.avatar_url = avatar;
      if (phone !== undefined) updateData.phone = phone;
      if (password) {
        updateData.passwordHash = await hashPassword(password);
      }

      if (Object.keys(updateData).length === 0) {
        return res.status(400).json({ error: 'No data to update' });
      }

      const db = await mongodb.connect();
      const result = await db.collection('users').findOneAndUpdate(
        { _id: id },
        { $set: updateData },
        { returnDocument: 'after' }
      );

      if (!result) {
        return res.status(404).json({ error: 'User not found' });
      }

      const updatedUser = (result as any).value || result;
      return res.status(200).json(mapUserFromDb(updatedUser));

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
      const db = await mongodb.connect();
      const result = await db.collection('users').deleteOne({ _id: id });
      if (result.deletedCount === 0) {
        return res.status(404).json({ error: 'User not found' });
      }
      return res.status(204).end();
    } catch (error: any) {
      console.error('Failed to delete user:', error);
      throw error;
    }
  }

  return res.status(405).json({ error: 'Method Not Allowed' });
};

export default withErrorHandler(withAuth(handler));
