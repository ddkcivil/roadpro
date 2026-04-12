# MyRoad Vite - Supabase Migration TODO

## Phase 1: Setup & Dependencies [4/4] ✅
- [x] Fix api/package.json: Remove mongoose/bcrypt, add @supabase/supabase-js
- [x] `cd api && npm install`
- [x] Backup/rename api/_utils/dbConnect.ts → dbConnect_mongo_backup.ts
- [x] Test: `curl http://localhost:3000/api/health` (pending env vars)

## Phase 2: Core Schema Migration [0/5] ⏳
- [ ] 2.1 Remove old mongoose schemas from backup/api/_utils/dbConnect.ts
- [ ] 2.2 **MANUAL**: Create Supabase project → tables + RLS
- [ ] 2.3 **MANUAL**: Migrate seed data (admin user)
- [ ] 2.4 api/auth.ts → supabase.auth
- [ ] 2.5 api/users.ts → supabase CRUD

## Phase 3: Main API Routes [0/6] ⏳
- [x] 3.1 api/projects.ts
- [ ] 3.2 api/roads.ts
- [ ] 3.3 api/audit.ts
- [ ] 3.4 api/messages.ts
- [ ] 3.5 api/registrations.ts
- [ ] 3.6 api/staff/index.ts

## Phase 4: Supporting Routes [0/4] ⏳
- [x] 4.1 api/files.ts (Storage)
- [x] 4.2 api/health.ts (Supabase status)
- [x] 4.3 Remove MONGODB_URI env vars
- [x] 4.4 Frontend hooks check

## Phase 5: Testing & Deploy [0/3] ⏳
- [ ] 5.1 API testing
- [ ] 5.2 Vercel deploy
- [ ] 5.3 RLS verification

**Current Step:** Phase 2.1 - Clean mongoose from dbConnect.ts
**Note:** Manual Supabase setup (2.2-2.3) required before code migrations.
