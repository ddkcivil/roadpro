import { describe, it, expect, vi, beforeEach } from 'vitest';
import handler from '../api/users';
import { supabaseAdmin } from '../api/utils/supabaseClient.js';
// Mock middleware
vi.mock('../api/utils/auth.js', () => ({ withAuth: (h: any) => h }));
vi.mock('../api/utils/errorHandler.js', () => ({ withErrorHandler: (h: any) => h }));

// Mock Supabase
vi.mock('../api/utils/supabaseClient.js', () => {
  const handler = {
    get: (target: any, prop: string): any => {
      if (prop === 'then') return target.then;
      return new Proxy(() => {}, handler);
    }
  };
  const base = {
    then: vi.fn().mockImplementation((onSuccess: any) => Promise.resolve({ data: null, error: null }).then(onSuccess)),
  };
  return { supabaseAdmin: new Proxy(base, handler) };
});

import { supabaseAdmin } from '../api/utils/supabaseClient.js';
const mockSupabase = supabaseAdmin as any;
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
  });

  it('GET /api/users should return a list of users from Supabase', async () => {
    const mockUsers = [{ id: 'user-1', full_name: 'Test User' }];
    mockSupabase.select.mockResolvedValue({ data: mockUsers, error: null });

    mockReq.method = 'GET';
    await handler(mockReq, mockRes);

    expect(mockRes.status).toHaveBeenCalledWith(200);
    expect(mockRes.json).toHaveBeenCalledWith(mockUsers);
  });

  it('GET /api/users?id=<userId> should return a specific user', async () => {
    const userId = 'user-2';
    const mockUser = { id: userId, full_name: 'Test User 2' };
    mockSupabase.single.mockResolvedValue({ data: mockUser, error: null });

    mockReq.method = 'GET';
    mockReq.query.id = userId;
    await handler(mockReq, mockRes);

    expect(mockRes.status).toHaveBeenCalledWith(200);
    expect(mockRes.json).toHaveBeenCalledWith(mockUser);
  });

  it('POST /api/users should create a new user (Admin only)', async () => {
    const mockUser = { id: 'new-id', full_name: 'New User' };
    mockSupabase.single.mockResolvedValue({ data: mockUser, error: null });

    mockReq.method = 'POST';
    mockReq.body = { name: 'New User', email: 'new@example.com', role: 'ADMIN' };
    mockReq.user = { role: 'ADMIN' };
    
    await handler(mockReq, mockRes);

    expect(mockRes.status).toHaveBeenCalledWith(201);
    expect(mockRes.json).toHaveBeenCalledWith(mockUser);
  });

  it('PUT /api/users should update a user', async () => {
    const mockUser = { id: 'user-3', full_name: 'Updated Name' };
    mockSupabase.single.mockResolvedValue({ data: mockUser, error: null });

    mockReq.method = 'PUT';
    mockReq.query.id = 'user-3';
    mockReq.body = { name: 'Updated Name' };
    mockReq.user = { userId: 'user-3', role: 'SITE_ENGINEER' };

    await handler(mockReq, mockRes);

    expect(mockRes.status).toHaveBeenCalledWith(200);
    expect(mockRes.json).toHaveBeenCalledWith(mockUser);
  });

  it('DELETE /api/users should delete a user (Admin only)', async () => {
    mockSupabase.delete.mockResolvedValue({ data: null, error: null });

    mockReq.method = 'DELETE';
    mockReq.query.id = 'user-4';
    mockReq.user = { role: 'ADMIN' };

    await handler(mockReq, mockRes);

    expect(mockRes.status).toHaveBeenCalledWith(204);
  });
});

