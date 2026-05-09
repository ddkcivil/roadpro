# Project CRUD Verification Plan

This document outlines the verification steps to confirm the implementation works correctly.

## Implementation Summary

### 1. Project Creation
- **Frontend**: `hooks/useProjects.ts` → `saveProject()` performs optimistic update
- **Backend**: `api/projects.ts` → POST endpoint
- **Storage**: Supabase `projects` table via upsert
- **Audit**: `AuditService.logDataModification()`

### 2. Project Deletion  
- **Frontend**: `hooks/useProjects.ts` → `deleteProject()` removes optimistically
- **File Cleanup**: `realApiService.deleteProject()` deletes files first (errors propagate)
- **Backend**: DELETE endpoints in `api/files.ts` and `api/projects.ts`
- **Rollback**: UI restores previous state on error

## Verification Checklist

### Creation Tests
- [ ] 1. Create project with valid details → appears immediately in UI
- [ ] 2. Verify in Supabase `projects` table → new record exists
- [ ] 3. Refresh/navigate → project persists correctly
- [ ] 4. Create without required fields → error message displayed

### Deletion Tests
- [ ] 1. Create project with files
- [ ] 2. Delete project → removed from UI immediately
- [ ] 3. Verify in Supabase → project record deleted
- [ ] 4. Verify storage → files removed from Supabase Storage
- [ ] 5. Verify metadata → project_documents/project_site_photos deleted

### Error Handling Tests
- [ ] 1. Missing required fields → appropriate error
- [ ] 2. File deletion failure → project NOT deleted, rollback applied
- [ ] 3. Network error → changes kept locally with error message

## Code References

### Frontend Optimistic Update
- `hooks/useProjects.ts:170-252` - saveProject with optimistic update
- `hooks/useProjects.ts:265-312` - deleteProject with optimistic update

### Backend Implementation
- `api/projects.ts:89-165` - POST /api/projects
- `api/projects.ts:252-284` - DELETE /api/projects
- `api/files.ts:162-203` - DELETE /api/files with error throwing

### File Cleanup Logic
- `services/api/realApiService.ts:175-203` - deletes files before project
