-- Script to refresh PostgREST schema cache
-- This notifies Supabase to reload the schema cache so it recognizes all new columns including 'lab_tests'

-- Notify PostgREST to reload the schema cache
NOTIFY pgrst, 'reload schema';

-- Wait a moment for the cache to refresh
SELECT pg_sleep(1);

-- Verify lab_tests column is now visible
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'projects' 
  AND column_name = 'lab_tests';

-- Confirm status
SELECT 'Schema cache refreshed successfully!' as status;
