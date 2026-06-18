import { describe, it, expect, vi, beforeEach } from 'vitest';
import handler from '../api/files';
import * as supabaseClient from '../api/utils/supabaseClient.js';
import { Buffer } from 'buffer'; // Needed for POST request body

// Mock Supabase client and its methods
const mockSupabaseAdmin = {
  storage: {
    from: vi.fn().mockReturnThis(), // Mocking from('files')
    upload: vi.fn().mockResolvedValue({ data: { publicUrl: 'https://supabase.storage.url/files/test.txt' }, error: null }),
    getPublicUrl: vi.fn().mockResolvedValue({ data: { publicUrl: 'https://supabase.storage.url/files/test.txt' }, error: null }),
    remove: vi.fn().mockResolvedValue({ data: null, error: null }),
    listBuckets: vi.fn().mockResolvedValue({ data: [{ name: 'project-files' }], error: null }),
    createBucket: vi.fn().mockResolvedValue({ data: null, error: null }),
  },
  from: vi.fn(), // Will be mocked in beforeEach
  select: vi.fn(), // Will be mocked in beforeEach
  eq: vi.fn(), // Will be mocked in beforeEach
  or: vi.fn(), // Will be mocked in beforeEach
  order: vi.fn(), // Will be mocked in beforeEach
  limit: vi.fn(), // Will be mocked in beforeEach
  range: vi.fn(), // Will be mocked in beforeEach
  single: vi.fn(), // Will be mocked in beforeEach
  insert: vi.fn(), // Will be mocked in beforeEach
  update: vi.fn(), // Will be mocked in beforeEach
  upsert: vi.fn(), // Will be mocked in beforeEach
  delete: vi.fn(), // Will be mocked in beforeEach
  auth: {
    getUser: vi.fn()
  },
  // Mocking rpc for potential future use, although not directly used in files.ts GET/POST/DELETE
  rpc: vi.fn(), // Will be mocked in beforeEach
  then: vi.fn() // This is for promise resolution
};

vi.mock('../api/utils/supabaseClient.js', () => ({
  getSupabaseAdmin: vi.fn(() => mockSupabaseAdmin),
  isSupabaseConfigured: vi.fn(() => true)
}));

// Mock external utilities that might still be used
vi.mock('../api/utils/auth.js', () => ({ withAuth: (h: any) => h }));
vi.mock('../api/utils/errorHandler.js', () => ({ withErrorHandler: (h: any) => h }));
vi.mock('uuid', () => ({ v4: vi.fn(() => 'mock-uuid-123') })); // Mock uuidv4

