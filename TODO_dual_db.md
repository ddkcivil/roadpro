# Dual DB Integration: MongoDB (auth/users/registrations) + Supabase (rest)

## Steps

### Phase 1: Dependencies & Clients
- [x] Install MongoDB deps: `npm i mongodb bcryptjs jsonwebtoken @types/bcryptjs @types/jsonwebtoken`
- [x] Create `lib/mongodb.ts` (Mongo client + mock fallback)
- [x] Create `lib/mongodbMock.ts`

### Phase 2: Custom Auth System
- [x] Read & update `api/_utils/auth.ts` (custom JWT middleware)
- [x] Create `api/_utils/mongoAuth.ts` (signIn, signUp helpers)
- [x] Update `api/_utils/mappers.ts` (added mapping functions)
- [x] Create `api/auth.ts` (login/logout endpoints)

### Phase 3: Refactor APIs
- [x] Refactor `api/users.ts` -> Mongo users collection + custom auth
- [x] Refactor `api/registrations.ts` -> Mongo registrations
- [x] Deprecate Supabase auth in these files

### Phase 4: Config & Testing
- [x] Add env vars to .env.example (MONGODB_URI, JWT_SECRET)
- [x] Create `docker-compose.yml` (added MongoDB service)
- [x] Test API server: `npx tsx api/server.mjs`
- [x] Update frontend auth (hooks/useAuth.tsx, Login.tsx, RealApiService.ts)
- [x] Update core API tests (`api_users`, `api_registrations`, `Login.test.tsx`, `api_projects.test.ts`)

### Phase 5: Migration & Cleanup
- [x] Create migration script: supabase users -> Mongo (`scripts/migrate_to_mongo.ts`)
- [ ] Remove Supabase profiles/users tables if safe (Final cleanup step)
- [ ] Fix remaining integration and service tests (`App.test.tsx`, `roadManager.test.ts`, `roadTypes.test.ts`, `MapModule.test.tsx`)

**Current Progress:** Backend refactor complete. Core API and basic component tests passing. Remaining integration and service tests pending fixes.
