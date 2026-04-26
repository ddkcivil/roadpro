import { describe, it, expect, vi, beforeEach } from 'vitest';
import handler from '../api/projects.js'; // Adjust path if necessary
import { supabaseAdmin } from '../api/_utils/supabaseClient.js';
import { mapProjectFromDb, mapProjectToDb } from '../api/_utils/mappers.js';

// Mock Supabase client and its methods
vi.mock('../api/_utils/supabaseClient.js', () => ({
  supabaseAdmin: {
    from: vi.fn().mockReturnThis(),
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    range: vi.fn().mockReturnThis(),
    order: vi.fn().mockReturnThis(),
    single: vi.fn().mockReturnThis(),
    insert: vi.fn().mockResolvedValue({ data: [{ id: 'new-project-id' }], error: null }),
    update: vi.fn().mockResolvedValue({ data: [{ id: 'updated-project-id' }], error: null }),
    delete: vi.fn().mockResolvedValue({ data: null, error: null }),
    // Mocking count for pagination
    count: vi.fn().mockResolvedValue({ count: 10, error: null }),
  }
}));

// Mock external utilities
vi.mock('../api/_utils/mappers.js', () => ({
  mapProjectFromDb: vi.fn((proj: any) => proj), // Identity mapping for simplicity
  mapProjectToDb: vi.fn((proj: any) => proj)
}));
vi.mock('../api/_utils/auth.js', () => ({ withAuth: (h: any) => h }));
vi.mock('../api/_utils/errorHandler.js', () => ({ withErrorHandler: (h: any) => h }));

