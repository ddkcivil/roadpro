import { describe, it, expect, vi, beforeEach } from 'vitest';
import handler from '../api/registrations';
import { mongodb } from '../lib/mongodb';
import { clearTestCollection } from './setup';

// Mock middleware only
vi.mock('../api/_utils/errorHandler.js', () => ({ withErrorHandler: (h: any) => h }));

describe('api/registrations handler (Integration)', () => {
  let mockReq: any;
  let mockRes: any;

  beforeEach(async () => {
    vi.clearAllMocks();
    await clearTestCollection('registrations');
    await clearTestCollection('users');
    
    mockReq = { method: '', query: {}, body: {} };
    mockRes = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn().mockReturnThis(),
      end: vi.fn().mockReturnThis(),
    };
  });

  it('GET /api/registrations should return a list of registrations from DB', async () => {
    await mongodb.db.collection('registrations').insertOne({
      _id: 'reg-1',
      name: 'Test Reg 1',
      email: 'reg1@example.com',
      created_at: new Date().toISOString()
    });

    mockReq.method = 'GET';
    await handler(mockReq, mockRes);

    expect(mockRes.status).toHaveBeenCalledWith(200);
    const regs = mockRes.json.mock.calls[0][0];
    expect(regs.length).toBe(1);
    expect(regs[0]._id).toBe('reg-1');
  });

  it('POST /api/registrations (submit) should create a new registration in DB', async () => {
    mockReq.method = 'POST';
    mockReq.body = { 
      name: 'New Registrant', 
      email: 'newreg@example.com', 
      password: 'password123', 
      requestedRole: 'USER' 
    };
    
    await handler(mockReq, mockRes);

    expect(mockRes.status).toHaveBeenCalledWith(201);
    
    const regInDb = await mongodb.db.collection('registrations').findOne({ email: 'newreg@example.com' });
    expect(regInDb).not.toBeNull();
    expect(regInDb?.name).toBe('New Registrant');
  });

  it('POST /api/registrations?action=approve should approve a registration and create user', async () => {
    const regId = 'reg-approve-1';
    await mongodb.db.collection('registrations').insertOne({
      _id: regId,
      name: 'To Approve',
      email: 'approve@example.com',
      password: 'hashed-password',
      requestedRole: 'SITE_ENGINEER',
      created_at: new Date().toISOString()
    });

    mockReq.method = 'POST';
    mockReq.query.action = 'approve';
    mockReq.query.id = regId;

    await handler(mockReq, mockRes);

    expect(mockRes.status).toHaveBeenCalledWith(200);
    
    // Check user created
    const userInDb = await mongodb.db.collection('users').findOne({ email: 'approve@example.com' });
    expect(userInDb).not.toBeNull();
    expect(userInDb?.full_name).toBe('To Approve');
    
    // Check registration deleted
    const regInDb = await mongodb.db.collection('registrations').findOne({ _id: regId });
    expect(regInDb).toBeNull();
  });

  it('DELETE /api/registrations should delete a registration from DB', async () => {
    const regId = 'reg-delete-1';
    await mongodb.db.collection('registrations').insertOne({
      _id: regId,
      name: 'Delete Me',
      email: 'delete@example.com'
    });

    mockReq.method = 'DELETE';
    mockReq.query.id = regId;

    await handler(mockReq, mockRes);

    expect(mockRes.status).toHaveBeenCalledWith(204);
    
    const regInDb = await mongodb.db.collection('registrations').findOne({ _id: regId });
    expect(regInDb).toBeNull();
  });
});
