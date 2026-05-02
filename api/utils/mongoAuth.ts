import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { mongodb } from '../../lib/mongodb.js';

const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-change-me-in-prod';
console.log(`[MongoAuth] Using JWT_SECRET of length: ${JWT_SECRET.length}, starts with: ${JWT_SECRET.substring(0, 3)}...`);
const SALT_ROUNDS = 12;

export interface MongoUser {
  _id: string;
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
  return jwt.sign(payload, JWT_SECRET, { expiresIn: '7d' });
}

export async function verifyToken(token: string): Promise<{ userId: string; email: string; role: string } | null> {
  try {
    const payload = jwt.verify(token, JWT_SECRET) as any;
    return {
      userId: payload.userId,
      email: payload.email,
      role: payload.role
    };
  } catch {
    return null;
  }
}

export async function getUserById(userId: string): Promise<MongoUser | null> {
  console.log('[MongoAuth] Getting user by ID:', userId);
  try {
    const db = await mongodb.connect();
    const user = await db.collection('users').findOne({ _id: userId });
    console.log('[MongoAuth] User by ID found:', user ? 'Yes' : 'No');
    return user;
  } catch (error) {
    console.error('[MongoAuth] Error getting user by ID:', error);
    throw error;
  }
}

export async function getUserByEmail(email: string): Promise<MongoUser | null> {
  console.log('[MongoAuth] Getting user by email:', email);
  try {
    const db = await mongodb.connect();
    const user = await db.collection('users').findOne({ email: email.toLowerCase() });
    console.log('[MongoAuth] User by email found:', user ? 'Yes' : 'No');
    return user;
  } catch (error) {
    console.error('[MongoAuth] Error getting user by email:', error);
    throw error;
  }
}
