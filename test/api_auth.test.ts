
import { describe, it, expect, vi, beforeEach } from 'vitest';
import handler from '../api/auth';
import { mongodb } from '../lib/mongodb';
import { clearTestCollection } from './setup';
import { hashPassword } from '../api/_utils/mongoAuth.js';

// Mock middleware only
vi.mock('../api/_utils/errorHandler.js', () => ({ withErrorHandler: (h: any) => h }));

describe('api/auth handler (Integration)', () => {
  let mockReq: any;
  let mockRes: any;

  beforeEach(async () => {
    vi.clearAllMocks();
    await clearTestCollection('users');
    
    mockReq = { method: '', query: {}, body: {}, headers: {} };
    mockRes = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn().mockReturnThis(),
      end: vi.fn().mockReturnThis(),
      setHeader: vi.fn().mockReturnThis(),
    };
  });

  it('POST /api/auth?action=login should login user with correct credentials', async () => {
    const password = 'password123';
    const hashedPassword = await hashPassword(password);
    
    await mongodb.db.collection('users').insertOne({
      _id: 'user-auth-1',
      email: 'auth@example.com',
      passwordHash: hashedPassword,
      full_name: 'Auth User',
      role: 'ADMIN'
    });

    mockReq.method = 'POST';
    mockReq.query.action = 'login';
    mockReq.body = { email: 'auth@example.com', password };

    await handler(mockReq, mockRes);

    expect(mockRes.status).toHaveBeenCalledWith(200);
    const result = mockRes.json.mock.calls[0][0];
    expect(result.token).toBeDefined();
    expect(result.user.email).toBe('auth@example.com');
  });

  it('POST /api/auth?action=login should return 401 for incorrect password', async () => {
    const hashedPassword = await hashPassword('password123');
    
    await mongodb.db.collection('users').insertOne({
      _id: 'user-auth-2',
      email: 'wrong@example.com',
      passwordHash: hashedPassword,
      full_name: 'Wrong Pass User'
    });

    mockReq.method = 'POST';
    mockReq.query.action = 'login';
    mockReq.body = { email: 'wrong@example.com', password: 'wrongpassword' };

    await handler(mockReq, mockRes);

    expect(mockRes.status).toHaveBeenCalledWith(401);
    expect(mockRes.json).toHaveBeenCalledWith(expect.objectContaining({ error: 'Invalid email or password' }));
  });

  it('POST /api/auth?action=verify should verify a valid token', async () => {
    // First login to get a token
    const password = 'password123';
    const hashedPassword = await hashPassword(password);
    await mongodb.db.collection('users').insertOne({
      _id: 'user-auth-3',
      email: 'verify@example.com',
      passwordHash: hashedPassword,
      full_name: 'Verify User',
      role: 'USER'
    });

    mockReq.method = 'POST';
    mockReq.query.action = 'login';
    mockReq.body = { email: 'verify@example.com', password };
    await handler(mockReq, mockRes);
    
    const { token } = mockRes.json.mock.calls[0][0];

    // Now verify
    const verifyReq: any = { 
      method: 'POST', 
      query: { action: 'verify' }, 
      headers: { authorization: `Bearer ${token}` },
      body: {} 
    };
    const verifyRes: any = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn().mockReturnThis(),
      setHeader: vi.fn().mockReturnThis(),
    };

    await handler(verifyReq, verifyRes);

    expect(verifyRes.status).toHaveBeenCalledWith(200);
    expect(verifyRes.json).toHaveBeenCalledWith(expect.objectContaining({ valid: true }));
  });
});
