# Supabase Local Development Setup

## Current Status
**Remote-first schema management**: Database schema lives in hosted Supabase project (`myroad_vite`).
- Created via Supabase Dashboard + `supabase db push`
- Local `migrations/` intentionally empty post-migration
- App connects via `VITE_SUPABASE_URL` env vars (remote)

## Why No SQL Files?
```
supabase/migrations/ → Empty (remote schema via dashboard)
supabase/seed.sql → Missing (referenced in config.toml)
scripts/clear_data.sql → Only utility script
```

## Local Development Workflow
```bash
# 1. Link CLI to remote project
supabase login
supabase link --project-ref myroad_vite

# 2. Dump remote schema to local (CREATE SQL FILES)
supabase db dump --db-url "postgresql://postgres:[PASSWORD]@db.[ref].supabase.co:5432/postgres" > migrations/0001_remote_schema.sql

# 3. Start local stack (uses config.toml + local files)
supabase start

# 4. Reset with migrations/seed (if populated)
supabase db reset
```

## Quick Fix: Populate Local Files
```bash
# Dump current remote schema
supabase db dump --linked > migrations/0001_initial_schema.sql

# Verify local API
curl http://localhost:54321/rest/v1/profiles?select=*
```

## Production vs Local
| Environment | Schema Source | Connection |
|-------------|---------------|------------|
| **Production** | Remote Supabase | `VITE_SUPABASE_URL` env vars |
| **Local Dev** | `supabase/migrations/` + `seed.sql` | `supabase start` (localhost:54321) |

## Next Steps
1. ✅ Create `seed.sql` (sample data)
2. 🔄 Dump remote schema → `migrations/`
3. ✅ Update TODO_SUPABASE_MIGRATION.md
4. 🧪 `supabase db reset` + test endpoints

**See TODO_SUPABASE_MIGRATION.md for migration status.**
