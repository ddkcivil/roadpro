import { describe, it, expect, vi, beforeEach } from 'vitest';
import handler from '../api/projects.js';
// Adjust the import path based on your project structure if necessary
// import { supabaseAdmin } from '../api/_utils/supabaseClient.js'; 

// Mock the Supabase client module entirely
const mockSupabaseAdmin = {
  from: vi.fn(),
  auth: {
    admin: {
      createUser: vi.fn(),
      deleteUser: vi.fn(),
      updateUserById: vi.fn(),
      listUsers: vi.fn(),
    }
  }
};

// Mock the chainable methods for PostgrestBuilder
const mockPostgrestBuilder = {
  select: vi.fn().mockReturnThis(),
  range: vi.fn().mockReturnThis(),
  order: vi.fn().mockReturnThis(),
  eq: vi.fn().mockReturnThis(),
  single: vi.fn(),
  insert: vi.fn(),
  update: vi.fn(),
  delete: vi.fn(),
  upsert: vi.fn(),
  // Make the chain awaitable for methods like single, insert, update, delete
  // The .then() method is used to simulate awaiting the result
  then: vi.fn(),
  // Internal properties to hold mock results
  _data: [],
  _count: 0,
  _error: null,
};

vi.mock('../api/_utils/supabaseClient.js', () => ({
  supabaseAdmin: mockSupabaseAdmin,
  ensureSupabaseConfigured: vi.fn(),
}));

// Mock external utilities
vi.mock('../api/_utils/mappers.js', () => ({
  mapProjectFromDb: vi.fn((proj: any) => proj), // Return as is for simplicity in tests
  mapProjectToDb: vi.fn((proj: any) => proj),
}));
vi.mock('../api/_utils/auth.js', () => ({ withAuth: (h: any) => h }));
vi.mock('../api/_utils/errorHandler.js', () => ({ withErrorHandler: (h: any) => h }));

