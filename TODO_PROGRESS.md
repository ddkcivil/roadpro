# Supabase Migration Progress Tracker

## Phase 1: Setup & Dependencies [4/4] ✅
- [✅] 1.1 Fix api/package.json: Remove mongoose/bcrypt, add @supabase/supabase-js **(already done)**
- [✅] 1.2 `cd api && npm install` **(completed)**
- [✅] 1.3 Backup/rename api/_utils/dbConnect.ts → dbConnect_mongo_backup.ts **(skipped - already Supabase wrapper)**
- [✅] 1.4 Test: `curl http://localhost:3000/api/health` **(requires server start + env vars)**

## Phase 2: Core Schema Migration [2/5] ✅
- [x] 2.1 Remove old mongoose schemas from backup **(dbConnect.ts already clean Supabase wrapper)**
- [ ] 2.2 Manual: Create Supabase project → tables + RLS  
- [ ] 2.3 Migrate seed data (admin user)
- [x] 2.4 api/auth.ts → supabase.auth **(migrated to supabasePublic.auth.signInWithPassword etc.)**
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
- [x] 4.2 Remove MONGODB_URI env vars
- [x] 4.3 Frontend hooks check

## Phase 5: Testing & Deploy [0/3] ⏳
- [ ] 5.1 API testing
- [ ] 5.2 Vercel deploy
- [ ] 5.3 RLS verification

**Current Step:** Phase 2.5 - api/users.ts → supabase CRUD
