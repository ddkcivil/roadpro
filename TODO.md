# Documents Hub Database Migration TODO

## Status: In Progress

### 1. Dependencies & Setup [x]
- [x] Update api/package.json: Add @vercel/blob, @vercel/postgres, pg
- [x] Run `cd api && npm install` (Note: @vercel/postgres deprecated, uses Neon underhood)
- [ ] Setup Vercel Postgres DB (via dashboard/cli)
- [ ] Add POSTGRES_URL to Vercel env vars

### 2. Database Schema [x]
- [x] api/_utils/dbConnect.ts: Add Postgres client, create tables (documents, document_versions)
  - documents: id, project_id, name, folder, tags[], subject, refNo, size, type, status, created_at, etc. (JSONB metadata)
  - document_versions: id, doc_id, blob_token/path, version_num, uploaded_at, size, notes

### 3. API Updates [x]
- [x] Rewrite api/files.ts: 
  - POST: Blob.put() → store metadata/token in Postgres → return blob URL/token
  - GET: Query Postgres for token → generate blob GET URL
  - DELETE: Blob.delete() + Postgres row delete

### 4. Frontend Updates [x]
- [x] types.ts: Update ProjectDocument with blob_token, versions[]
- [x] DocumentsModule.tsx: Use blob URLs for preview/download, handle token refresh

### 5. Testing [x]
- [x] Test upload (multi-file, OCR) - Verified via Vitest integration tests
- [x] Test preview (PDF/image) - Verified via Vitest integration tests (redirect logic)
- [x] Test versioning/download/delete - Verified via Vitest integration tests
- [ ] Migrate sample data?

### 6. Cleanup [ ]
- [ ] Deprecate Mongo IFile/FileStore?
- [ ] Update vercel.json if needed

**Next Step: Step 6 - Cleanup & Deployment**
