// api/auth/login.ts
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { connectToDatabase } from '../_utils/dbConnect.js';
import bcrypt from 'bcrypt';
import { withErrorHandler } from '../_utils/errorHandler.js';
import { generateToken } from '../_utils/auth.js';
import { CSRFProtection } from '../_utils/csrf.js';

export default withErrorHandler(async function (req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method Not Allowed' });
    return;
  }

  try {
    const { User } = await connectToDatabase();
    const { email, password } = req.body;

    if (!email || !password) {
      res.status(400).json({ error: 'Email and password are required' });
      return;
    }

    // Find user by email
    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) {
      res.status(401).json({ error: 'Invalid credentials' });
      return;
    }

    // Check password using bcrypt
    if (!user.password) {
      res.status(401).json({ error: 'Invalid credentials' });
      return;
    }

    const passwordMatch = await bcrypt.compare(password, user.password);
    if (!passwordMatch) {
      res.status(401).json({ error: 'Invalid credentials' });
      return;
    }

    // Return user data (without password)
    const userData = user.toObject();
    delete (userData as any).password;

    // Generate real JWT
    const token = generateToken({
      userId: user.id,
      email: user.email,
      role: user.role
    });

    // Generate CSRF Token
    const csrfToken = CSRFProtection.generateToken();

    // Set cookies
    const cookieOptions = [
      `roadmaster-token=${token}; HttpOnly; Path=/; SameSite=Strict; Max-Age=86400`,
      `csrf-token=${csrfToken}; Path=/; SameSite=Strict; Max-Age=86400`
    ];
    
    if (process.env.NODE_ENV === 'production') {
      cookieOptions[0] += '; Secure';
      cookieOptions[1] += '; Secure';
    }

    res.setHeader('Set-Cookie', cookieOptions);

    res.status(200).json({
      success: true,
      user: userData,
      token,
      csrfToken
    });
  } catch (error: any) {
    console.error('Login failed:', error);
    res.status(500).json({ error: 'Login failed', details: error.message });
  }
})
