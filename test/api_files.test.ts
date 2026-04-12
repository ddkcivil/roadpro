import { describe, it, expect, vi, beforeEach } from 'vitest';
import handler from '../api/files';
import { Buffer } from 'buffer'; // Needed for POST request body

// Mock Supabase client and its methods
vi.mock('../_utils/supabaseClient.js', () => ({
  supabaseAdmin: {
    storage: {
      from: vi.fn().mockReturnThis(), // Mocking from('files')
      upload: vi.fn().mockResolvedValue({ data: { publicUrl: 'https://supabase.storage.url/files/test.txt' }, error: null }),
      getPublicUrl: vi.fn().mockResolvedValue({ data: { publicUrl: 'https://supabase.storage.url/files/test.txt' }, error: null }),
      remove: vi.fn().mockResolvedValue({ data: null, error: null }),
    },
    from: vi.fn().mockReturnThis(), // Mocking from('projects') or from('document_versions')
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    order: vi.fn().mockReturnThis(),
    limit: vi.fn().mockReturnThis(),
    range: vi.fn().mockReturnThis(),
    single: vi.fn().mockReturnThis(),
    insert: vi.fn().mockResolvedValue({ data: [{ id: 'new-doc-id', versionId: 'new-ver-id' }], error: null }),
    update: vi.fn().mockResolvedValue({ data: [{ id: 'updated-doc-id' }], error: null }),
    delete: vi.fn().mockResolvedValue({ error: null }),
    // Mocking rpc for potential future use, although not directly used in files.ts GET/POST/DELETE
    rpc: vi.fn().mockReturnThis(),
  }
}));

// Mock external utilities that might still be used
vi.mock('../api/_utils/auth.js', () => ({ withAuth: (h: any) => h }));
vi.mock('../api/_utils/errorHandler.js', () => ({ withErrorHandler: (h: any) => h }));
vi.mock('uuid', () => ({ v4: vi.fn(() => 'mock-uuid-123') })); // Mock uuidv4

