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

      console.log(`[AUTH] Login attempt for: ${email}`);

      
      if (!supabasePublic.auth) {
         console.error('[AUTH] supabasePublic.auth is undefined! Client init failure.');
         return res.status(500).json({ error: 'Supabase client init failure' });
      }

      const { data, error } = await supabasePublic.auth.signInWithPassword({
        email: email.trim().toLowerCase(),
        password,
      });


      if (error) {
        console.warn(`[AUTH] Login failed for ${email}:`, error.message);
        return res.status(401).json({ error: 'Invalid credentials', details: error.message });
      }


      if (!data.user || !data.session) {
        return res.status(401).json({ error: 'Login failed - no session' });
      }

      // Update lastSeen in profiles table (optional - skip if RLS blocks)
      try {
        const { error: updateError } = await supabasePublic
          .from('profiles')
          .update({ last_seen: new Date().toISOString() })
          .eq('id', data.user.id);
        
        if (updateError) {
          console.warn('[AUTH] Profiles update failed (likely RLS):', updateError.message);
        }
      } catch (profileError) {
        console.warn('[AUTH] Profiles table access failed:', profileError);
      }

      const accessToken = data.session.access_token;
      const refreshToken = data.session.refresh_token || ''; // Fallback if missing
      
      if (!refreshToken) {
        console.warn('[AUTH] No refresh_token in session - using short-lived access only');
      }

      const cookieOptions = [
        `roadmaster-access=${accessToken}; HttpOnly; Path=/; SameSite=Lax; Max-Age=3600`,
        `roadmaster-refresh=${refreshToken}; HttpOnly; Path=/; SameSite=Lax; Max-Age=2592000` // 30 days for refresh
      ];
      
      if (process.env.NODE_ENV === 'production') {
        cookieOptions[0] += '; Secure';
        cookieOptions[1] += '; Secure';
      }

      res.setHeader('Set-Cookie', cookieOptions);

      return res.status(200).json({
        success: true,
        user: {
          id: data.user.id,
          email: data.user.email,
          user_metadata: data.user.user_metadata,
        },
        access_token: accessToken
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
      const accessToken = req.cookies['roadmaster-access'] || req.cookies['roadmaster-token'];
      const refreshToken = req.cookies['roadmaster-refresh'];
      
      if (accessToken) {
        await supabaseAdmin.auth.admin.signOut(accessToken);
      }
      if (refreshToken) {
        // Note: Supabase admin.signOut expects access_token, not refresh_token
        console.warn('Refresh token cleanup not directly supported via admin API');
      }
    } catch (error) {
      console.warn('Logout token revoke failed:', error);
    }

    res.setHeader('Set-Cookie', [
      'roadmaster-access=; HttpOnly; Path=/; SameSite=Strict; Max-Age=0; Expires=Thu, 01 Jan 1970 00:00:00 GMT',
      'roadmaster-refresh=; HttpOnly; Path=/; SameSite=Strict; Max-Age=0; Expires=Thu, 01 Jan 1970 00:00:00 GMT',
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
      const refreshToken = req.cookies['roadmaster-refresh'];
      if (!refreshToken) {
        return res.status(401).json({ error: 'No refresh token provided' });
      }

      const { data: { session }, error } = await supabasePublic.auth.refreshSession({ refresh_token: refreshToken });

      if (error || !session) {
        console.error('[AUTH] Refresh failed:', error?.message);
        return res.status(401).json({ error: 'Session refresh failed', details: error?.message });
      }

      const newAccessToken = session.access_token;
      const newRefreshToken = session.refresh_token;

      const cookieOptions = [
        `roadmaster-access=${newAccessToken}; HttpOnly; Path=/; SameSite=Lax; Max-Age=3600`,
        `roadmaster-refresh=${newRefreshToken}; HttpOnly; Path=/; SameSite=Lax; Max-Age=2592000`
      ];
      
      if (process.env.NODE_ENV === 'production') {
        cookieOptions[0] += '; Secure';
        cookieOptions[1] += '; Secure';
      }

      res.setHeader('Set-Cookie', cookieOptions);

      return res.status(200).json({
        success: true,
        access_token: newAccessToken
      });
    } catch (error: any) {
      console.error('Token refresh failed:', error);
      return res.status(500).json({ error: 'Token refresh failed', details: error.message });
    }
  }

  return res.status(400).json({ error: 'Invalid action' });
};

export default withErrorHandler(handler);
