import { describe, it, expect, vi, beforeEach } from 'vitest';
import handler from '../api/users.js';
import { mongodb } from '../lib/mongodb.js';
import { mapUserFromDb } from '../api/_utils/mappers.js';
import { hashPassword, getUserByEmail, getUserById } from '../api/_utils/mongoAuth.js';

// Mock MongoDB
vi.mock('../lib/mongodb.js', () => ({
  mongodb: {
    db: {
      collection: vi.fn().mockReturnThis(),
      find: vi.fn().mockReturnThis(),
      toArray: vi.fn(),
      insertOne: vi.fn(),
      updateOne: vi.fn(),
      findOneAndUpdate: vi.fn(),
      deleteOne: vi.fn(),
      findOne: vi.fn(),
    }
  }
}));

// Mock mongoAuth helpers
vi.mock('../api/_utils/mongoAuth.js', () => ({
  hashPassword: vi.fn((p) => Promise.resolve(`hashed-${p}`)),
  getUserByEmail: vi.fn(),
  getUserById: vi.fn(),
  generateToken: vi.fn(() => 'mock-token'),
}));

// Mock mappers
vi.mock('../api/_utils/mappers.js', () => ({
  mapUserFromDb: vi.fn((user: any) => ({ ...user, id: user._id })),
}));

// Mock middleware
vi.mock('../api/_utils/auth.js', () => ({ withAuth: (h: any) => h }));
vi.mock('../api/_utils/errorHandler.js', () => ({ withErrorHandler: (h: any) => h }));

describe('api/users handler', () => {
  let mockReq: any;
  let mockRes: any;

  beforeEach(() => {
    vi.clearAllMocks();
    mockReq = { method: '', query: {}, body: {}, user: {} };
    mockRes = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn().mockReturnThis(),
      end: vi.fn().mockReturnThis(),
    };
  });

  it('GET /api/users should return a list of users', async () => {
    mockReq.method = 'GET';
    const mockUsers = [{ _id: 'user-1', full_name: 'Test User 1' }];
    (mongodb.db.collection as any)().find().toArray.mockResolvedValue(mockUsers);

    await handler(mockReq, mockRes);

    expect(mongodb.db.collection).toHaveBeenCalledWith('users');
    expect(mockRes.status).toHaveBeenCalledWith(200);
    expect(mockRes.json).toHaveBeenCalledWith(expect.arrayContaining([expect.objectContaining({ id: 'user-1' })]));
  });

  it('GET /api/users?id=<userId> should return a specific user', async () => {
    mockReq.method = 'GET';
    mockReq.query.id = 'user-1';
    const mockUser = { _id: 'user-1', full_name: 'Test User 1' };
    (getUserById as any).mockResolvedValue(mockUser);

    await handler(mockReq, mockRes);

    expect(getUserById).toHaveBeenCalledWith('user-1');
    expect(mockRes.status).toHaveBeenCalledWith(200);
    expect(mockRes.json).toHaveBeenCalledWith(expect.objectContaining({ id: 'user-1' }));
  });

  it('POST /api/users should create a new user (Admin only)', async () => {
    mockReq.method = 'POST';
    mockReq.body = { name: 'New User', email: 'new@example.com', password: 'password123', role: 'ADMIN' };
    mockReq.user = { role: 'ADMIN' };
    
    (getUserByEmail as any).mockResolvedValue(null);
    (mongodb.db.collection as any)().insertOne.mockResolvedValue({ insertedId: 'new-id' });

    await handler(mockReq, mockRes);

    expect(mongodb.db.collection).toHaveBeenCalledWith('users');
    expect((mongodb.db.collection as any)().insertOne).toHaveBeenCalled();
    expect(mockRes.status).toHaveBeenCalledWith(201);
  });

  it('PUT /api/users should update a user', async () => {
    mockReq.method = 'PUT';
    mockReq.query.id = 'user-1';
    mockReq.body = { name: 'Updated Name' };
    mockReq.user = { userId: 'user-1', role: 'SITE_ENGINEER' };

    const mockUpdatedUser = { _id: 'user-1', full_name: 'Updated Name' };
    (mongodb.db.collection as any)().findOneAndUpdate.mockResolvedValue(mockUpdatedUser);

    await handler(mockReq, mockRes);

    expect(mockRes.status).toHaveBeenCalledWith(200);
    expect(mockRes.json).toHaveBeenCalledWith(expect.objectContaining({ id: 'user-1', full_name: 'Updated Name' }));
  });

  it('DELETE /api/users should delete a user (Admin only)', async () => {
    mockReq.method = 'DELETE';
    mockReq.query.id = 'user-1';
    mockReq.user = { role: 'ADMIN' };

    (mongodb.db.collection as any)().deleteOne.mockResolvedValue({ deletedCount: 1 });

    await handler(mockReq, mockRes);

    expect(mockRes.status).toHaveBeenCalledWith(204);
  });
});