describe('api/files handler with Supabase', () => {
  let mockRes: any;
  // Re-mock supabaseAdmin methods before each test to ensure isolation
  let mockSupabaseAdmin: any;

  beforeEach(() => {
    vi.clearAllMocks();
    mockRes = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn().mockReturnThis(),
      redirect: vi.fn().mockReturnThis(),
      setHeader: vi.fn().mockReturnThis(),
      send: vi.fn().mockReturnThis(),
      end: vi.fn().mockReturnThis()
    };

    // Mocking methods directly from the imported supabaseAdmin object
    mockSupabaseAdmin = {
      storage: {
        from: vi.fn().mockReturnThis(),
        upload: vi.fn().mockResolvedValue({ data: { publicUrl: 'https://supabase.storage.url/files/project-123/test.txt' }, error: null }),
        getPublicUrl: vi.fn().mockResolvedValue({ data: { publicUrl: 'https://supabase.Lstorage.url/files/project-123/test.txt' }, error: null }),
        remove: vi.fn().mockResolvedValue({ data: null, error: null }),
      },
      from: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      limit: vi.fn().mockReturnThis(),
      range: vi.fn().mockReturnThis(),
      single: vi.fn().mockReturnThis(),
      insert: vi.fn().mockResolvedValue({ data: [{ id: 'new-doc-id', versionId: 'new-ver-id' }], error: null }),
      update: vi.fn().mockResolvedValue({ data: [{ id: 'updated-doc-id' }], error: null }),
      delete: vi.fn().mockResolvedValue({ error: null }),
      rpc: vi.fn().mockReturnThis(),
    };
    vi.mocked(supabaseAdmin).mockReturnValue(mockSupabaseAdmin); // This line won't work as supabaseAdmin is imported directly. Need to mock the module properly.
    
    // Correct way to mock imported objects:
    // Need to access the mocked functions for assertions
    const { supabaseAdmin: mockedSupabaseAdmin } = await import('../_utils/supabaseClient.js');
    vi.mocked(mockedSupabaseAdmin.storage.from).mockReturnThis();
    vi.mocked(mockedSupabaseAdmin.storage.upload).mockResolvedValue({ data: { publicUrl: 'https://supabase.storage.url/files/project-123/test.txt' }, error: null });
    vi.mocked(mockedSupabaseAdmin.storage.getPublicUrl).mockResolvedValue({ data: { publicUrl: 'https://supabase.storage.url/files/project-123/test.txt' }, error: null });
    vi.mocked(mockedSupabaseAdmin.storage.remove).mockResolvedValue({ data: null, error: null });
    vi.mocked(mockedSupabaseAdmin.from).mockReturnThis();
    vi.mocked(mockedSupabaseAdmin.select).mockReturnThis();
    vi.mocked(mockedSupabaseAdmin.eq).mockReturnThis();
    vi.mocked(mockedSupabaseAdmin.order).mockReturnThis();
    vi.mocked(mockedSupabaseAdmin.limit).mockReturnThis();
    vi.mocked(mockedSupabaseAdmin.range).mockReturnThis();
    vi.mocked(mockedSupabaseAdmin.single).mockReturnThis();
    vi.mocked(mockedSupabaseAdmin.insert).mockResolvedValue({ data: [{ id: 'new-doc-id', versionId: 'new-ver-id' }], error: null });
    vi.mocked(mockedSupabaseAdmin.update).mockResolvedValue({ data: [{ id: 'updated-doc-id' }], error: null });
    vi.mocked(mockedSupabaseAdmin.delete).mockResolvedValue({ error: null });
  });

  it('GET should redirect to Supabase Storage URL', async () => {
    const mockReq = {
      method: 'GET',
      query: { id: 'doc-123' } // Simulating a doc ID that resolves to a file path
    };

    await handler(mockReq as any, mockRes as any);

    // Expecting a redirect to the public URL obtained from Supabase Storage
    expect(mockSupabaseAdmin.from).toHaveBeenCalledWith('document_versions');
    expect(mockSupabaseAdmin.select).toHaveBeenCalledWith('blob_url, doc_id, id, version_num');
    expect(mockSupabaseAdmin.or).toHaveBeenCalledWith(`doc_id.eq.doc-123,id.eq.doc-123`);
    expect(mockSupabaseAdmin.order).toHaveBeenCalledWith('version_num', { ascending: false });
    expect(mockSupabaseAdmin.single).toHaveBeenCalled();

    expect(mockSupabaseAdmin.storage.from).toHaveBeenCalledWith('files'); // Assuming bucket name is 'files'
    expect(mockSupabaseAdmin.storage.getPublicUrl).toHaveBeenCalledWith('files/project-123/test.txt'); // Path depends on how it's stored
    expect(mockRes.redirect).toHaveBeenCalledWith('https://supabase.storage.url/files/project-123/test.txt');
  });

  it('POST should upload file to Supabase Storage and save metadata', async () => {
    const mockReq = {
      method: 'POST',
      query: {},
      body: {
        name: 'test.txt',
        contentType: 'text/plain',
        base64Data: Buffer.from('hello').toString('base64'),
        projectId: 'project-123',
        folder: 'docs' // Example folder structure
      }
    };

    await handler(mockReq as any, mockRes as any);

    // Verify Supabase Storage upload call
    expect(mockSupabaseAdmin.storage.from).toHaveBeenCalledWith('files');
    expect(mockSupabaseAdmin.storage.upload).toHaveBeenCalledWith('docs/test.txt', Buffer.from('hello'), { contentType: 'text/plain', upsert: true });
    
    // Verify Supabase DB insertion for project_documents and document_versions
    expect(mockSupabaseAdmin.from).toHaveBeenCalledWith('project_documents');
    expect(mockSupabaseAdmin.insert).toHaveBeenCalled(); // Check specific arguments if needed
    expect(mockSupabaseAdmin.from).toHaveBeenCalledWith('document_versions');
    expect(mockSupabaseAdmin.insert).toHaveBeenCalled(); // Check specific arguments if needed

    expect(mockRes.status).toHaveBeenCalledWith(201);
    expect(mockRes.json).toHaveBeenCalledWith(expect.objectContaining({
      name: 'test.txt',
      contentType: 'text/plain',
      url: '/api/files?id=doc-mock-uuid-123' // Assuming docId is generated
    }));
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
    expect(mockSupabaseAdmin.update).toHaveBeenCalled(); // Should call update on project_documents
    expect(mockSupabaseAdmin.from).toHaveBeenCalledWith('document_versions');
    expect(mockSupabaseAdmin.insert).toHaveBeenCalled(); // Should call insert for the new version
    expect(mockRes.status).toHaveBeenCalledWith(201);
  });

  it('DELETE should remove from Supabase Storage and delete metadata', async () => {
    const mockReq = {
      method: 'DELETE',
      query: { id: 'doc-to-delete' },
      user: { role: 'Admin' } // Assuming role check passes
    };

    await handler(mockReq as any, mockRes as any);

    // Verify Supabase Storage removal call
    expect(mockSupabaseAdmin.storage.from).toHaveBeenCalledWith('files');
    expect(mockSupabaseAdmin.storage.remove).toHaveBeenCalledWith(['files/project-123/test.txt']); // Assuming this path was fetched

    // Verify Supabase DB delete calls
    expect(mockSupabaseAdmin.from).toHaveBeenCalledWith('document_versions'); // Should delete versions first if no cascade
    expect(mockSupabaseAdmin.delete).toHaveBeenCalled(); 
    expect(mockSupabaseAdmin.from).toHaveBeenCalledWith('project_documents'); // Then delete main document
    expect(mockSupabaseAdmin.delete).toHaveBeenCalled(); 
    
    expect(mockRes.status).toHaveBeenCalledWith(204);
  });

  it('GET should return 404 if file not found in DB', async () => {
    // Mocking Supabase to return no data for document_versions
    mockSupabaseAdmin.from('document_versions').select().or().order().limit().range().single().mockResolvedValue({ data: null, error: null });
    
    const mockReq = {
      method: 'GET',
      query: { id: 'non-existent-doc' }
    };

    await handler(mockReq as any, mockRes as any);

    expect(mockRes.status).toHaveBeenCalledWith(404);
  });

  it('GET should return 500 if Supabase storage URL retrieval fails', async () => {
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
    expect(mockSupabaseAdmin.from).toHaveBeenCalledWith('document_versions');
    expect(mockSupabaseAdmin.delete).toHaveBeenCalled(); // Should attempt DB delete
    expect(mockRes.status).toHaveBeenCalledWith(204); // Success in deleting metadata
  });
});
