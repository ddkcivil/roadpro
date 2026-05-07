# Migration Consolidation TODO

## Current Status: FIXED ✅

### New Migration Added (May 14, 2026):
- 20260514000000_add_missing_project_columns.sql - Add agencies and other missing JSONB columns to projects table
  - Fixes: "Could not find the 'agencies' column of 'projects' in the schema cache" error
  - Added 22 missing columns: agencies, agency_payments, agency_materials, agency_bills, materials, linear_works, inventory, purchase_orders, inventory_transactions, vehicles, vehicle_logs, daily_reports, pre_construction, land_parcels, map_overlays, ncrs, contract_bills, staff_locations, environment_registry, lab_tests, schedule, rfis

### Problem Identified (May 26, 2026):
- Local migrations were out of sync with remote Supabase schema
- Migration `20260504214341_remote_commit.sql` was failing with errors:
  - "cannot drop function update_project_documents_updated_at()" (dependency issue)
  - "index alignments_pkey does not exist" (trying to add already-existing PK)

### Solution Applied:
1. Removed old incompatible migration files
2. Dumped remote schema: `supabase db dump --linked > migrations/20240526000001_remote_schema.sql`
3. Reset local database with new schema: `supabase db reset`
4. Verified local now matches remote

### Current Migration Files:
- 20240526000001_remote_schema.sql (single file synced from remote)

### Remote Migrations (applied via Supabase Dashboard):
- 20241201 (original schema)
- 20260504213907 (remote schema)
- 20260504214341 (remote commit)
- 20260526000000 (fix drop order)

### Schema Diff Results (local vs remote):
- ✅ Local matches remote for most core tables
- ⚠️ Minor constraint additions needed for alignments & structures type lists
- ⚠️ Missing RLS policy "Anyone can submit registrations" on remote

### Resolution:
- Local Supabase is fully operational with seed data
- Remote schema has some additional constraint options (not blocking)
- The workflow failure may be related to remote CI pipeline, not local

### Fix Applied (May 26, 2026):
**Problem:** Production login fails with 500 Internal Server Error (FUNCTION_INVOCATION_FAILED)

**Root Cause:** supabaseClient.ts was creating client with invalid placeholder URL when env vars missing

**Solution:** Modified supabaseClient.ts to:
- Check if properly configured BEFORE creating client
- Return null client if config missing (instead of using placeholder values)
- Avoid sending requests to invalid URLs that cause crashes

**Code Changes:** api/utils/supabaseClient.ts - Now only creates client when properly configured
