# Supabase Migration TODO

## Phase 1: Setup & Dependencies [4/4] ✅
- [x] Update api/package.json (remove mongoose/bcrypt, add @supabase/supabase-js)
- [x] Run `cd api && npm install` 
- [x] Create api/_utils/supabaseClient.ts (replace dbConnect.ts)
- [x] Test connection: `curl http://localhost:3000/api/health`

## Phase 2: Core Schema Migration [0/5]
- [ ] Convert api/_utils/dbConnect.ts → backup + remove mongoose schemas
- [ ] Create Supabase project/tables/RLS policies
- [ ] Migrate seed data (admin user)
- [ ] Update api/auth.ts (supabase.auth)
- [ ] Update api/users.ts (CRUD operations)

## Phase 3: Main API Routes [0/6]
- [x] api/projects.ts (convert find/save/update → supabase queries)
- [ ] api/roads.ts 
- [ ] api/audit.ts
- [ ] api/messages.ts
- [ ] api/registrations.ts
- [ ] api/staff/index.ts

## Phase 4: Supporting Routes + Features [0/4]
- [x] api/files.ts (Supabase Storage)
- [x] api/health.ts (Supabase status check)
- [x] Remove MONGODB_URI env vars
- [x] Update frontend hooks/services if needed

## Phase 5: Testing & Deploy [0/3]
- [ ] Test all endpoints with Postman/cURL
- [ ] Deploy to Vercel with SUPABASE_* env vars
- [ ] Verify RLS policies + permissions

**Next Step:** Create Supabase project at https://supabase.com, add required env vars to Vercel dashboard:
- NEXT_PUBLIC_SUPABASE_URL
- NEXT_PUBLIC_SUPABASE_ANON_KEY  
- SUPABASE_SERVICE_ROLE_KEY

Then Phase 2: Create tables (profiles, projects, etc.) + seed admin user.
