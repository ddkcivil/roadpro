import { describe, it, expect, vi, beforeEach } from 'vitest';
import handler from '../api/users.js'; // Adjust path if necessary
import { supabaseAdmin } from '../api/_utils/supabaseClient.js'; // Assuming this is how it's imported

// Mock Supabase client and its methods
vi.mock('../api/_utils/supabaseClient.js', () => ({
  supabaseAdmin: {
    from: vi.fn().mockReturnThis(), // Mocking from('profiles') or from('auth.users')
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    order: vi.fn().mockReturnThis(),
    single: vi.fn().mockReturnThis(),
    insert: vi.fn().mockResolvedValue({ data: [{ id: 'new-user-id' }], error: null }),
    update: vi.fn().mockResolvedValue({ data: [{ id: 'updated-user-id' }], error: null }),
    delete: vi.fn().mockResolvedValue({ data: null, error: null }),
    auth: {
      admin: {
        createUser: vi.fn().mockResolvedValue({ user: { id: 'new-auth-id', email: 'test@example.com' }, error: null }),
        updateUserById: vi.fn().mockResolvedValue({ user: { id: 'updated-auth-id' }, error: null }),
        deleteUser: vi.fn().mockResolvedValue({ error: null }),
        listUsers: vi.fn().mockResolvedValue({ data: { users: [] }, error: null })
      }
    }
  }
}));

// Mock external utilities
vi.mock('../api/_utils/mappers.js', () => ({
  mapUserFromDb: vi.fn((user: any) => user), // Simple identity mapping for now
  mapUserToDb: vi.fn((user: any) => user)
}));
vi.mock('../api/_utils/auth.js', () => ({ withAuth: (h: any) => h }));
vi.mock('../api/_utils/errorHandler.js', () => ({ withErrorHandler: (h: any) => h }));

