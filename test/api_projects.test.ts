import { describe, it, expect, vi, beforeEach } from 'vitest';
import handler from '../api/projects.js';

// Hoist Supabase mocks
const { mockSupabaseAdmin, mockPostgrestBuilder } = vi.hoisted(() => {
  const builder: any = {
    select: vi.fn(),
    range: vi.fn(),
    order: vi.fn(),
    eq: vi.fn(),
    single: vi.fn(),
    insert: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
    upsert: vi.fn(),
    then: vi.fn(),
  };

  // Make it chainable
  builder.select.mockReturnValue(builder);
  builder.range.mockReturnValue(builder);
  builder.order.mockReturnValue(builder);
  builder.eq.mockReturnValue(builder);
  builder.insert.mockReturnValue(builder);
  builder.update.mockReturnValue(builder);
  builder.delete.mockReturnValue(builder);
  builder.upsert.mockReturnValue(builder);

  const supabaseAdmin = {
    from: vi.fn(() => builder),
    auth: {
      admin: {
        createUser: vi.fn(),
        deleteUser: vi.fn(),
        updateUserById: vi.fn(),
        listUsers: vi.fn(),
      }
    }
  };

  return { mockSupabaseAdmin: supabaseAdmin, mockPostgrestBuilder: builder };
});

vi.mock('../api/utils/supabaseClient.js', () => ({
  supabaseAdmin: mockSupabaseAdmin,
  ensureSupabaseConfigured: vi.fn(),
}));

vi.mock('../api/utils/mappers.js', () => ({
  mapProjectFromDb: vi.fn((proj: any) => proj),
  mapProjectToDb: vi.fn((proj: any) => proj),
}));
vi.mock('../api/utils/auth.js', () => ({ withAuth: (h: any) => h }));
vi.mock('../api/utils/errorHandler.js', () => ({ withErrorHandler: (h: any) => h }));

describe('api/projects handler', () => {
  let mockReq: any;
  let mockRes: any;

  beforeEach(() => {
    vi.clearAllMocks();
    
    mockReq = { method: '', query: {}, body: {}, user: {} };
    mockRes = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn().mockReturnThis(),
      end: vi.fn().mockReturnThis(),
      setHeader: vi.fn().mockReturnThis()
    };

    // Default behaviors
    mockPostgrestBuilder.single.mockImplementation(() => ({ 
      then: (resolve: any) => resolve({ data: null, error: null }) 
    }));
    
    mockPostgrestBuilder.then.mockImplementation((resolve: any) => 
      resolve({ data: [], error: null })
    );

    // Default select behavior (can be overridden)
    mockPostgrestBuilder.select.mockImplementation((_, options) => {
      if (options?.count === 'exact' && options?.head === true) {
        return { then: (resolve: any) => resolve({ count: 1, error: null }) };
      }
      return mockPostgrestBuilder;
    });
  });

  it('GET /api/projects should return a list of projects', async () => {
    mockReq.method = 'GET';
    const mockProjects = [{ id: 'proj-1', name: 'Project Alpha' }];
    
    // Set up what the final .then() should return for this call
    mockPostgrestBuilder.then.mockImplementationOnce((resolve: any) => 
      resolve({ data: mockProjects, count: 1, error: null })
    );

    await handler(mockReq, mockRes);

    expect(mockRes.status).toHaveBeenCalledWith(200);
    expect(mockRes.json).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.arrayContaining([expect.objectContaining({ id: 'proj-1' })])
    }));
  });

  it('POST /api/projects should create a new project', async () => {
    mockReq.method = 'POST';
    mockReq.body = { name: 'New Project', client: 'Client X' };
    mockReq.user = { userId: 'admin-user', role: 'ADMIN' };

    const mockNewProject = { id: 'new-proj-id', name: 'New Project' };
    
    // For .insert().select().single()
    mockPostgrestBuilder.single.mockImplementationOnce(() => ({ 
      then: (resolve: any) => resolve({ data: mockNewProject, error: null }) 
    }));

    await handler(mockReq, mockRes);

    expect(mockRes.status).toHaveBeenCalledWith(201);
    expect(mockRes.json).toHaveBeenCalledWith(expect.objectContaining({ id: 'new-proj-id' }));
  });
});

