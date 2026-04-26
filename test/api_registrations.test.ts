import { describe, it, expect, vi, beforeEach } from 'vitest';
import handler from '../api/registrations.js'; // Adjust path if necessary
import { supabasePublic, supabaseAdmin } from '../api/_utils/supabaseClient.js';
import { v4 as uuidv4 } from 'uuid';

// Mock Supabase clients and their methods
vi.mock('../api/_utils/supabaseClient.js', () => ({
  supabasePublic: {
    from: vi.fn().mockReturnThis(),
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    single: vi.fn().mockReturnThis(),
    insert: vi.fn().mockResolvedValue({ data: [{ id: 'new-registration-id' }], error: null }),
    delete: vi.fn().mockResolvedValue({ data: null, error: null }),
  },
  supabaseAdmin: {
    from: vi.fn().mockReturnThis(),
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    single: vi.fn().mockReturnThis(),
    insert: vi.fn().mockResolvedValue({ data: [{ id: 'new-profile-id' }], error: null }),
    delete: vi.fn().mockResolvedValue({ data: null, error: null }),
    auth: {
      admin: {
        createUser: vi.fn().mockResolvedValue({ user: { id: 'new-auth-id', email: 'test@example.com', user_metadata: {} }, error: null }),
        updateUserById: vi.fn().mockResolvedValue({ user: { id: 'updated-auth-id' }, error: null }),
        deleteUser: vi.fn().mockResolvedValue({ error: null }),
      }
    }
  }
}));

// Mock external utilities
vi.mock('uuid', () => ({ v4: vi.fn(() => 'mock-uuid-v4') }));
vi.mock('../api/_utils/errorHandler.js', () => ({ withErrorHandler: (h: any) => h }));