describe('api/files handler with Supabase', () => {
  let mockRes: any;
  let mockDocData: any; // Declare mockDocData here to be accessible in beforeEach and tests
  
  // Mock promises for different operations
  let mockSelectPromise: vi.Mock;
  let mockDeleteVersionsPromise: vi.Mock;
  let mockDeleteProjectsPromise: vi.Mock;
  let mockInsertUpdateUpsertPromise: vi.Mock;

  beforeEach(async () => {
    vi.clearAllMocks();
    mockRes = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn().mockReturnThis(),
      redirect: vi.fn().mockReturnThis(),
      setHeader: vi.fn().mockReturnThis(),
      send: vi.fn().mockReturnThis(),
      end: vi.fn().mockReturnThis()
    };

    // Mock data for the select call
    mockDocData = [{ blob_url: 'files/project-123/test.txt', doc_id: 'doc-123', id: 'ver-123', version_num: 1 }];

    // Mock promises for each operation
    mockSelectPromise = vi.fn().mockResolvedValue({ data: mockDocData, error: null });
    mockDeleteVersionsPromise = vi.fn().mockResolvedValue({ data: null, error: null });
    mockDeleteProjectsPromise = vi.fn().mockResolvedValue({ data: null, error: null });
    mockInsertUpdateUpsertPromise = vi.fn().mockResolvedValue({ data: null, error: null });

    // Mock the .from() method to return chainable objects that directly return promises
    mockSupabaseAdmin.from.mockImplementation((tableName: string) => {
      // Common chainable methods that return 'this' for chaining
      const chainableMethods = {
        eq: vi.fn().mockReturnThis(),
        or: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
        limit: vi.fn().mockReturnThis(),
        range: vi.fn().mockReturnThis(),
        single: vi.fn().mockReturnThis(),
        rpc: vi.fn().mockReturnThis(),
      };

      if (tableName === 'document_versions') {
        return {
          ...chainableMethods,
          select: vi.fn().mockReturnValue(mockSelectPromise), // select directly returns the promise
          delete: vi.fn().mockReturnValue(mockDeleteVersionsPromise), // delete directly returns the promise
          insert: vi.fn().mockReturnValue(mockInsertUpdateUpsertPromise),
          update: vi.fn().mockReturnValue(mockInsertUpdateUpsertPromise),
          upsert: vi.fn().mockReturnValue(mockInsertUpdateUpsertPromise),
        };
      } else if (tableName === 'project_documents') {
        return {
          ...chainableMethods,
          select: vi.fn().mockReturnValue(mockSelectPromise), // Reuse select promise
          delete: vi.fn().mockReturnValue(mockDeleteProjectsPromise), // delete directly returns the promise
          insert: vi.fn().mockReturnValue(mockInsertUpdateUpsertPromise),
          update: vi.fn().mockReturnValue(mockInsertUpdateUpsertPromise),
          upsert: vi.fn().mockReturnValue(mockInsertUpdateUpsertPromise),
        };
      } else {
        // Default mock for other tables
        return {
          ...chainableMethods,
          select: vi.fn().mockReturnValue(mockSelectPromise),
          delete: vi.fn().mockReturnValue(mockDeleteVersionsPromise),
          insert: vi.fn().mockReturnValue(mockInsertUpdateUpsertPromise),
          update: vi.fn().mockReturnValue(mockInsertUpdateUpsertPromise),
          upsert: vi.fn().mockReturnValue(mockInsertUpdateUpsertPromise),
        };
      }
    });

    // Mock storage operations
    mockSupabaseAdmin.storage.from.mockReturnThis();
    mockSupabaseAdmin.storage.upload.mockResolvedValue({ data: { path: 'test.txt' }, error: null });
    mockSupabaseAdmin.storage.getPublicUrl.mockResolvedValue({ data: { publicUrl: 'https://supabase.storage.url/files/test.txt' }, error: null });
    mockSupabaseAdmin.storage.remove.mockResolvedValue({ data: null, error: null });
  });

  it('GET should redirect to Supabase Storage URL', async () => {
    const mockReq = {
      method: 'GET',
      query: { id: 'doc-123' },
      headers: { authorization: 'Bearer mock-token' }
    };
    
    // Setup mock resolution for the chainable database call
    mockSelectPromise.mockResolvedValue({ data: mockDocData, error: null });
    
    await handler(mockReq as any, mockRes as any);
    expect(mockSupabaseAdmin.from).toHaveBeenCalledWith('document_versions');
    expect(mockSupabaseAdmin.from('document_versions').select).toHaveBeenCalledWith('blob_url, doc_id, id, version_num');
    expect(mockSupabaseAdmin.from('document_versions').or).toHaveBeenCalledWith(`doc_id.eq.doc-123,id.eq.doc-123`);
    expect(mockSupabaseAdmin.from('document_versions').order).toHaveBeenCalledWith('version_num', { ascending: false });

    expect(mockSupabaseAdmin.storage.from).toHaveBeenCalledWith('project-files'); // Bucket name is project-files
    expect(mockSupabaseAdmin.storage.getPublicUrl).toHaveBeenCalledWith('files/project-123/test.txt');
    expect(mockRes.redirect).toHaveBeenCalledWith('https://supabase.storage.url/files/test.txt');
  });

  it('POST should upload file to Supabase Storage and save metadata', async () => {
    const mockReq = {
      method: 'POST',
      query: {},
      headers: { authorization: 'Bearer mock-token' },
      body: {
        name: 'test.txt',
        contentType: 'text/plain',
        base64Data: Buffer.from('hello').toString('base64'),
        projectId: 'project-123',
        folder: 'docs' // Example folder structure
      }
    };

    // Mock successful auth user retrieval
    mockSupabaseAdmin.auth.getUser.mockResolvedValue({ data: { user: { id: 'user-1', email: 'test@example.com' } }, error: null });
    mockSupabaseAdmin.from('profiles').select().eq().maybeSingle.mockResolvedValue({ data: { role: 'Admin' }, error: null });

    await handler(mockReq as any, mockRes as any);
    expect(mockSupabaseAdmin.storage.from).toHaveBeenCalledWith('project-files');
    expect(mockSupabaseAdmin.storage.upload).toHaveBeenCalled();

    // Verify Supabase DB insertion for project_documents and document_versions
    expect(mockSupabaseAdmin.from).toHaveBeenCalledWith('project_documents');
    expect(mockSupabaseAdmin.from('project_documents').insert).toHaveBeenCalled();
    expect(mockSupabaseAdmin.from).toHaveBeenCalledWith('document_versions');
    expect(mockSupabaseAdmin.from('document_versions').insert).toHaveBeenCalled();

    expect(mockRes.status).toHaveBeenCalledWith(201);
  });

  it('POST with existing docId should update project_documents and insert document_version', async () => {
    const mockReq = {
      method: 'POST',
      query: {},
      body: {
        name: 'test_v2.txt',
        contentType: 'text/plain',
        base64Data: Buffer.from('hello v2').toString('base64'),
        projectId: 'project-123',
        docId: 'existing-doc-id' // Simulate updating an existing document
      }
    };

    await handler(mockReq as any, mockRes as any);

    expect(mockSupabaseAdmin.storage.upload).toHaveBeenCalled();
    expect(mockSupabaseAdmin.from).toHaveBeenCalledWith('project_documents');
    expect(mockSupabaseAdmin.from('project_documents').update).toHaveBeenCalled(); // Should call update on project_documents
    expect(mockSupabaseAdmin.from).toHaveBeenCalledWith('document_versions');
    expect(mockSupabaseAdmin.from('document_versions').insert).toHaveBeenCalled(); // Should call insert for the new version
    expect(mockRes.status).toHaveBeenCalledWith(201);
  });

  it('DELETE should remove from Supabase Storage and delete metadata', async () => {
    const mockReq = {
      method: 'DELETE',
      query: { id: 'doc-to-delete' },
      user: { role: 'Admin' } // Assuming role check passes
    };

    // Mocking Supabase to return metadata for document_versions
    // mockDocData is used here
    // Handler uses await on select().or().order()
    
    await handler(mockReq as any, mockRes as any);

    // Verify Supabase Storage removal call
    expect(mockSupabaseAdmin.storage.from).toHaveBeenCalledWith('project-files');
    expect(mockSupabaseAdmin.storage.remove).toHaveBeenCalled();

    // Verify Supabase DB delete calls
    expect(mockSupabaseAdmin.from).toHaveBeenCalledWith('document_versions');
    expect(mockSupabaseAdmin.from('document_versions').delete).toHaveBeenCalled(); // Check delete was called
    expect(mockSupabaseAdmin.from('document_versions').eq).toHaveBeenCalledWith('id', expect.any(String)); // Check eq was called
    
    expect(mockSupabaseAdmin.from).toHaveBeenCalledWith('project_documents');
    expect(mockSupabaseAdmin.from('project_documents').delete).toHaveBeenCalled(); // Check delete was called
    expect(mockSupabaseAdmin.from('project_documents').eq).toHaveBeenCalledWith('id', expect.any(String)); // Check eq was called

    expect(mockRes.status).toHaveBeenCalledWith(204);
  });

  it('GET should return 404 if file not found in DB', async () => {
    // Mocking Supabase to return no data for document_versions
    // This is handled by overriding the mockSelectPromise
    mockSelectPromise.mockResolvedValue({ data: [], error: null });
    
    const mockReq = {
      method: 'GET',
      query: { id: 'non-existent-doc' }
    };

    await handler(mockReq as any, mockRes as any);

    expect(mockRes.status).toHaveBeenCalledWith(404);
  });

  it('GET should return 500 if Supabase storage URL retrieval fails', async () => {
    // Mocking Supabase to return metadata for document_versions
    // mockDocData is used here
    // The select promise is handled by mockSelectPromise
    
    // Mocking getPublicUrl to fail
    mockSupabaseAdmin.storage.getPublicUrl.mockResolvedValue({ data: { publicUrl: null }, error: new Error('Storage error') });

    const mockReq = {
      method: 'GET',
      query: { id: 'doc-id-with-storage-error' }
    };

    await handler(mockReq as any, mockRes as any);

    expect(mockRes.status).toHaveBeenCalledWith(500);
  });

  it('DELETE should return 403 if user is not admin', async () => {
    const mockReq = {
      method: 'DELETE',
      query: { id: 'test-doc-id' },
      user: { role: 'User' } // Non-admin role
    };

    await handler(mockReq as any, mockRes as any);

    expect(mockRes.status).toHaveBeenCalledWith(403);
  });

  it('DELETE should handle storage removal errors gracefully but still delete metadata', async () => {
    // Mocking Supabase to return metadata for document_versions
    // mockDocData is used here
    // mockSelectPromise is used for the initial select
    mockSupabaseAdmin.from('document_versions').select().then.mockResolvedValue({ data: mockDocData, error: null });


    // Mock storage.remove to fail but DB delete to succeed
    mockSupabaseAdmin.storage.remove.mockResolvedValue({ data: null, error: new Error('Storage error') });

    const mockReq = {
      method: 'DELETE',
      query: { id: 'doc-id-with-storage-error' },
      user: { role: 'Admin' }
    };

    await handler(mockReq as any, mockRes as any);

    // Storage removal fails, but DB delete should still proceed
    expect(mockSupabaseAdmin.storage.remove).toHaveBeenCalled();
    // Check if delete operations were attempted on both tables
    expect(mockSupabaseAdmin.from).toHaveBeenCalledWith('document_versions');
    expect(mockSupabaseAdmin.from('document_versions').delete).toHaveBeenCalled();
    expect(mockSupabaseAdmin.from('document_versions').eq).toHaveBeenCalledWith('id', expect.any(String));

    expect(mockSupabaseAdmin.from).toHaveBeenCalledWith('project_documents');
    expect(mockSupabaseAdmin.from('project_documents').delete).toHaveBeenCalled();
    expect(mockSupabaseAdmin.from('project_documents').eq).toHaveBeenCalledWith('id', expect.any(String));
    
    expect(mockRes.status).toHaveBeenCalledWith(204); // Success in deleting metadata
  });
});
