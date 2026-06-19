import { describe, it, expect, vi, beforeEach } from 'vitest';
import handler from '../api/auth';
import { isSupabaseConfigured } from '../api/_utils/supabaseClient.ts';

// Mock Supabase client
const mockSupabaseAuth = {
  signInWithPassword: vi.fn(),
  signUp: vi.fn(),
  getUser: vi.fn(),
  refreshSession: vi.fn(),
};

const mockSupabase = {
  from: vi.fn().mockReturnThis(),
  select: vi.fn().mockReturnThis(),
  eq: vi.fn().mockReturnThis(),
  single: vi.fn().mockResolvedValue({ data: null, error: null }),
  auth: mockSupabaseAuth,
};

// Mock error handler
vi.mock('../api/_utils/errorHandler.ts', () => ({ 
  withErrorHandler: (h: any) => h 
}));

// Mock Supabase client
vi.mock('../api/_utils/supabaseClient.ts', () => ({
  getSupabasePublic: vi.fn(() => mockSupabase),
  isSupabaseConfigured: vi.fn(() => true)
}));

// Mock mappers
vi.mock('../api/_utils/mappers.ts', () => ({
  mapUserFromDb: vi.fn((user: any) => user)
}));

describe('api/auth handler', () => {
  let mockReq: any;
  let mockRes: any;

  beforeEach(async () => {
    vi.clearAllMocks();
    mockReq = { method: '', query: {}, body: {}, headers: {} };
    mockRes = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn().mockReturnThis(),
      end: vi.fn().mockReturnThis(),
      setHeader: vi.fn().mockReturnThis(),
    };
  });

  it('POST?action=login should return 503 if Supabase not configured', async () => {
    vi.mocked(isSupabaseConfigured).mockReturnValueOnce(false);
    
    mockReq.method = 'POST';
    mockReq.query.action = 'login';
    mockReq.body = { email: 'test@example.com', password: 'password123' };

    await handler(mockReq, mockRes);

    expect(mockRes.status).toHaveBeenCalledWith(503);
  });

  it('POST?action=login should login with correct credentials', async () => {
    mockReq.method = 'POST';
    mockReq.query.action = 'login';
    mockReq.body = { email: 'test@example.com', password: 'password123' };

    vi.mocked(mockSupabaseAuth.signInWithPassword).mockResolvedValueOnce({
      data: {
        session: { access_token: 'mock-token' },
        user: { id: 'user-1', email: 'test@example.com' }
      },
      error: null
    });

    vi.mocked(mockSupabase.from).mockReturnValue(mockSupabase);
    vi.mocked(mockSupabase.select).mockReturnThis();
    vi.mocked(mockSupabase.single).mockResolvedValueOnce({ 
      data: { id: 'user-1', full_name: 'Test User', role: 'USER' }, 
      error: null 
    });

    await handler(mockReq, mockRes);

    expect(mockRes.status).toHaveBeenCalledWith(200);
    expect(mockRes.json).toHaveBeenCalledWith(expect.objectContaining({ token: 'mock-token' }));
  });

  it('POST?action=login should return 401 for invalid credentials', async () => {
    mockReq.method = 'POST';
    mockReq.query.action = 'login';
    mockReq.body = { email: 'wrong@example.com', password: 'wrongpassword' };

    vi.mocked(mockSupabaseAuth.signInWithPassword).mockResolvedValueOnce({
      data: null,
      error: { message: 'Invalid credentials' }
    });

    await handler(mockReq, mockRes);

    expect(mockRes.status).toHaveBeenCalledWith(401);
  });

  it('POST?action=login should return 400 if email/password missing', async () => {
    mockReq.method = 'POST';
    mockReq.query.action = 'login';
    mockReq.body = { email: '' };

    await handler(mockReq, mockRes);

    expect(mockRes.status).toHaveBeenCalledWith(400);
  });

  it('POST?action=signup should signup new user', async () => {
    mockReq.method = 'POST';
    mockReq.query.action = 'signup';
    mockReq.body = { email: 'new@example.com', password: 'password123', name: 'New User' };

    vi.mocked(mockSupabaseAuth.signUp).mockResolvedValueOnce({
      data: { user: { id: 'user-new', email: 'new@example.com', user_metadata: { name: 'New User' } } },
      error: null
    });

    await handler(mockReq, mockRes);

    expect(mockRes.status).toHaveBeenCalledWith(200);
  });

  it('POST?action=verify should verify valid token', async () => {
    mockReq.method = 'POST';
    mockReq.query.action = 'verify';
    mockReq.headers.authorization = 'Bearer valid-token';

    vi.mocked(mockSupabaseAuth.getUser).mockResolvedValueOnce({
      data: { user: { id: 'user-1', email: 'test@example.com' } },
      error: null
    });

    await handler(mockReq, mockRes);

    expect(mockRes.status).toHaveBeenCalledWith(200);
    expect(mockRes.json).toHaveBeenCalledWith(expect.objectContaining({ valid: true }));
  });

  it('POST?action=verify should return 401 for no token', async () => {
    mockReq.method = 'POST';
    mockReq.query.action = 'verify';
    mockReq.headers = {};

    await handler(mockReq, mockRes);

    expect(mockRes.status).toHaveBeenCalledWith(401);
  });

  it('POST?action=logout should clear cookie', async () => {
    mockReq.method = 'POST';
    mockReq.query.action = 'logout';

    await handler(mockReq, mockRes);

    expect(mockRes.setHeader).toHaveBeenCalledWith(
      'Set-Cookie', 
      expect.stringContaining('roadmaster-access=')
    );
    expect(mockRes.status).toHaveBeenCalledWith(200);
  });

  it('should return 405 for unsupported methods', async () => {
    mockReq.method = 'GET';
    mockReq.query.action = 'login';

    await handler(mockReq, mockRes);

    expect(mockRes.status).toHaveBeenCalledWith(405);
  });
});
