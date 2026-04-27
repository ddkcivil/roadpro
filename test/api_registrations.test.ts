import { describe, it, expect, vi, beforeEach } from 'vitest';
import handler from '../api/registrations.js';
import { mongodb } from '../lib/mongodb.js';
import { hashPassword } from '../api/_utils/mongoAuth.js';
import { v4 as uuidv4 } from 'uuid';

// Mock MongoDB
vi.mock('../lib/mongodb.js', () => ({
  mongodb: {
    db: {
      collection: vi.fn().mockReturnThis(),
      find: vi.fn().mockReturnThis(),
      sort: vi.fn().mockReturnThis(),
      toArray: vi.fn(),
      insertOne: vi.fn(),
      deleteOne: vi.fn(),
      findOne: vi.fn(),
    }
  }
}));

// Mock mongoAuth helpers
vi.mock('../api/_utils/mongoAuth.js', () => ({
  hashPassword: vi.fn((p) => Promise.resolve(`hashed-${p}`)),
}));

// Mock uuid
vi.mock('uuid', () => ({ v4: vi.fn(() => 'mock-uuid-v4') }));

// Mock middleware
vi.mock('../api/_utils/errorHandler.js', () => ({ withErrorHandler: (h: any) => h }));

describe('api/registrations handler', () => {
  let mockReq: any;
  let mockRes: any;

  beforeEach(() => {
    vi.clearAllMocks();
    mockReq = { method: '', query: {}, body: {} };
    mockRes = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn().mockReturnThis(),
      end: vi.fn().mockReturnThis(),
    };
  });

  it('GET /api/registrations should return a list of registrations', async () => {
    mockReq.method = 'GET';
    const mockRegistrations = [{ _id: 'reg-1', name: 'Test User 1' }];
    (mongodb.db.collection as any)().find().sort().toArray.mockResolvedValue(mockRegistrations);

    await handler(mockReq, mockRes);

    expect(mongodb.db.collection).toHaveBeenCalledWith('registrations');
    expect(mockRes.status).toHaveBeenCalledWith(200);
    expect(mockRes.json).toHaveBeenCalledWith(mockRegistrations);
  });

  it('POST /api/registrations (submit) should create a new registration', async () => {
    mockReq.method = 'POST';
    mockReq.body = { name: 'New User', email: 'new@example.com', password: 'password123', requestedRole: 'USER' };
    
    (mongodb.db.collection as any)().findOne.mockResolvedValue(null);
    (mongodb.db.collection as any)().insertOne.mockResolvedValue({ insertedId: 'mock-uuid-v4' });

    await handler(mockReq, mockRes);

    expect(mongodb.db.collection).toHaveBeenCalledWith('registrations');
    expect(mockRes.status).toHaveBeenCalledWith(201);
    expect(mockRes.json).toHaveBeenCalledWith(expect.objectContaining({ message: 'Registration submitted successfully. Awaiting administrator approval.' }));
  });

  it('POST /api/registrations?action=approve should approve a registration', async () => {
    mockReq.method = 'POST';
    mockReq.query.action = 'approve';
    mockReq.query.id = 'reg-1';

    const mockReg = { _id: 'reg-1', name: 'User', email: 'user@example.com', password: 'pass', requestedRole: 'USER' };
    (mongodb.db.collection as any)().findOne.mockResolvedValueOnce(mockReg); // Find registration
    (mongodb.db.collection as any)().findOne.mockResolvedValueOnce(null); // No existing user
    (mongodb.db.collection as any)().insertOne.mockResolvedValue({ insertedId: 'new-user-id' }); // Create user
    (mongodb.db.collection as any)().deleteOne.mockResolvedValue({ deletedCount: 1 }); // Delete registration

    await handler(mockReq, mockRes);

    expect(mockRes.status).toHaveBeenCalledWith(200);
    expect(mockRes.json).toHaveBeenCalledWith(expect.objectContaining({ message: 'Registration approved successfully' }));
  });

  it('DELETE /api/registrations should delete a registration', async () => {
    mockReq.method = 'DELETE';
    mockReq.query.id = 'reg-1';

    (mongodb.db.collection as any)().deleteOne.mockResolvedValue({ deletedCount: 1 });

    await handler(mockReq, mockRes);

    expect(mockRes.status).toHaveBeenCalledWith(204);
  });
});
