import { describe, it, expect, vi, beforeEach } from 'vitest';
import handler from '../api/files';
import { sql } from '@vercel/postgres';

// Mock dependencies
vi.mock('@vercel/blob', () => ({
  put: vi.fn().mockResolvedValue({ url: 'https://blob.url/test.txt' }),
  del: vi.fn().mockResolvedValue({})
}));

vi.mock('@vercel/postgres', () => ({
  sql: vi.fn().mockImplementation(async (strings, ...values) => {
    const query = typeof strings === 'string' ? strings : strings.join('');
    // Extract ID if possible from values
    const idParam = values?.[0];
    
    if (query.includes('SELECT blob_url FROM document_versions') && idParam === 'test-doc-id') {
      return { rows: [{ blob_url: 'https://blob.url/test.txt' }] };
    }
    if (query.includes('SELECT COUNT(*)')) {
      return { rows: [{ count: '1' }] };
    }
    return { rows: [], rowCount: 1 };
  })
}));

vi.mock('../api/_utils/dbConnect.js', () => ({
  connectToDatabase: vi.fn().mockResolvedValue({
    FileStore: {
      findOne: vi.fn().mockReturnValue({
        lean: vi.fn().mockResolvedValue({
          id: 'legacy-id',
          contentType: 'text/plain',
          size: 100,
          data: Buffer.from('legacy data')
        })
      }),
      deleteOne: vi.fn().mockResolvedValue({})
    }
  })
}));

vi.mock('../api/_utils/auth.js', () => ({
  withAuth: (h: any) => h
}));

vi.mock('../api/_utils/errorHandler.js', () => ({
  withErrorHandler: (h: any) => h
}));

describe('api/files handler', () => {
  let mockRes: any;

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
  });

  it('GET should redirect to blob URL from Postgres', async () => {
    const mockReq = {
      method: 'GET',
      query: { id: 'test-doc-id' }
    };

    await handler(mockReq as any, mockRes as any);

    expect(mockRes.redirect).toHaveBeenCalledWith('https://blob.url/test.txt');
  });
it('POST should upload to blob and save to Postgres', async () => {
  const mockReq = {
    method: 'POST',
    query: {},
    body: {
      name: 'test.txt',
      contentType: 'text/plain',
      base64Data: Buffer.from('hello').toString('base64'),
      projectId: 'project-123'
    }
  };

  await handler(mockReq as any, mockRes as any);

  expect(mockRes.status).toHaveBeenCalledWith(201);
  expect(mockRes.json).toHaveBeenCalledWith(expect.objectContaining({
    name: 'test.txt',
    blobUrl: 'https://blob.url/test.txt'
  }));
});

it('POST with docId should create a new version', async () => {
  const mockReq = {
    method: 'POST',
    query: {},
    body: {
      name: 'test_v2.txt',
      contentType: 'text/plain',
      base64Data: Buffer.from('hello v2').toString('base64'),
      docId: 'existing-doc-id'
    }
  };

  await handler(mockReq as any, mockRes as any);

  expect(mockRes.status).toHaveBeenCalledWith(201);
  expect(sql).toHaveBeenCalled();
});


  it('DELETE should remove from Postgres and Blobs', async () => {
    const mockReq = {
      method: 'DELETE',
      query: { id: 'test-doc-id' },
      user: { role: 'Admin' }
    };

    await handler(mockReq as any, mockRes as any);

    expect(mockRes.status).toHaveBeenCalledWith(204);
  });

  it('GET should fallback to MongoDB for legacy files', async () => {
    const mockReq = {
      method: 'GET',
      query: { id: 'legacy-id' }
    };

    // sql mock returns empty for anything not matching doc_id/version logic
    // We need to ensure it doesn't match the current doc_id pattern if we want it to fail
    
    await handler(mockReq as any, mockRes as any);

    expect(mockRes.status).toHaveBeenCalledWith(200);
    expect(mockRes.send).toHaveBeenCalled();
  });
});
