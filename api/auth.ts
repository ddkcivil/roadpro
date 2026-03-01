import type { VercelRequest, VercelResponse } from '@vercel/node';
import { connectToDatabase } from './_utils/dbConnect.js';
import bcrypt from 'bcrypt';
import { withErrorHandler } from './_utils/errorHandler.js';
import { withAuth, generateToken } from './_utils/auth.js';
import { CSRFProtection } from './_utils/csrf.js';

const handler = async function (req: VercelRequest, res: VercelResponse) {
  const { action } = req.query;

  if (action === 'login') {
    if (req.method !== 'POST') {
      return res.status(405).json({ error: 'Method Not Allowed' });
    }

    try {
      const { User } = await connectToDatabase();
      const { email, password } = req.body;

      if (!email || !password) {
        return res.status(400).json({ error: 'Email and password are required' });
      }

      const user = await User.findOne({ email: email.toLowerCase() });
      if (!user || !user.password) {
        return res.status(401).json({ error: 'Invalid credentials' });
      }

      const passwordMatch = await bcrypt.compare(password, user.password);
      if (!passwordMatch) {
        return res.status(401).json({ error: 'Invalid credentials' });
      }

      const userData = user.toObject();
      delete (userData as any).password;

      const token = generateToken({
        userId: user.id,
        email: user.email,
        role: user.role
      });

      const csrfToken = CSRFProtection.generateToken();

      const cookieOptions = [
        `roadmaster-token=${token}; HttpOnly; Path=/; SameSite=Strict; Max-Age=86400`,
        `csrf-token=${csrfToken}; Path=/; SameSite=Strict; Max-Age=86400`
      ];
      
      if (process.env.NODE_ENV === 'production') {
        cookieOptions[0] += '; Secure';
        cookieOptions[1] += '; Secure';
      }

      res.setHeader('Set-Cookie', cookieOptions);

      return res.status(200).json({
        success: true,
        user: userData,
        token,
        csrfToken
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

    return withAuth(async (req: any, res: VercelResponse) => {
      try {
        const user = req.user;
        if (!user) {
          return res.status(401).json({ error: 'User context not found' });
        }

        const newToken = generateToken({
          userId: user.userId,
          email: user.email,
          role: user.role
        });

        const cookieOptions = [
          `roadmaster-token=${newToken}; HttpOnly; Path=/; SameSite=Strict; Max-Age=86400`
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
    })(req, res);
  }

  return res.status(400).json({ error: 'Invalid action' });
};

export default withErrorHandler(handler);
