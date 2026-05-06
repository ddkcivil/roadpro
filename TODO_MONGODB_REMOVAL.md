# MongoDB Removal & Migration Plan

## Tasks

- [x] 1. Update `api/registrations.ts` - Move registrations storage from MongoDB to Supabase
- [x] 2. Update `api/utils/mongoAuth.ts` - Keep password utilities only (no MongoDB import)
- [x] 3. Update `docker-compose.yml` - Remove MongoDB service
- [x] 4. Update `api/package.json` - Remove mongodb dependency (for API)
- [x] 5. Update root `package.json` - Remove mongodb, mongoose, saslprep
- [x] 6. Update vitest.config.ts - Remove MongoDB env vars

## Status: ✅ Completed

## Notes
- User confirmed to proceed with migration
- Supabase already has `registrations` table defined in schema.sql
- Migrating from MongoDB collections (`registrations`, `users`) to Supabase tables
