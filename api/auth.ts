import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';
import { withErrorHandler } from './_utils/errorHandler.js';
import { supabaseAdmin, supabasePublic } from './_utils/supabaseClient.js';

const handler = async function (req: VercelRequest, res: VercelResponse) {
  const { action } = req.query;

  if (action === 'login') {
    if (req.method !== 'POST') {
      return res.status(405).json({ error: 'Method Not Allowed' });
    }

    try {
      const { email, password } = req.body;

      if (!email || !password) {
        return res.status(400).json({ error: 'Email and password are required' });
      }

      const { data, error } = await supabasePublic.auth.signInWithPassword({
        email: email.toLowerCase(),
        password,
      });

      if (error) {
        return res.status(401).json({ error: 'Invalid credentials' });
      }

      if (!data.user || !data.session) {
        return res.status(401).json({ error: 'Login failed - no session' });
      }

      // Update lastSeen in profiles table
      const { error: updateError } = await supabasePublic
        .from('profiles')
        .update({ last_seen: new Date().toISOString() })
        .eq('id', data.user.id);


      if (updateError) {
        console.warn('Failed to update last_seen:', updateError);
      }

      const token = data.session.access_token;

      const cookieOptions = [
        `roadmaster-token=${token}; HttpOnly; Path=/; SameSite=Lax; Max-Age=3600`
      ];
      
      if (process.env.NODE_ENV === 'production') {
        cookieOptions[0] += '; Secure';
      }

      res.setHeader('Set-Cookie', cookieOptions);

      return res.status(200).json({
        success: true,
        user: {
          id: data.user.id,
          email: data.user.email,
          user_metadata: data.user.user_metadata,
        },
        token
      });
    } catch (error: any) {
      console.error('Login failed:', error);
      return res.status(500).json({ error: 'Login failed', details: error.message });
    }
  } 
  
  if (action === 'logout') {
    if (req.method !== 'POST') {
      return res.status(405).json({ error: 'Method Not Allowed' });
    }

    try {
      const token = req.cookies['roadmaster-token'];
      if (token) {
        // Optional: Revoke token using supabaseAdmin
        await supabaseAdmin.auth.admin.signOut(token);
      }
    } catch (error) {
      console.warn('Logout token revoke failed:', error);
    }

    res.setHeader('Set-Cookie', [
      'roadmaster-token=; HttpOnly; Path=/; SameSite=Strict; Max-Age=0; Expires=Thu, 01 Jan 1970 00:00:00 GMT'
    ]);

    return res.status(200).json({
      success: true,
      message: 'Logged out successfully'
    });
  }

  if (action === 'refresh') {
    if (req.method !== 'POST') {
      return res.status(405).json({ error: 'Method Not Allowed' });
    }

    try {
      const token = req.cookies['roadmaster-token'];
      if (!token) {
        return res.status(401).json({ error: 'No token provided' });
      }

      const { data: { session }, error } = await supabasePublic.auth.refreshSession({ refresh_token: token });

      if (error || !session) {
        return res.status(401).json({ error: 'Session refresh failed' });
      }

      const newToken = session.access_token;

      const cookieOptions = [
        `roadmaster-token=${newToken}; HttpOnly; Path=/; SameSite=Lax; Max-Age=3600`
      ];
      
      if (process.env.NODE_ENV === 'production') {
        cookieOptions[0] += '; Secure';
      }

      res.setHeader('Set-Cookie', cookieOptions);

      return res.status(200).json({
        success: true,
        token: newToken
      });
    } catch (error: any) {
      console.error('Token refresh failed:', error);
      return res.status(500).json({ error: 'Token refresh failed', details: error.message });
    }
  }

  return res.status(400).json({ error: 'Invalid action' });
};

export default withErrorHandler(handler);
