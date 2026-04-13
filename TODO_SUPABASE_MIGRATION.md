# Supabase Migration TODO

## Phase 1: Setup & Dependencies [4/4] ✅
- [x] Update api/package.json (remove mongoose/bcrypt, add @supabase/supabase-js)
- [x] Run `cd api && npm install` 
- [x] Create api/_utils/supabaseClient.ts (replace dbConnect.ts)
- [x] Test connection: `curl http://localhost:3000/api/health`

## Phase 2: Core Schema Migration [5/5] ✅
- [x] Convert api/_utils/dbConnect.ts → backup + remove mongoose schemas
- [x] Create Supabase project/tables/RLS policies (See supabase/migrations/)
- [x] Migrate seed data (handled via registrations/auth)
- [x] Update api/auth.ts (supabase.auth)
- [x] Update api/users.ts (CRUD operations)

## Phase 3: Main API Routes [6/6] ✅
- [x] api/projects.ts (convert find/save/update → supabase queries)
- [x] api/roads.ts (KML ingestion via RPC)
- [x] api/audit.ts (Supabase logging)
- [x] api/messages.ts (Chat storage)
- [x] api/registrations.ts (User approval flow)
- [x] api/staff/index.ts (JSONB personnel management)

## Phase 4: Supporting Routes + Features [4/4] ✅
- [x] api/files.ts (Supabase Storage)
- [x] api/health.ts (Supabase status check)
- [x] Remove MONGODB_URI env vars
- [x] Update frontend hooks/services (use id instead of _id)

## Phase 5: Testing & Deploy [0/3]
- [ ] Test all endpoints with Postman/cURL
- [ ] Deploy to Vercel with SUPABASE_* env vars
- [ ] Verify RLS policies + permissions

**Current Status:** All core backend migrations are complete. The database schema is defined in `supabase/migrations/` with full camelCase support for project data. Authentication has been hardened to use the `profiles` table as the source of truth for roles.

**Next Step:** Perform integration testing across all modules.
