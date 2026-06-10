# TODO: Fix Vercel Log Issues

## Issues Identified from Vercel Logs

1. **Warning**: `[GET Project] Could not fetch project_kml: Could not find the table 'public.project_kml' in the schema cache`
2. **500 Errors**: Multiple PUT requests to `/api/projects` failing with 500 status codes

## Root Cause

- The `project_kml` table doesn't exist in the Supabase schema
- The API code attempts to query/update this table which causes errors
- Missing `.catch()` handler for Promise-based KML sync in PUT handler

## Plan & Status

### ✅ Step 1: Create SQL Migration for project_kml table
- **File**: `supabase/migrations/20260712000000_add_project_kml_table.sql`
- Creates the `project_kml` table with proper schema
- Adds RLS policies
- Notifies schema reload

### ✅ Step 2: Update API code error handling  
- **File**: `api/projects.ts`
- Added `.catch()` handler to the KML sync Promise chain
- Improved error logging messages

### ⏳ Step 3: Deploy and verify
- Run the SQL migration in Supabase dashboard
- Deploy changes to Vercel
- Check new logs for resolution

## Summary of Changes

1. **Migration file created**: Adds the missing `project_kml` table
2. **API error handling improved**: Handles missing table more gracefully

## Next Steps

1. Run this SQL in your Supabase SQL Editor:
   ```sql
   -- Run the migration file content from:
   -- supabase/migrations/20260712000000_add_project_kml_table.sql
   ```

2. Deploy the updated API to Vercel

3. Monitor new logs to verify the fixes are working
