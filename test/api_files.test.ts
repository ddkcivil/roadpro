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
  from: vi.fn().mockReturnThis(), // Mocking from('projects') or from('document_versions')
  select: vi.fn().mockReturnThis(),
  eq: vi.fn().mockReturnThis(),
  or: vi.fn().mockReturnThis(),
  order: vi.fn().mockReturnThis(),
  limit: vi.fn().mockReturnThis(),
  range: vi.fn().mockReturnThis(),
  single: vi.fn().mockReturnThis(),
  insert: vi.fn().mockResolvedValue({ data: [{ id: 'new-doc-id', versionId: 'new-ver-id' }], error: null }),
  update: vi.fn().mockReturnThis(),
  upsert: vi.fn().mockReturnThis(),
  delete: vi.fn().mockReturnThis(),
  // Mocking rpc for potential future use, although not directly used in files.ts GET/POST/DELETE
  rpc: vi.fn().mockReturnThis(),
  then: vi.fn()
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

    // Default mock behaviors - use mockReturnThis() for all chainable methods
    mockSupabaseAdmin.from.mockReturnThis();
    mockSupabaseAdmin.select.mockReturnThis();
    mockSupabaseAdmin.eq.mockReturnThis();
    mockSupabaseAdmin.or.mockReturnThis();
    mockSupabaseAdmin.order.mockReturnThis();
    mockSupabaseAdmin.limit.mockReturnThis();
    mockSupabaseAdmin.range.mockReturnThis();
    mockSupabaseAdmin.single.mockReturnThis();
    mockSupabaseAdmin.insert.mockReturnThis(); // Chainable
    mockSupabaseAdmin.update.mockReturnThis(); // Chainable
    mockSupabaseAdmin.delete.mockReturnThis(); // Chainable
    mockSupabaseAdmin.rpc.mockReturnThis();

    // For Supabase client, the chain usually ends with a promise (thenable).
    const defaultResponse = { data: null, error: null };
    mockSupabaseAdmin.then.mockImplementation((onSuccess: any) => Promise.resolve(defaultResponse).then(onSuccess));

    mockSupabaseAdmin.storage.from.mockReturnThis();
    mockSupabaseAdmin.storage.upload.mockResolvedValue({ data: { path: 'test.txt' }, error: null });
    mockSupabaseAdmin.storage.getPublicUrl.mockReturnValue({ data: { publicUrl: 'https://supabase.storage.url/files/test.txt' } });
    mockSupabaseAdmin.storage.remove.mockResolvedValue({ data: null, error: null });
  });

  it('GET should redirect to Supabase Storage URL', async () => {
    const mockReq = {
      method: 'GET',
      query: { id: 'doc-123' } // Simulating a doc ID that resolves to a file path
    };

    // Mocking Supabase to return metadata for document_versions
    const mockDocData = [{ blob_url: 'files/project-123/test.txt', doc_id: 'doc-123', id: 'ver-123', version_num: 1 }];
    mockSupabaseAdmin.then.mockImplementation((onSuccess: any) => Promise.resolve({ data: mockDocData, error: null }).then(onSuccess));

    await handler(mockReq as any, mockRes as any);
    expect(mockSupabaseAdmin.from).toHaveBeenCalledWith('document_versions');
    expect(mockSupabaseAdmin.select).toHaveBeenCalledWith('blob_url, doc_id, id, version_num');
    expect(mockSupabaseAdmin.or).toHaveBeenCalledWith(`doc_id.eq.doc-123,id.eq.doc-123`);
    expect(mockSupabaseAdmin.order).toHaveBeenCalledWith('version_num', { ascending: false });
    // expect(mockSupabaseAdmin.single).not.toHaveBeenCalled(); // Handler doesn't call single() on GET document_versions

    expect(mockSupabaseAdmin.storage.from).toHaveBeenCalledWith('project-files'); // Bucket name is project-files
    expect(mockSupabaseAdmin.storage.getPublicUrl).toHaveBeenCalledWith('files/project-123/test.txt'); 
    expect(mockRes.redirect).toHaveBeenCalledWith('https://supabase.storage.url/files/test.txt');
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

    // Mocking successful DB inserts
    mockSupabaseAdmin.then.mockImplementation((onSuccess: any) => Promise.resolve({ data: [{ id: 'doc-mock-uuid-123' }], error: null }).then(onSuccess));

    await handler(mockReq as any, mockRes as any);
    expect(mockSupabaseAdmin.storage.from).toHaveBeenCalledWith('project-files');
    expect(mockSupabaseAdmin.storage.upload).toHaveBeenCalled();
    
    // Verify Supabase DB insertion for project_documents and document_versions
    expect(mockSupabaseAdmin.from).toHaveBeenCalledWith('project_documents');
    expect(mockSupabaseAdmin.insert).toHaveBeenCalled(); // Check specific arguments if needed
    expect(mockSupabaseAdmin.from).toHaveBeenCalledWith('document_versions');
    expect(mockSupabaseAdmin.insert).toHaveBeenCalled(); // Check specific arguments if needed

    expect(mockRes.status).toHaveBeenCalledWith(201);
    expect(mockRes.json).toHaveBeenCalledWith(expect.objectContaining({
      name: 'test.txt',
      contentType: 'text/plain',
      url: expect.stringContaining('/api/files?id=doc-')
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

    // Mocking Supabase to return metadata for document_versions
    const mockDocData = [{ blob_url: 'files/project-123/test.txt', doc_id: 'doc-to-delete', id: 'ver-123', version_num: 1 }];
    mockSupabaseAdmin.then.mockImplementation((onSuccess: any) => Promise.resolve({ data: mockDocData, error: null }).then(onSuccess));

    await handler(mockReq as any, mockRes as any);

    // Verify Supabase Storage removal call
    expect(mockSupabaseAdmin.storage.from).toHaveBeenCalledWith('project-files');
    expect(mockSupabaseAdmin.storage.remove).toHaveBeenCalled(); 

    // Verify Supabase DB delete calls
    expect(mockSupabaseAdmin.from).toHaveBeenCalledWith('document_versions'); // Should delete versions first if no cascade
    expect(mockSupabaseAdmin.delete).toHaveBeenCalled(); 
    expect(mockSupabaseAdmin.from).toHaveBeenCalledWith('project_documents'); // Then delete main document
    expect(mockSupabaseAdmin.delete).toHaveBeenCalled(); 
    
    expect(mockRes.status).toHaveBeenCalledWith(204);
  });

  it('GET should return 404 if file not found in DB', async () => {
    // Mocking Supabase to return no data for document_versions
    mockSupabaseAdmin.then.mockImplementation((onSuccess: any) => Promise.resolve({ data: [], error: null }).then(onSuccess));
    
    const mockReq = {
      method: 'GET',
      query: { id: 'non-existent-doc' }
    };

    await handler(mockReq as any, mockRes as any);

    expect(mockRes.status).toHaveBeenCalledWith(404);
  });

  it('GET should return 500 if Supabase storage URL retrieval fails', async () => {
    // Mocking Supabase to return metadata for document_versions
    const mockDocData = [{ blob_url: 'files/test.txt', doc_id: 'doc-123', id: 'ver-123', version_num: 1 }];
    mockSupabaseAdmin.then.mockImplementation((onSuccess: any) => Promise.resolve({ data: mockDocData, error: null }).then(onSuccess));

    // Mocking getPublicUrl to fail
    mockSupabaseAdmin.storage.getPublicUrl.mockReturnValue({ data: { publicUrl: null }, error: new Error('Storage error') });
    
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
    const mockDocData = [{ blob_url: 'files/test.txt', doc_id: 'doc-123', id: 'ver-123', version_num: 1 }];
    mockSupabaseAdmin.then.mockImplementation((onSuccess: any) => Promise.resolve({ data: mockDocData, error: null }).then(onSuccess));

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

