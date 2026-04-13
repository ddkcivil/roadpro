# MyRoad Vite - Supabase Migration TODO

## Phase 1: Setup & Dependencies [4/4] ✅
- [x] Update api/package.json
- [x] Run `cd api && npm install` 
- [x] Create api/_utils/supabaseClient.ts
- [x] Test connection: `curl http://localhost:3000/api/health`

## Phase 2: Core Schema Migration [5/5] ✅
- [x] Convert api/_utils/dbConnect.ts
- [x] Create Supabase project/tables/RLS policies
- [x] Migrate seed data
- [x] Update api/auth.ts
- [x] Update api/users.ts

## Phase 3: Main API Routes [6/6] ✅
- [x] api/projects.ts
- [x] api/roads.ts
- [x] api/audit.ts
- [x] api/messages.ts
- [x] api/registrations.ts
- [x] api/staff/index.ts

## Phase 4: Supporting Routes + Features [4/4] ✅
- [x] api/files.ts
- [x] api/health.ts
- [x] Remove MONGODB_URI env vars
- [x] Update frontend hooks/services

## Phase 5: Testing & Deploy [0/3] ⏳
- [ ] 5.1 Test all endpoints with Postman/cURL
- [ ] 5.2 Deploy to Vercel with SUPABASE_* env vars
- [ ] 5.3 Verify RLS policies + permissions
