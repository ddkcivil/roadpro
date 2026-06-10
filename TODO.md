# Environment Mismatch Fix - TODO

## Task
Fix environment variable mismatches between frontend (Vite) and backend (Express API)

## Steps

- [x] 1. Update vite.config.ts to add SUPABASE_URL and SUPABASE_ANON_KEY fallbacks
- [x] 2. Update .env.example with complete variable documentation
- [x] 3. Verify the fixes work correctly

## Details

### Problem Identified
1. Frontend expects: VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY, NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY
2. Backend expects: SUPABASE_URL, SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY
3. Variable name mismatch causes configuration failures

### Solution
Update vite.config.ts define block to include fallback variables that match backend expectations

### Note
Build has a pre-existing error about missing sqliteService module (unrelated to env variables).
