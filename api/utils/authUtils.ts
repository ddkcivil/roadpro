import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

const getJwtSecret = () => {
  const secret = process.env.JWT_SECRET || 'dev-secret-change-me-in-prod';
  if (secret === 'dev-secret-change-me-in-prod' && process.env.NODE_ENV === 'production') {
    console.warn('[CRITICAL] Using default JWT_SECRET in production!');
  }
  return secret;
};

const SALT_ROUNDS = 12;

// Generic user-like shape for legacy/local mappers.
// (Kept for type compatibility; DB is expected to be Supabase.)
export interface UserLike {
  // Supabase users typically use `id`; legacy code may use `_id`.
  id?: string;
  _id?: string;
  email: string;
  passwordHash?: string;
  full_name: string;
  role: string;
  avatar_url?: string;
  last_seen?: string;
  phone?: string;
}


export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, SALT_ROUNDS);
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

export function generateToken(payload: { userId: string; email: string; role: string }): string {
  return jwt.sign(payload, getJwtSecret(), { expiresIn: '7d' });
}

export async function verifyToken(token: string): Promise<{ userId: string; email: string; role: string } | null> {
  try {
    const payload = jwt.verify(token, getJwtSecret()) as any;
    return {
      userId: payload.userId,
      email: payload.email,
      role: payload.role
    };
  } catch {
    return null;
  }
}
