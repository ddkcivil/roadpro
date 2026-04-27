# Dual DB Integration Progress Tracker

## Approved Plan Steps

### Phase 1: Dependencies & Clients
- [x] Install MongoDB deps (already in package.json)
- [x] lib/mongodb.ts (complete)
- [x] lib/mongodbMock.ts (complete)

### Phase 2: Custom Auth System
- [x] Fix imports in api/_utils/auth.ts (mongoAuth.js → .ts)
- [x] Create api/_utils/mappers.ts (user mapping)
- [x] Verify/create api/_utils/errorHandler.ts

### Phase 3: Refactor APIs
- [ ] Refactor api/users.ts → full Mongo users + custom auth (remove Supabase)
- [ ] Refactor api/registrations.ts → Mongo registrations (remove Supabase auth/profiles)

### Phase 4: Config & Testing
- [ ] Add env vars to .env.example (MONGODB_URI, JWT_SECRET)
- [ ] Update/create docker-compose.yml (add MongoDB service)
- [ ] Test API: npm run dev:api

### Phase 5: Migration & Cleanup
- [ ] Create migration script: Supabase → Mongo
- [ ] Update tests (api_users.test.ts, api_registrations.test.ts)
- [ ] Check/update frontend hooks/useAuth.tsx

**Next Step:** Phase 3 - Refactor api/users.ts