describe('api/registrations handler', () => {
  let mockReq: any;
  let mockRes: any;
  let mockSupabasePublic: any;
  let mockSupabaseAdmin: any;

  beforeEach(async () => {
    vi.clearAllMocks();
    mockReq = { method: '', query: {}, body: {}, user: {} };
    mockRes = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn().mockReturnThis(),
      end: vi.fn().mockReturnThis(),
      setHeader: vi.fn().mockReturnThis()
    };

    mockSupabasePublic = (await import('../api/_utils/supabaseClient.js')).supabasePublic;
    mockSupabaseAdmin = (await import('../api/_utils/supabaseClient.js')).supabaseAdmin;

    // Mock default behaviors for chainable Supabase methods
    mockSupabasePublic.from.mockReturnThis();
    mockSupabasePublic.select.mockReturnThis();
    mockSupabasePublic.eq.mockReturnThis();
    mockSupabasePublic.single.mockReturnThis();
    mockSupabasePublic.insert.mockResolvedValue({ data: [], error: null });
    mockSupabasePublic.delete.mockResolvedValue({ data: null, error: null });

    mockSupabaseAdmin.from.mockReturnThis();
    mockSupabaseAdmin.select.mockReturnThis();
    mockSupabaseAdmin.eq.mockReturnThis();
    mockSupabaseAdmin.single.mockReturnThis();
    mockSupabaseAdmin.insert.mockResolvedValue({ data: [], error: null });
    mockSupabaseAdmin.delete.mockResolvedValue({ data: null, error: null });
    mockSupabaseAdmin.auth.admin.createUser.mockResolvedValue({ user: { id: 'new-auth-id', email: 'test@example.com', user_metadata: {} }, error: null });
  });

  // --- GET Tests ---
  it('GET /api/registrations should return a list of pending registrations', async () => {
    mockReq.method = 'GET';
    const mockRegistrations = [{ id: 'reg-1', name: 'Test User 1', email: 'test1@example.com' }];
    mockSupabaseAdmin.from('registrations').select.mockResolvedValue({ data: mockRegistrations, error: null });

    await handler(mockReq, mockRes);

    expect(mockSupabaseAdmin.from).toHaveBeenCalledWith('registrations');
    expect(mockSupabaseAdmin.select).toHaveBeenCalledWith('*');
    expect(mockSupabaseAdmin.order).toHaveBeenCalledWith('created_at', { ascending: false, nullsFirst: false });
    expect(mockRes.status).toHaveBeenCalledWith(200);
    expect(mockRes.json).toHaveBeenCalledWith(expect.arrayContaining([expect.objectContaining({ id: 'reg-1' })]));
  });

  // --- POST Tests ---
  it('POST /api/registrations (submit new) should create a new registration', async () => {
    mockReq.method = 'POST';
    mockReq.body = { name: 'New User', email: 'new@example.com', password: 'password123', requestedRole: 'USER' };
    
    const mockNewReg = { id: 'mock-uuid-v4', name: 'New User', email: 'new@example.com', requestedrole: 'USER', status: 'pending' };
    mockSupabasePublic.from('registrations').insert.mockResolvedValue({ data: [mockNewReg], error: null });
    
    await handler(mockReq, mockRes);

    expect(mockSupabasePublic.from).toHaveBeenCalledWith('registrations');
    expect(mockSupabasePublic.insert).toHaveBeenCalledWith({
      id: 'mock-uuid-v4',
      name: 'New User',
      email: 'new@example.com',
      phone: '', // Defaulting phone to empty string
      passwordhash: 'password123',
      requestedrole: 'USER',
      status: 'pending'
    });
    expect(mockRes.status).toHaveBeenCalledWith(201);
    expect(mockRes.json).toHaveBeenCalledWith(expect.objectContaining({ message: 'Registration submitted successfully. Awaiting administrator approval.' }));
  });

  it('POST /api/registrations (submit new) should return 409 if email already exists', async () => {
    mockReq.method = 'POST';
    mockReq.body = { name: 'Existing User', email: 'existing@example.com', password: 'password123', requestedRole: 'USER' };
    const dbError = { code: '23505', message: 'duplicate key value violates unique constraint "registrations_email_key"' };
    mockSupabasePublic.from('registrations').insert.mockResolvedValue({ data: null, error: dbError });

    await handler(mockReq, mockRes);

    expect(mockRes.status).toHaveBeenCalledWith(409);
    expect(mockRes.json).toHaveBeenCalledWith({ error: 'A registration with this email already exists.' });
  });

  it('POST /api/registrations?action=approve should approve a registration', async () => {
    mockReq.method = 'POST';
    mockReq.query.action = 'approve';
    mockReq.query.id = 'reg-to-approve';
    mockReq.user = { role: 'ADMIN' }; // Mock user role

    // Mocking successful approval steps
    const mockRegData = { id: 'reg-to-approve', name: 'Approved User', email: 'approve@example.com', requestedrole: 'Admin', phone: '123-456-7890' };
    mockSupabaseAdmin.from('registrations').select().eq().single().mockResolvedValue({ data: mockRegData, error: null });
    mockSupabaseAdmin.auth.admin.createUser.mockResolvedValue({ user: { id: 'approved-auth-id', email: 'approve@example.com', user_metadata: { role: 'Admin' } }, error: null });
    mockSupabaseAdmin.from('profiles').insert.mockResolvedValue({ data: [{ id: 'approved-auth-id' }], error: null });
    mockSupabaseAdmin.from('registrations').delete().eq().mockResolvedValue({ data: null, error: null });

    await handler(mockReq, mockRes);

    expect(mockSupabaseAdmin.from).toHaveBeenCalledWith('registrations');
    expect(mockSupabaseAdmin.select).toHaveBeenCalled();
    expect(mockSupabaseAdmin.eq).toHaveBeenCalledWith('id', 'reg-to-approve');
    expect(mockSupabaseAdmin.single).toHaveBeenCalled();
    expect(mockSupabaseAdmin.auth.admin.createUser).toHaveBeenCalledWith({
      email: 'approve@example.com',
      password: expect.any(String), // Temp password is generated
      user_metadata: { name: 'Approved User', role: 'Admin' },
      email_confirm: true
    });
    expect(mockSupabaseAdmin.from).toHaveBeenCalledWith('profiles');
    expect(mockSupabaseAdmin.insert).toHaveBeenCalledWith({
      id: 'approved-auth-id',
      full_name: 'Approved User',
      role: 'Admin',
      avatar_url: expect.any(String),
      status: 'active'
    });
    expect(mockSupabaseAdmin.from).toHaveBeenCalledWith('registrations'); // For deletion
    expect(mockSupabaseAdmin.delete).toHaveBeenCalledWith().eq('id', 'reg-to-approve');
    expect(mockRes.status).toHaveBeenCalledWith(200);
    expect(mockRes.json).toHaveBeenCalledWith(expect.objectContaining({ message: 'Registration approved successfully' }));
  });

  it('POST /api/registrations?action=approve should return 404 if registration not found', async () => {
    mockReq.method = 'POST';
    mockReq.query.action = 'approve';
    mockReq.query.id = 'non-existent-reg';
    mockSupabaseAdmin.from('registrations').select().eq().single().mockResolvedValue({ data: null, error: null });

    await handler(mockReq, mockRes);

    expect(mockRes.status).toHaveBeenCalledWith(404);
    expect(mockRes.json).toHaveBeenCalledWith({ error: 'Pending registration not found' });
  });

  it('POST /api/registrations?action=reject should reject a registration', async () => {
    mockReq.method = 'POST';
    mockReq.query.action = 'reject';
    mockReq.query.id = 'reg-to-reject';

    await handler(mockReq, mockRes);

    expect(mockSupabaseAdmin.from).toHaveBeenCalledWith('registrations');
    expect(mockSupabaseAdmin.delete).toHaveBeenCalledWith().eq('id', 'reg-to-reject');
    expect(mockRes.status).toHaveBeenCalledWith(204);
    expect(mockRes.end).toHaveBeenCalled();
  });

  // --- DELETE Tests ---
  it('DELETE /api/registrations should delete a registration', async () => {
    mockReq.method = 'DELETE';
    mockReq.query.id = 'reg-to-delete';

    await handler(mockReq, mockRes);

    expect(mockSupabaseAdmin.from).toHaveBeenCalledWith('registrations');
    expect(mockSupabaseAdmin.delete).toHaveBeenCalledWith().eq('id', 'reg-to-delete');
    expect(mockRes.status).toHaveBeenCalledWith(204);
    expect(mockRes.end).toHaveBeenCalled();
  });

  it('DELETE /api/registrations should return 400 if ID is missing', async () => {
    mockReq.method = 'DELETE';
    await handler(mockReq, mockRes);

    expect(mockRes.status).toHaveBeenCalledWith(400);
    expect(mockRes.json).toHaveBeenCalledWith({ error: 'Registration ID is required' });
  });
});
