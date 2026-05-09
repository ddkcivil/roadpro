import { describe, it, expect, vi, beforeEach } from 'vitest';
import handler from '../api/users';
import * as supabaseClient from '../api/utils/supabaseClient.js';

// Mock middleware
vi.mock('../api/utils/auth.js', () => ({ withAuth: (h: any) => h }));
vi.mock('../api/utils/errorHandler.js', () => ({ withErrorHandler: (h: any) => h }));

// Mock Supabase
const mockSupabase: any = {
  from: vi.fn().mockReturnThis(),
  select: vi.fn().mockReturnThis(),
  eq: vi.fn().mockReturnThis(),
  single: vi.fn().mockReturnThis(),
  insert: vi.fn().mockReturnThis(),
  update: vi.fn().mockReturnThis(),
  delete: vi.fn().mockReturnThis(),
  then: vi.fn().mockImplementation((onSuccess: any) => Promise.resolve({ data: null, error: null }).then(onSuccess)),
};

vi.mock('../api/utils/supabaseClient.js', () => ({
  getSupabaseAdmin: vi.fn(() => mockSupabase),
  isSupabaseConfigured: vi.fn(() => true)
}));

describe('api/users handler (Integration)', () => {
  let mockReq: any;
  let mockRes: any;

  beforeEach(async () => {
    vi.clearAllMocks();
    mockReq = { 
      method: '', 
      query: {}, 
      body: {}, 
      user: { userId: 'admin-id', role: 'ADMIN' } 
    };
    mockRes = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn().mockReturnThis(),
      end: vi.fn().mockReturnThis(),
    };

    // Reset default behaviors
    mockSupabase.from.mockReturnThis();
    mockSupabase.select.mockReturnThis();
    mockSupabase.eq.mockReturnThis();
    mockSupabase.single.mockReturnThis();
    mockSupabase.insert.mockReturnThis();
    mockSupabase.update.mockReturnThis();
    mockSupabase.delete.mockReturnThis();
    mockSupabase.then.mockImplementation((onSuccess: any) => Promise.resolve({ data: null, error: null }).then(onSuccess));
  });

  it('GET /api/users should return a list of users from Supabase', async () => {
    const mockUsers = [{ id: 'user-1', full_name: 'Test User' }];
    mockSupabase.then.mockImplementationOnce((onSuccess: any) => Promise.resolve({ data: mockUsers, error: null }).then(onSuccess));

    mockReq.method = 'GET';
    await handler(mockReq, mockRes);

    expect(mockRes.status).toHaveBeenCalledWith(200);
    expect(mockRes.json).toHaveBeenCalledWith(expect.arrayContaining([
      expect.objectContaining({ id: 'user-1', full_name: 'Test User' })
    ]));
  });

  it('GET /api/users?id=<userId> should return a specific user', async () => {
    const userId = 'user-2';
    const mockUser = { id: userId, full_name: 'Test User 2' };
    mockSupabase.then.mockImplementationOnce((onSuccess: any) => Promise.resolve({ data: mockUser, error: null }).then(onSuccess));

    mockReq.method = 'GET';
    mockReq.query.id = userId;
    await handler(mockReq, mockRes);

    expect(mockRes.status).toHaveBeenCalledWith(200);
    expect(mockRes.json).toHaveBeenCalledWith(expect.objectContaining({ id: userId, full_name: 'Test User 2' }));
  });

  it('POST /api/users should create a new user (Admin only)', async () => {
    const mockUser = { id: 'new-id', full_name: 'New User' };
    mockSupabase.then.mockImplementationOnce((onSuccess: any) => Promise.resolve({ data: mockUser, error: null }).then(onSuccess));

    mockReq.method = 'POST';
    mockReq.body = { name: 'New User', email: 'new@example.com', role: 'ADMIN' };
    mockReq.user = { role: 'ADMIN' };
    
    await handler(mockReq, mockRes);

    expect(mockRes.status).toHaveBeenCalledWith(201);
    expect(mockRes.json).toHaveBeenCalledWith(expect.objectContaining({ id: 'new-id', full_name: 'New User' }));
  });

  it('PUT /api/users should update a user', async () => {
    const mockUser = { id: 'user-3', full_name: 'Updated Name' };
    mockSupabase.then.mockImplementationOnce((onSuccess: any) => Promise.resolve({ data: mockUser, error: null }).then(onSuccess));

    mockReq.method = 'PUT';
    mockReq.query.id = 'user-3';
    mockReq.body = { name: 'Updated Name' };
    mockReq.user = { userId: 'user-3', role: 'SITE_ENGINEER' };

    await handler(mockReq, mockRes);

    expect(mockRes.status).toHaveBeenCalledWith(200);
    expect(mockRes.json).toHaveBeenCalledWith(expect.objectContaining({ id: 'user-3', full_name: 'Updated Name' }));
  });

  it('DELETE /api/users should delete a user (Admin only)', async () => {
    mockSupabase.then.mockImplementationOnce((onSuccess: any) => Promise.resolve({ data: null, error: null }).then(onSuccess));

    mockReq.method = 'DELETE';
    mockReq.query.id = 'user-4';
    mockReq.user = { role: 'ADMIN' };

    await handler(mockReq, mockRes);

    expect(mockRes.status).toHaveBeenCalledWith(204);
  });
});