describe('api/projects handler', () => {
  let mockReq: any;
  let mockRes: any;
  let mockSupabaseAdmin: any;
  let mapProjectFromDb: any;
  let mapProjectToDb: any;

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
    mapProjectFromDb = (await import('../api/_utils/mappers.js')).mapProjectFromDb;
    mapProjectToDb = (await import('../api/_utils/mappers.js')).mapProjectToDb;

    // Mock default behaviors for chainable Supabase methods
    mockSupabaseAdmin.from.mockReturnThis();
    mockSupabaseAdmin.select.mockReturnThis();
    mockSupabaseAdmin.eq.mockReturnThis();
    mockSupabaseAdmin.range.mockReturnThis();
    mockSupabaseAdmin.order.mockReturnThis();
    mockSupabaseAdmin.single.mockReturnThis();
    // Mocking the final count call for pagination
    mockSupabaseAdmin.select.mockResolvedValueOnce({ count: 10, error: null }); // For the count query
    // Mocking subsequent data fetches
    mockSupabaseAdmin.select.mockResolvedValue({ data: [], error: null }); // Default for data fetch
    mockSupabaseAdmin.insert.mockResolvedValue({ data: [], error: null });
    mockSupabaseAdmin.update.mockResolvedValue({ data: [], error: null });
    mockSupabaseAdmin.delete.mockResolvedValue({ data: null, error: null });
  });

  // --- GET Tests ---
  it('GET /api/projects should return a list of projects with pagination', async () => {
    mockReq.method = 'GET';
    mockReq.query = { page: '1', limit: '10' };
    const mockProjects = [{ id: 'proj-1', name: 'Project Alpha' }, { id: 'proj-2', name: 'Project Beta' }];
    
    // Mock count and data fetches
    mockSupabaseAdmin.from('projects').select('*', { count: 'exact', head: true }).mockResolvedValue({ count: 25, error: null });
    mockSupabaseAdmin.from('projects').select('*').range(0, 9).order('createdat', { ascending: false }).mockResolvedValue({ data: mockProjects, error: null });

    await handler(mockReq, mockRes);

    expect(mockSupabaseAdmin.from).toHaveBeenCalledWith('projects');
    expect(mockSupabaseAdmin.select).toHaveBeenCalledWith('*', { count: 'exact', head: true }); // For count
    expect(mockSupabaseAdmin.range).toHaveBeenCalledWith(0, 9);
    expect(mockSupabaseAdmin.order).toHaveBeenCalledWith('createdat', { ascending: false });
    expect(mockRes.status).toHaveBeenCalledWith(200);
    expect(mockRes.json).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.arrayContaining([expect.objectContaining({ id: 'proj-1' })]),
      pagination: expect.objectContaining({ total: 25, page: 1, limit: 10, totalPages: 3 })
    }));
  });

  it('GET /api/projects?id=<projectId> should return a specific project', async () => {
    mockReq.method = 'GET';
    mockReq.query.id = 'proj-1';
    const mockProject = { id: 'proj-1', name: 'Project Alpha' };
    mockSupabaseAdmin.eq.mockResolvedValue({ data: mockProject, error: null });
    mockSupabaseAdmin.single.mockReturnThis(); // Ensure single() is called

    await handler(mockReq, mockRes);

    expect(mockSupabaseAdmin.from).toHaveBeenCalledWith('projects');
    expect(mockSupabaseAdmin.select).toHaveBeenCalledWith('*');
    expect(mockSupabaseAdmin.eq).toHaveBeenCalledWith('id', 'proj-1');
    expect(mockSupabaseAdmin.single).toHaveBeenCalled();
    expect(mockRes.status).toHaveBeenCalledWith(200);
    expect(mockRes.json).toHaveBeenCalledWith(expect.objectContaining({ id: 'proj-1' }));
  });

  it('GET /api/projects?id=<projectId> should return 404 if project not found', async () => {
    mockReq.method = 'GET';
    mockReq.query.id = 'non-existent-project';
    mockSupabaseAdmin.eq.mockResolvedValue({ data: null, error: null });
    mockSupabaseAdmin.single.mockReturnThis();

    await handler(mockReq, mockRes);

    expect(mockRes.status).toHaveBeenCalledWith(404);
    expect(mockRes.json).toHaveBeenCalledWith({ error: 'Project not found' });
  });

  // --- POST Tests ---
  it('POST /api/projects should create a new project (Admin/Project Manager only)', async () => {
    mockReq.method = 'POST';
    mockReq.body = { name: 'New Project', client: 'Client X', clientName: 'Client X Corp' };
    mockReq.user = { userId: 'admin-user', role: 'ADMIN' };

    const mockNewProject = { id: 'new-proj-id', name: 'New Project', client: 'Client X', clientname: 'Client X Corp' };
    mockSupabaseAdmin.insert.mockResolvedValue({ data: [mockNewProject], error: null });
    // Mock mapProjectToDb to return the project data with snake_case keys
    mapProjectToDb.mockReturnValue({ ...mockNewProject, clientname: 'Client X Corp' }); // Simulate mapping
    mapProjectFromDb.mockReturnValue(mockNewProject); // Simulate mapping back

    await handler(mockReq, mockRes);

    expect(mockSupabaseAdmin.from).toHaveBeenCalledWith('projects');
    expect(mockSupabaseAdmin.insert).toHaveBeenCalledWith(expect.objectContaining({ name: 'New Project', client: 'Client X', clientname: 'Client X Corp' }));
    expect(mockRes.status).toHaveBeenCalledWith(201);
    expect(mockRes.json).toHaveBeenCalledWith(expect.objectContaining({ id: 'new-proj-id' }));
  });

  it('POST /api/projects should return 400 if required fields are missing', async () => {
    mockReq.method = 'POST';
    mockReq.body = { client: 'Client X' }; // Missing name
    mockReq.user = { userId: 'admin-user', role: 'ADMIN' };

    await handler(mockReq, mockRes);

    expect(mockRes.status).toHaveBeenCalledWith(400);
    expect(mockRes.json).toHaveBeenCalledWith({ error: 'Project name and client are required' });
  });

  it('POST /api/projects should return 403 if user is not authorized', async () => {
    mockReq.method = 'POST';
    mockReq.body = { name: 'New Project', client: 'Client X' };
    mockReq.user = { userId: 'regular-user', role: 'USER' }; // Unauthorized role

    await handler(mockReq, mockRes);

    expect(mockRes.status).toHaveBeenCalledWith(403);
    expect(mockRes.json).toHaveBeenCalledWith({ error: 'Only admins or project managers can create projects' });
  });

  // --- PUT Tests ---
  it('PUT /api/projects should update an existing project', async () => {
    mockReq.method = 'PUT';
    mockReq.query.id = 'proj-to-update';
    mockReq.body = { name: 'Updated Project Name', client: 'Updated Client' };
    mockReq.user = { userId: 'admin-user', role: 'ADMIN' };

    const mockUpdatedProject = { id: 'proj-to-update', name: 'Updated Project Name', client: 'Updated Client' };
    mockSupabaseAdmin.update.mockResolvedValue({ data: [mockUpdatedProject], error: null });
    mockSupabaseAdmin.eq.mockReturnThis();
    mockSupabaseAdmin.select.mockResolvedValue({ data: [mockUpdatedProject], error: null });
    mockSupabaseAdmin.single.mockReturnThis();
    mapProjectToDb.mockReturnValue({ ...mockUpdatedProject, client: 'Updated Client' });
    mapProjectFromDb.mockReturnValue(mockUpdatedProject);

    await handler(mockReq, mockRes);

    expect(mockSupabaseAdmin.from).toHaveBeenCalledWith('projects');
    expect(mockSupabaseAdmin.update).toHaveBeenCalledWith(expect.objectContaining({ name: 'Updated Project Name', client: 'Updated Client' }));
    expect(mockSupabaseAdmin.eq).toHaveBeenCalledWith('id', 'proj-to-update');
    expect(mockRes.status).toHaveBeenCalledWith(200);
    expect(mockRes.json).toHaveBeenCalledWith(expect.objectContaining({ id: 'proj-to-update', name: 'Updated Project Name' }));
  });

  it('PUT /api/projects should return 400 if Project ID is missing', async () => {
    mockReq.method = 'PUT';
    mockReq.body = { name: 'Project Update' };
    mockReq.user = { userId: 'admin-user', role: 'ADMIN' };

    await handler(mockReq, mockRes);

    expect(mockRes.status).toHaveBeenCalledWith(400);
    expect(mockRes.json).toHaveBeenCalledWith({ error: 'Project ID is required' });
  });

  it('PUT /api/projects should return 403 if user is not authorized', async () => {
    mockReq.method = 'PUT';
    mockReq.query.id = 'proj-1';
    mockReq.body = { name: 'Unauthorized Update' };
    mockReq.user = { userId: 'regular-user', role: 'USER' }; // Unauthorized role

    await handler(mockReq, mockRes);

    expect(mockRes.status).toHaveBeenCalledWith(403);
    expect(mockRes.json).toHaveBeenCalledWith({ error: 'Only authorized personnel can update projects' });
  });

  // --- PATCH Tests ---
  it('PATCH /api/projects should partially update a project', async () => {
    mockReq.method = 'PATCH';
    mockReq.query.id = 'proj-to-patch';
    mockReq.body = { description: 'New description' };
    mockReq.user = { userId: 'admin-user', role: 'ADMIN' };

    const mockPatchedProject = { id: 'proj-to-patch', name: 'Original Name', description: 'New description' };
    mockSupabaseAdmin.update.mockResolvedValue({ data: [mockPatchedProject], error: null });
    mockSupabaseAdmin.eq.mockReturnThis();
    mockSupabaseAdmin.select.mockResolvedValue({ data: [mockPatchedProject], error: null });
    mockSupabaseAdmin.single.mockReturnThis();
    mapProjectToDb.mockReturnValue({ ...mockPatchedProject, description: 'New description' });
    mapProjectFromDb.mockReturnValue(mockPatchedProject);

    await handler(mockReq, mockRes);

    expect(mockSupabaseAdmin.from).toHaveBeenCalledWith('projects');
    expect(mockSupabaseAdmin.update).toHaveBeenCalledWith(expect.objectContaining({ description: 'New description' }));
    expect(mockRes.status).toHaveBeenCalledWith(200);
    expect(mockRes.json).toHaveBeenCalledWith(expect.objectContaining({ description: 'New description' }));
  });

  it('PATCH /api/projects?action=update-location should update user location', async () => {
    mockReq.method = 'PATCH';
    mockReq.query = { id: 'proj-loc-update', action: 'update-location' };
    mockReq.body = { latitude: 34.0522, longitude: -118.2437 };
    mockReq.user = { userId: 'staff-user', role: 'STAFF', name: 'Staff Member' };

    // Mock upsert for staff_locations
    mockSupabaseAdmin.from('staff_locations').upsert.mockResolvedValue({ data: [], error: null });

    await handler(mockReq, mockRes);

    expect(mockSupabaseAdmin.from).toHaveBeenCalledWith('staff_locations');
    expect(mockSupabaseAdmin.upsert).toHaveBeenCalledWith([
      expect.objectContaining({
        project_id: 'proj-loc-update',
        user_id: 'staff-user',
        latitude: 34.0522,
        longitude: -118.2437,
        user_name: 'Staff Member',
        user_role: 'STAFF'
      })
    ], { onConflict: 'project_id, user_id' });
    expect(mockRes.status).toHaveBeenCalledWith(200);
    expect(mockRes.json).toHaveBeenCalledWith({ success: true, message: 'Location updated successfully' });
  });

  it('PATCH /api/projects?action=update-location should return 403 if user role is not authorized', async () => {
    mockReq.method = 'PATCH';
    mockReq.query = { id: 'proj-loc-update', action: 'update-location' };
    mockReq.body = { latitude: 34.0522, longitude: -118.2437 };
    mockReq.user = { userId: 'regular-user', role: 'USER' }; // Unauthorized role

    await handler(mockReq, mockRes);

    expect(mockRes.status).toHaveBeenCalledWith(403);
    expect(mockRes.json).toHaveBeenCalledWith({ error: 'Only authorized personnel can update locations' });
  });

  // --- DELETE Tests ---
  it('DELETE /api/projects should delete a project (Admin only)', async () => {
    mockReq.method = 'DELETE';
    mockReq.query.id = 'project-to-delete';
    mockReq.user = { userId: 'admin-user', role: 'ADMIN' };

    await handler(mockReq, mockRes);

    expect(mockSupabaseAdmin.from).toHaveBeenCalledWith('projects');
    expect(mockSupabaseAdmin.delete).toHaveBeenCalled();
    expect(mockSupabaseAdmin.eq).toHaveBeenCalledWith('id', 'project-to-delete');
    expect(mockRes.status).toHaveBeenCalledWith(204);
    expect(mockRes.end).toHaveBeenCalled();
  });

  it('DELETE /api/projects should return 403 if user is not Admin', async () => {
    mockReq.method = 'DELETE';
    mockReq.query.id = 'project-to-delete';
    mockReq.user = { userId: 'regular-user', role: 'USER' };

    await handler(mockReq, mockRes);

    expect(mockRes.status).toHaveBeenCalledWith(403);
    expect(mockRes.json).toHaveBeenCalledWith({ error: 'Only admins can delete projects' });
  });

  it('DELETE /api/projects should return 400 if ID is missing', async () => {
    mockReq.method = 'DELETE';
    mockReq.user = { userId: 'admin-user', role: 'ADMIN' };

    await handler(mockReq, mockRes);

    expect(mockRes.status).toHaveBeenCalledWith(400);
    expect(mockRes.json).toHaveBeenCalledWith({ error: 'Project ID is required' });
  });

  it('DELETE /api/projects should handle Supabase delete errors', async () => {
    mockReq.method = 'DELETE';
    mockReq.query.id = 'project-to-delete';
    mockReq.user = { userId: 'admin-user', role: 'ADMIN' };
    const deleteError = { message: 'Failed to delete from Supabase' };
    mockSupabaseAdmin.delete.mockResolvedValue({ data: null, error: deleteError });

    await handler(mockReq, mockRes);

    expect(mockSupabaseAdmin.delete).toHaveBeenCalled();
    // Expect error to be thrown and caught by withErrorHandler, resulting in a 500 status
    expect(mockRes.status).toHaveBeenCalledWith(500);
  });
});