describe('api/projects handler', () => {
  let mockReq: any;
  let mockRes: any;

  beforeEach(() => {
    vi.clearAllMocks();

    // Mock mapProjectFromDb and mapProjectToDb
    vi.mocked(mapProjectFromDb).mockImplementation((proj: any) => proj);
    vi.mocked(mapProjectToDb).mockImplementation((proj: any) => proj);
    
    mockReq = { method: '', query: {}, body: {}, user: {} };
    mockRes = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn().mockReturnThis(),
      end: vi.fn().mockReturnThis(),
      setHeader: vi.fn().mockReturnThis()
    };

    // Reset mockSupabaseChain for each test
    Object.keys(mockPostgrestBuilder).forEach(key => {
      if (typeof mockPostgrestBuilder[key] === 'function') {
        mockPostgrestBuilder[key].mockClear();
      }
    });

    // Ensure methods return the builder for chaining
    Object.keys(mockPostgrestBuilder).forEach(key => {
      if (key !== 'then') { // 'then' is special for resolving promises
        mockPostgrestBuilder[key].mockReturnThis();
      }
    });

    // Mock individual query endpoints to return a thenable object
    mockPostgrestBuilder.single.mockImplementation(() => ({ then: vi.fn(resolve => resolve({ data: null, error: null })) }));
    mockPostgrestBuilder.insert.mockImplementation(() => ({ then: vi.fn(resolve => resolve({ data: [], error: null })) }));
    mockPostgrestBuilder.update.mockImplementation(() => ({ then: vi.fn(resolve => resolve({ data: [], error: null })) }));
    mockPostgrestBuilder.delete.mockImplementation(() => ({ then: vi.fn(resolve => resolve({ error: null })) }));

    // Mock the count and data fetching calls for GET /api/projects
    let callCount = 0;
    mockPostgrestBuilder.select.mockImplementation((_, options) => {
      if (options?.count === 'exact' && options?.head === true) {
        // This is the count call
        return { ...mockPostgrestBuilder, then: vi.fn(resolve => resolve({ count: 1, error: null })) };
      }
      // This is the data fetching call (will be called after count)
      return { ...mockPostgrestBuilder, then: vi.fn(resolve => resolve({ data: [], count: 1, error: null })) };
    });

    // Mock auth admin methods
    mockAuthAdmin.createUser.mockResolvedValue({ user: { id: 'mock-user-id' }, error: null });
    mockAuthAdmin.deleteUser.mockResolvedValue({ error: null });
    mockAuthAdmin.updateUserById.mockResolvedValue({ error: null });
    mockAuthAdmin.listUsers.mockResolvedValue({ users: [], error: null });
  });

  it('GET /api/projects should return a list of projects', async () => {
    mockReq.method = 'GET';
    const mockProjects = [{ id: 'proj-1', name: 'Project Alpha' }];
    
    // Override the mock implementation for this specific test to return data
    mockSupabaseAdmin.from('projects').select.mockImplementationOnce((_, options) => {
      if (options?.count === 'exact' && options?.head === true) {
        return { then: vi.fn(resolve => resolve({ count: 1, error: null })) };
      }
      return { then: vi.fn(resolve => resolve({ data: mockProjects, count: 1, error: null })) };
    });

    await handler(mockReq, mockRes);

    expect(mockSupabaseAdmin.from).toHaveBeenCalledWith('projects');
    expect(mockPostgrestBuilder.select).toHaveBeenCalledWith('*', { count: 'exact', head: true });
    expect(mockPostgrestBuilder.select).toHaveBeenCalledWith('*'); // Second call for data
    expect(mockPostgrestBuilder.range).toHaveBeenCalled();
    expect(mockPostgrestBuilder.order).toHaveBeenCalled();
    expect(mockRes.status).toHaveBeenCalledWith(200);
    expect(mockRes.json).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.arrayContaining([expect.objectContaining({ id: 'proj-1' })]),
      pagination: expect.objectContaining({ total: 1 })
    }));
  });

  it('GET /api/projects?id=<projectId> should return a specific project', async () => {
    mockReq.method = 'GET';
    mockReq.query.id = 'proj-1';
    const mockProject = { id: 'proj-1', name: 'Project Alpha' };
    
    mockPostgrestBuilder.single.mockResolvedValue({ data: mockProject, error: null });

    await handler(mockReq, mockRes);

    expect(mockSupabaseAdmin.from).toHaveBeenCalledWith('projects');
    expect(mockPostgrestBuilder.select).toHaveBeenCalledWith('*');
    expect(mockPostgrestBuilder.eq).toHaveBeenCalledWith('id', 'proj-1');
    expect(mockPostgrestBuilder.single).toHaveBeenCalled();
    expect(mockRes.status).toHaveBeenCalledWith(200);
    expect(mockRes.json).toHaveBeenCalledWith(expect.objectContaining({ id: 'proj-1' }));
  });

  it('GET /api/projects?id=<projectId> should return 404 if project not found', async () => {
    mockReq.method = 'GET';
    mockReq.query.id = 'non-existent-proj';
    
    mockPostgrestBuilder.single.mockResolvedValue({ data: null, error: { status: 404, message: 'Not Found' } });

    await handler(mockReq, mockRes);

    expect(mockRes.status).toHaveBeenCalledWith(404);
    expect(mockRes.json).toHaveBeenCalledWith({ error: 'Project not found' });
  });

  it('POST /api/projects should create a new project', async () => {
    mockReq.method = 'POST';
    mockReq.body = { name: 'New Project', client: 'Client X' };
    mockReq.user = { userId: 'admin-user', role: 'ADMIN' };

    const mockNewProject = { id: 'new-proj-id', name: 'New Project', client: 'Client X' };
    mockPostgrestBuilder.single.mockResolvedValue({ data: mockNewProject, error: null });

    await handler(mockReq, mockRes);

    expect(mockSupabaseAdmin.from).toHaveBeenCalledWith('projects');
    expect(mockPostgrestBuilder.insert).toHaveBeenCalledWith(expect.objectContaining({
      name: 'New Project', client: 'Client X', ownerid: 'admin-user'
    }));
    expect(mockRes.status).toHaveBeenCalledWith(201);
    expect(mockRes.json).toHaveBeenCalledWith(expect.objectContaining({ id: 'new-proj-id' }));
  });
  
  it('POST /api/projects should return 403 if not admin', async () => {
    mockReq.method = 'POST';
    mockReq.body = { name: 'New Project', client: 'Client X' };
    mockReq.user = { userId: 'user-1', role: 'SITE_ENGINEER' }; // Not admin

    await handler(mockReq, mockRes);

    expect(mockRes.status).toHaveBeenCalledWith(403);
    expect(mockRes.json).toHaveBeenCalledWith({ error: 'Only admins can create projects' });
  });

  it('POST /api/projects should return 400 if required fields are missing', async () => {
    mockReq.method = 'POST';
    mockReq.body = { client: 'Client X' }; // Missing name
    mockReq.user = { userId: 'admin-user', role: 'ADMIN' };

    await handler(mockReq, mockRes);

    expect(mockRes.status).toHaveBeenCalledWith(400);
    expect(mockRes.json).toHaveBeenCalledWith({ error: 'Project name and client are required' });
  });

  it('DELETE /api/projects should delete a project', async () => {
    mockReq.method = 'DELETE';
    mockReq.query.id = 'project-to-delete';
    mockReq.user = { userId: 'admin-user', role: 'ADMIN' };

    mockPostgrestBuilder.delete.mockResolvedValue({ error: null });

    await handler(mockReq, mockRes);

    expect(mockSupabaseAdmin.from).toHaveBeenCalledWith('projects');
    expect(mockPostgrestBuilder.delete).toHaveBeenCalled();
    // The delete method should be called, and the response should be 204 No Content
    expect(mockRes.status).toHaveBeenCalledWith(204);
    expect(mockRes.end).toHaveBeenCalled();
  });
  
  it('DELETE /api/projects should return 403 if not admin', async () => {
    mockReq.method = 'DELETE';
    mockReq.query.id = 'project-to-delete';
    mockReq.user = { userId: 'user-1', role: 'SITE_ENGINEER' }; // Not admin

    await handler(mockReq, mockRes);

    expect(mockRes.status).toHaveBeenCalledWith(403);
    expect(mockRes.json).toHaveBeenCalledWith({ error: 'Only admins can delete projects' });
  });

  it('DELETE /api/projects should return 500 if Supabase delete fails', async () => {
    mockReq.method = 'DELETE';
    mockReq.query.id = 'project-to-delete';
    mockReq.user = { userId: 'admin-user', role: 'ADMIN' };
    
    const supabaseError = { status: 500, message: 'Database error' };
    mockPostgrestBuilder.delete.mockResolvedValue({ error: supabaseError });

    await handler(mockReq, mockRes);
    
    expect(mockSupabaseAdmin.from).toHaveBeenCalledWith('projects');
    expect(mockPostgrestBuilder.delete).toHaveBeenCalled();
    // Error should be caught and result in a 500 response from withErrorHandler
    expect(mockRes.status).toHaveBeenCalledWith(500);
    expect(mockRes.json).toHaveBeenCalledWith({ error: 'Failed to delete project', details: 'Database error' });
  });
});