describe('api/users handler', () => {
  let mockReq: any;
  let mockRes: any;
  let mockSupabaseAdmin: any;
  let mapUserFromDb: any;
  let mapUserToDb: any;

  beforeEach(async () => {
    vi.clearAllMocks();
    mockReq = { method: '', query: {}, body: {}, user: {} };
    mockRes = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn().mockReturnThis(),
      end: vi.fn().mockReturnThis(),
      setHeader: vi.fn().mockReturnThis()
    };

    mockSupabaseAdmin = (await import('../api/_utils/supabaseClient.js')).supabaseAdmin;
    mapUserFromDb = (await import('../api/_utils/mappers.js')).mapUserFromDb;
    mapUserToDb = (await import('../api/_utils/mappers.js')).mapUserToDb;

    // Mock default behaviors for chainable Supabase methods
    mockSupabaseAdmin.from.mockReturnThis();
    mockSupabaseAdmin.select.mockReturnThis();
    mockSupabaseAdmin.eq.mockReturnThis();
    mockSupabaseAdmin.order.mockReturnThis();
    mockSupabaseAdmin.single.mockReturnThis();
    mockSupabaseAdmin.insert.mockResolvedValue({ data: [], error: null }); // Default resolution
    mockSupabaseAdmin.update.mockResolvedValue({ data: [], error: null }); // Default resolution
    mockSupabaseAdmin.delete.mockResolvedValue({ data: null, error: null }); // Default resolution

    // Mock auth methods
    mockSupabaseAdmin.auth.admin.createUser.mockResolvedValue({ user: { id: 'new-test-user-id', email: 'new@example.com', user_metadata: {} }, error: null });
    mockSupabaseAdmin.auth.admin.updateUserById.mockResolvedValue({ user: { id: 'updated-auth-id', email: 'test@example.com' }, error: null });
    mockSupabaseAdmin.auth.admin.deleteUser.mockResolvedValue({ error: null });
    mockSupabaseAdmin.auth.admin.listUsers.mockResolvedValue({ data: { users: [] }, error: null });
  });

  // --- GET Tests ---
  it('GET /api/users should return a list of users', async () => {
    mockReq.method = 'GET';
    const mockUsers = [{ id: 'user-1', full_name: 'Test User 1', role: 'Admin', last_seen: '2023-01-01T10:00:00Z' }];
    mockSupabaseAdmin.select.mockResolvedValue({ data: mockUsers, error: null });

    await handler(mockReq, mockRes);

    expect(mockSupabaseAdmin.from).toHaveBeenCalledWith('profiles');
    expect(mockSupabaseAdmin.select).toHaveBeenCalledWith('id, full_name, avatar_url, role, last_seen');
    expect(mockSupabaseAdmin.eq).not.toHaveBeenCalled(); // Not fetching a specific user
    expect(mockRes.status).toHaveBeenCalledWith(200);
    expect(mockRes.json).toHaveBeenCalledWith(expect.arrayContaining([expect.objectContaining({ id: 'user-1' })]));
  });

  it('GET /api/users?id=<userId> should return a specific user', async () => {
    mockReq.method = 'GET';
    mockReq.query.id = 'user-1';
    const mockUser = { id: 'user-1', full_name: 'Test User 1', role: 'Admin', last_seen: '2023-01-01T10:00:00Z' };
    mockSupabaseAdmin.eq.mockResolvedValue({ data: mockUser, error: null });
    mockSupabaseAdmin.single.mockReturnThis(); // Ensure single() is called and mock its resolution

    await handler(mockReq, mockRes);

    expect(mockSupabaseAdmin.from).toHaveBeenCalledWith('profiles');
    expect(mockSupabaseAdmin.select).toHaveBeenCalledWith('id, full_name, avatar_url, role, last_seen');
    expect(mockSupabaseAdmin.eq).toHaveBeenCalledWith('id', 'user-1');
    expect(mockSupabaseAdmin.single).toHaveBeenCalled();
    expect(mockRes.status).toHaveBeenCalledWith(200);
    expect(mockRes.json).toHaveBeenCalledWith(expect.objectContaining({ id: 'user-1' }));
  });

  it('GET /api/users?id=<userId> should return 404 if user not found', async () => {
    mockReq.method = 'GET';
    mockReq.query.id = 'non-existent-user';
    mockSupabaseAdmin.eq.mockResolvedValue({ data: null, error: null });
    mockSupabaseAdmin.single.mockReturnThis();

    await handler(mockReq, mockRes);

    expect(mockRes.status).toHaveBeenCalledWith(404);
    expect(mockRes.json).toHaveBeenCalledWith({ error: 'User not found' });
  });

  // --- POST Tests ---
  it('POST /api/users should create a new user (Admin only)', async () => {
    mockReq.method = 'POST';
    mockReq.body = { name: 'New Admin', email: 'newadmin@example.com', password: 'password123', role: 'Admin' };
    mockReq.user = { userId: 'admin-user-id', role: 'ADMIN' }; // Mock user with Admin role

    // Mock successful Supabase operations
    mockSupabaseAdmin.auth.admin.createUser.mockResolvedValue({ user: { id: 'new-user-id', email: 'newadmin@example.com', user_metadata: { role: 'Admin' } }, error: null });
    mockSupabaseAdmin.from('profiles').insert.mockResolvedValue({ data: [{ id: 'new-user-id' }], error: null });

    await handler(mockReq, mockRes);

    expect(mockSupabaseAdmin.auth.admin.createUser).toHaveBeenCalledWith({
      email: 'newadmin@example.com',
      password: 'password123',
      user_metadata: { name: 'New Admin', phone: undefined, role: 'Admin', avatar_url: expect.any(String) },
      email_confirm: true
    });
    expect(mockSupabaseAdmin.from).toHaveBeenCalledWith('profiles');
    expect(mockSupabaseAdmin.insert).toHaveBeenCalledWith({
      id: 'new-user-id',
      full_name: 'New Admin',
      role: 'Admin',
      avatar_url: expect.any(String),
      last_seen: expect.any(String)
    });
    expect(mockRes.status).toHaveBeenCalledWith(201);
    expect(mockRes.json).toHaveBeenCalledWith(expect.objectContaining({ email: 'newadmin@example.com', role: 'Admin' }));
  });

  it('POST /api/users should return 403 if user is not Admin', async () => {
    mockReq.method = 'POST';
    mockReq.body = { name: 'New User', email: 'newuser@example.com', password: 'password123' };
    mockReq.user = { userId: 'regular-user-id', role: 'USER' }; // Mock user with non-Admin role

    await handler(mockReq, mockRes);

    expect(mockRes.status).toHaveBeenCalledWith(403);
    expect(mockRes.json).toHaveBeenCalledWith({ error: 'Only admins can create users' });
  });

  it('POST /api/users should return 409 if user already exists', async () => {
    mockReq.method = 'POST';
    mockReq.body = { name: 'Existing User', email: 'existing@example.com', password: 'password123' };
    mockReq.user = { userId: 'admin-user-id', role: 'ADMIN' };
    const authError = { status: 400, code: 'email_exists', message: 'User with that email already exists' };
    mockSupabaseAdmin.auth.admin.createUser.mockResolvedValue({ user: null, error: authError });

    await handler(mockReq, mockRes);

    expect(mockRes.status).toHaveBeenCalledWith(409);
    expect(mockRes.json).toHaveBeenCalledWith({ error: 'User already exists', details: expect.any(String) });
  });

  // --- PUT Tests ---
  it('PUT /api/users should update a user (Admin or self)', async () => {
    mockReq.method = 'PUT';
    mockReq.query.id = 'user-to-update';
    mockReq.body = { name: 'Updated Name', role: 'Editor', avatar: 'new_avatar_url' };
    mockReq.user = { userId: 'user-to-update', role: 'ADMIN' }; // Admin user updating

    // Mocking successful update operations
    mockSupabaseAdmin.auth.admin.updateUserById.mockResolvedValue({ user: { id: 'user-to-update' }, error: null });
    mockSupabaseAdmin.from('profiles').update.mockResolvedValue({ data: [{ id: 'user-to-update', full_name: 'Updated Name', role: 'Editor', avatar_url: 'new_avatar_url' }], error: null });
    mockSupabaseAdmin.select.mockResolvedValue({ data: [{ id: 'user-to-update', full_name: 'Updated Name', role: 'Editor', avatar_url: 'new_avatar_url', last_seen: null }], error: null });
    mockSupabaseAdmin.single.mockReturnThis();

    await handler(mockReq, mockRes);

    expect(mockSupabaseAdmin.auth.admin.updateUserById).toHaveBeenCalledWith('user-to-update', { password: undefined }); // Password not provided in body
    expect(mockSupabaseAdmin.from).toHaveBeenCalledWith('profiles');
    expect(mockSupabaseAdmin.update).toHaveBeenCalledWith({
      full_name: 'Updated Name',
      role: 'Editor',
      avatar_url: 'new_avatar_url'
    });
    expect(mockSupabaseAdmin.eq).toHaveBeenCalledWith('id', 'user-to-update');
    expect(mockRes.status).toHaveBeenCalledWith(200);
    expect(mockRes.json).toHaveBeenCalledWith(expect.objectContaining({ full_name: 'Updated Name', role: 'Editor' }));
  });

  it('PUT /api/users should allow self-update', async () => {
    mockReq.method = 'PUT';
    mockReq.query.id = 'self-user';
    mockReq.body = { name: 'Self Updated' };
    mockReq.user = { userId: 'self-user', role: 'USER' }; // User updating themselves

    mockSupabaseAdmin.auth.admin.updateUserById.mockResolvedValue({ user: { id: 'self-user' }, error: null });
    mockSupabaseAdmin.from('profiles').update.mockResolvedValue({ data: [{ id: 'self-user', full_name: 'Self Updated' }], error: null });
    mockSupabaseAdmin.select.mockResolvedValue({ data: [{ id: 'self-user', full_name: 'Self Updated', last_seen: null }], error: null });
    mockSupabaseAdmin.single.mockReturnThis();

    await handler(mockReq, mockRes);

    expect(mockSupabaseAdmin.auth.admin.updateUserById).toHaveBeenCalledWith('self-user', { password: undefined });
    expect(mockSupabaseAdmin.from).toHaveBeenCalledWith('profiles');
    expect(mockSupabaseAdmin.update).toHaveBeenCalledWith({ full_name: 'Self Updated' });
    expect(mockRes.status).toHaveBeenCalledWith(200);
  });

  it('PUT /api/users should return 403 if trying to update another user without Admin role', async () => {
    mockReq.method = 'PUT';
    mockReq.query.id = 'other-user';
    mockReq.body = { name: 'Malicious Update' };
    mockReq.user = { userId: 'self-user', role: 'USER' }; // User trying to update another

    await handler(mockReq, mockRes);

    expect(mockRes.status).toHaveBeenCalledWith(403);
    expect(mockRes.json).toHaveBeenCalledWith({ error: 'Forbidden' });
  });

  it('PUT /api/users should update password if provided', async () => {
    mockReq.method = 'PUT';
    mockReq.query.id = 'user-with-pass-update';
    mockReq.body = { password: 'newsecurepassword' };
    mockReq.user = { userId: 'user-with-pass-update', role: 'ADMIN' };

    mockSupabaseAdmin.auth.admin.updateUserById.mockResolvedValue({ user: { id: 'user-with-pass-update' }, error: null });
    mockSupabaseAdmin.from('profiles').update.mockResolvedValue({ data: [{ id: 'user-with-pass-update' }], error: null });
    mockSupabaseAdmin.select.mockResolvedValue({ data: [{ id: 'user-with-pass-update', last_seen: null }], error: null });
    mockSupabaseAdmin.single.mockReturnThis();

    await handler(mockReq, mockRes);

    expect(mockSupabaseAdmin.auth.admin.updateUserById).toHaveBeenCalledWith('user-with-pass-update', { password: 'newsecurepassword' });
    expect(mockRes.status).toHaveBeenCalledWith(200);
  });

  // --- DELETE Tests ---
  it('DELETE /api/users should delete a user (Admin only)', async () => {
    mockReq.method = 'DELETE';
    mockReq.query.id = 'user-to-delete';
    mockReq.user = { userId: 'admin-user-id', role: 'ADMIN' };

    await handler(mockReq, mockRes);

    expect(mockSupabaseAdmin.auth.admin.deleteUser).toHaveBeenCalledWith('user-to-delete');
    expect(mockRes.status).toHaveBeenCalledWith(204);
    expect(mockRes.end).toHaveBeenCalled();
  });

  it('DELETE /api/users should return 403 if user is not Admin', async () => {
    mockReq.method = 'DELETE';
    mockReq.query.id = 'user-to-delete';
    mockReq.user = { userId: 'regular-user-id', role: 'USER' };

    await handler(mockReq, mockRes);

    expect(mockRes.status).toHaveBeenCalledWith(403);
    expect(mockRes.json).toHaveBeenCalledWith({ error: 'Forbidden: Only admins can delete users.' });
  });

  it('DELETE /api/users should return 400 if ID is missing', async () => {
    mockReq.method = 'DELETE';
    mockReq.user = { userId: 'admin-user-id', role: 'ADMIN' };

    await handler(mockReq, mockRes);

    expect(mockRes.status).toHaveBeenCalledWith(400);
    expect(mockRes.json).toHaveBeenCalledWith({ error: 'User ID is required for deletion' });
  });

  it('DELETE /api/users should handle Supabase delete errors', async () => {
    mockReq.method = 'DELETE';
    mockReq.query.id = 'user-to-delete';
    mockReq.user = { userId: 'admin-user-id', role: 'ADMIN' };
    const deleteError = { message: 'Failed to delete from Supabase' };
    mockSupabaseAdmin.auth.admin.deleteUser.mockResolvedValue({ error: deleteError });

    await handler(mockReq, mockRes);

    expect(mockSupabaseAdmin.auth.admin.deleteUser).toHaveBeenCalledWith('user-to-delete');
    // Expect error to be thrown and caught by withErrorHandler, resulting in a 500 status
    expect(mockRes.status).toHaveBeenCalledWith(500);
  });
});
