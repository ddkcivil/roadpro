import { describe, it, expect, vi, beforeEach } from 'vitest';
import handler from '../api/registrations';
import * as supabaseClient from '../api/utils/supabaseClient.js';

// Mock Supabase client
const mockSupabaseAdmin = {
  from: vi.fn().mockReturnThis(),
  select: vi.fn().mockReturnThis(),
  insert: vi.fn().mockReturnThis(),
  update: vi.fn().mockReturnThis(),
  delete: vi.fn().mockReturnThis(),
  eq: vi.fn().mockReturnThis(),
  maybeSingle: vi.fn().mockReturnThis(),
  single: vi.fn().mockReturnThis(),
  order: vi.fn().mockReturnThis(),
  then: vi.fn(),
  auth: {
    admin: {
      createUser: vi.fn(),
      deleteUser: vi.fn(),
      updateUserById: vi.fn(),
      listUsers: vi.fn(),
    }
  }
};

// Mock error handler middleware
vi.mock('../api/utils/errorHandler.js', () => ({ 
  withErrorHandler: (h: any) => h 
}));

// Mock Supabase client
vi.mock('../api/utils/supabaseClient.js', () => ({
  getSupabaseAdmin: vi.fn(() => mockSupabaseAdmin),
  getSupabasePublic: vi.fn(() => mockSupabaseAdmin),
  isSupabaseConfigured: vi.fn(() => true)
}));

// Mock auth utilities
vi.mock('../api/utils/auth.js', () => ({
  withAuth: vi.fn((h) => async (req: any, res: any) => {
    // Simulate authenticated admin user
    (req as any).user = { role: 'ADMIN' };
    return h(req, res);
  })
}));

describe('api/registrations handler', () => {
  let mockReq: any;
  let mockRes: any;

  beforeEach(async () => {
    vi.clearAllMocks();
    mockReq = { method: '', query: {}, body: {} };
    mockRes = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn().mockReturnThis(),
      end: vi.fn().mockReturnThis(),
    };

    // Default chainable behavior
    mockSupabaseAdmin.from.mockReturnThis();
    mockSupabaseAdmin.select.mockReturnThis();
    mockSupabaseAdmin.insert.mockReturnThis();
    mockSupabaseAdmin.update.mockReturnThis();
    mockSupabaseAdmin.delete.mockReturnThis();
    mockSupabaseAdmin.eq.mockReturnThis();
    mockSupabaseAdmin.maybeSingle.mockReturnThis();
    mockSupabaseAdmin.single.mockReturnThis();
    mockSupabaseAdmin.order.mockReturnThis();
    
    // Default terminal behavior
    mockSupabaseAdmin.then.mockImplementation((resolve: any) => resolve({ data: null, error: null }));
  });

  it('should return 503 if Supabase is not configured', async () => {
    vi.mocked(supabaseClient.isSupabaseConfigured).mockReturnValueOnce(false);
    
    mockReq.method = 'GET';
    await handler(mockReq, mockRes);

    expect(mockRes.status).toHaveBeenCalledWith(503);
  });

  it('POST should create a new registration', async () => {
    mockReq.method = 'POST';
    mockReq.body = { 
      name: 'Test User', 
      email: 'test@example.com', 
      password: 'password123', 
      requestedRole: 'USER' 
    };

    mockSupabaseAdmin.then.mockImplementationOnce((resolve: any) => resolve({ data: null, error: null })); // check existing
    mockSupabaseAdmin.then.mockImplementationOnce((resolve: any) => resolve({ 
      data: { id: 'new-reg-id', name: 'Test User', email: 'test@example.com' }, 
      error: null 
    })); // insert

    await handler(mockReq, mockRes);

    expect(mockRes.status).toHaveBeenCalledWith(201);
  });

  it('GET (admin) should return list of registrations', async () => {
    mockReq.method = 'GET';
    
    mockSupabaseAdmin.then.mockImplementationOnce((resolve: any) => resolve({ 
      data: [{ id: 'reg-1', name: 'Test', email: 'test@example.com' }], 
      error: null 
    }));

    await handler(mockReq, mockRes);

    expect(mockRes.status).toHaveBeenCalledWith(200);
  });

  it('POST?action=approve should approve registration', async () => {
    mockReq.method = 'POST';
    mockReq.query = { action: 'approve', id: 'reg-approve-1' };
    
    mockSupabaseAdmin.then.mockImplementationOnce((resolve: any) => resolve({ 
      data: { id: 'reg-approve-1', name: 'To Approve', email: 'approve@example.com', password_hash: 'hash', password: 'pass123', requested_role: 'USER' }, 
      error: null 
    })); // fetch reg
    
    vi.mocked(mockSupabaseAdmin.auth.admin.createUser).mockResolvedValueOnce({ data: { user: { id: 'auth-id' } }, error: null });
    
    mockSupabaseAdmin.then.mockImplementationOnce((resolve: any) => resolve({ data: null, error: null })); // insert profile
    mockSupabaseAdmin.then.mockImplementationOnce((resolve: any) => resolve({ data: null, error: null })); // delete reg

    await handler(mockReq, mockRes);

    expect(mockRes.status).toHaveBeenCalledWith(200);
  });

  it('POST?action=reject should reject registration', async () => {
    mockReq.method = 'POST';
    mockReq.query = { action: 'reject', id: 'reg-reject-1' };
    
    mockSupabaseAdmin.then.mockImplementationOnce((resolve: any) => resolve({ error: null }));

    await handler(mockReq, mockRes);

    expect(mockRes.status).toHaveBeenCalledWith(204);
  });

  it('DELETE should delete registration', async () => {
    mockReq.method = 'DELETE';
    mockReq.query = { id: 'reg-delete-1' };
    
    mockSupabaseAdmin.then.mockImplementationOnce((resolve: any) => resolve({ error: null }));

    await handler(mockReq, mockRes);

    expect(mockRes.status).toHaveBeenCalledWith(204);
  });
});
