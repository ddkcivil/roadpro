import { describe, it, expect, vi, beforeEach } from 'vitest';
import handler from '../api/users';
import { mongodb } from '../lib/mongodb';
import { clearTestCollection } from './setup';

// Mock middleware only
vi.mock('../api/_utils/auth.js', () => ({ withAuth: (h: any) => h }));
vi.mock('../api/_utils/errorHandler.js', () => ({ withErrorHandler: (h: any) => h }));

describe('api/users handler (Integration)', () => {
  let mockReq: any;
  let mockRes: any;

  beforeEach(async () => {
    vi.clearAllMocks();
    await clearTestCollection('users');
    
    mockReq = { method: '', query: {}, body: {}, user: {} };
    mockRes = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn().mockReturnThis(),
      end: vi.fn().mockReturnThis(),
    };
  });

  it('GET /api/users should return a list of users from DB', async () => {
    // Seed data
    await mongodb.db.collection('users').insertOne({
      _id: 'user-1',
      full_name: 'Test User 1',
      email: 'test1@example.com',
      role: 'SITE_ENGINEER'
    });

    mockReq.method = 'GET';
    await handler(mockReq, mockRes);

    expect(mockRes.status).toHaveBeenCalledWith(200);
    const users = mockRes.json.mock.calls[0][0];
    expect(users.length).toBe(1);
    expect(users[0].id).toBe('user-1');
  });

  it('GET /api/users?id=<userId> should return a specific user', async () => {
    const userId = 'user-2';
    await mongodb.db.collection('users').insertOne({
      _id: userId,
      full_name: 'Test User 2',
      email: 'test2@example.com',
      role: 'ADMIN'
    });

    // Verification check
    const checkUser = await mongodb.db.collection('users').findOne({ _id: userId });
    console.log('[Test Debug] Seeded user search:', { userId, found: !!checkUser });

    mockReq.method = 'GET';
    mockReq.query.id = userId;
    await handler(mockReq, mockRes);

    if (mockRes.status.mock.calls[0][0] === 404) {
      console.log('[Test Debug] 404 details:', mockRes.json.mock.calls[0][0]);
    }

    expect(mockRes.status).toHaveBeenCalledWith(200);
    expect(mockRes.json).toHaveBeenCalledWith(expect.objectContaining({ id: userId }));
  });

  it('POST /api/users should create a new user in DB (Admin only)', async () => {
    mockReq.method = 'POST';
    mockReq.body = { 
      name: 'New User', 
      email: 'new@example.com', 
      password: 'password123', 
      role: 'ADMIN' 
    };
    mockReq.user = { role: 'ADMIN' };
    
    await handler(mockReq, mockRes);

    expect(mockRes.status).toHaveBeenCalledWith(201);
    
    const userInDb = await mongodb.db.collection('users').findOne({ email: 'new@example.com' });
    expect(userInDb).not.toBeNull();
    expect(userInDb?.full_name).toBe('New User');
  });

  it('PUT /api/users should update a user in DB', async () => {
    await mongodb.db.collection('users').insertOne({
      _id: 'user-3',
      full_name: 'Original Name',
      email: 'test3@example.com',
      role: 'SITE_ENGINEER'
    });

    mockReq.method = 'PUT';
    mockReq.query.id = 'user-3';
    mockReq.body = { name: 'Updated Name' };
    mockReq.user = { userId: 'user-3', role: 'SITE_ENGINEER' };

    await handler(mockReq, mockRes);

    expect(mockRes.status).toHaveBeenCalledWith(200);
    
    const userInDb = await mongodb.db.collection('users').findOne({ _id: 'user-3' });
    expect(userInDb?.full_name).toBe('Updated Name');
  });

  it('DELETE /api/users should delete a user from DB (Admin only)', async () => {
    await mongodb.db.collection('users').insertOne({
      _id: 'user-4',
      full_name: 'Delete Me',
      email: 'delete@example.com',
      role: 'USER'
    });

    mockReq.method = 'DELETE';
    mockReq.query.id = 'user-4';
    mockReq.user = { role: 'ADMIN' };

    await handler(mockReq, mockRes);

    expect(mockRes.status).toHaveBeenCalledWith(204);
    
    const userInDb = await mongodb.db.collection('users').findOne({ _id: 'user-4' });
    expect(userInDb).toBeNull();
  });
});
