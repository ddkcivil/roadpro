# TODO: Fix localStorage and Supabase Database Sync Conflicts

## Problem Analysis

1. No version/timestamp tracking - changes are made locally without knowing if Supabase has newer data
2. Optimistic updates without conflict check - app updates UI optimistically but doesn't check remote changes
3. No cache invalidation after save - stale data persists in DataCache
4. No merge logic when IndexedDB and Supabase data differ on hydration
5. Sync queue lacks timestamp-based conflict resolution

## Fix Plan

- [x] 1. Add conflict detection in `apiService.updateProject` (fetch current state first)
- [x] 2. Add cache invalidation after successful save in `useProjects.saveProject`
- [x] 3. Add cache invalidation after delete in `useProjects.deleteProject`
- [x] 4. Always update `updated_at` timestamp on save
- [ ] 5. Improve `SyncService` to compare timestamps before processing

## Changes Made

1. **services/api/apiService.ts**:
   - Added conflict detection by fetching current `updated_at` before update
   - Compares local vs remote timestamps to detect potential conflicts
   - Always updates `updated_at` on save

2. **hooks/useProjects.ts**:
   - Added `DataCache.delete()` after successful `saveProject()`
   - Added `DataCache.delete()` after successful `deleteProject()`

## Status: COMPLETED (Partial)
