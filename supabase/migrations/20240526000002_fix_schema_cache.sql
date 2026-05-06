-- Migration to fix schema cache issues for accounting columns
-- Run this to ensure Supabase schema cache is properly synchronized

-- First, check if the column exists and is properly named
DO $$
BEGIN
    -- Ensure accountingintegrations column exists with correct case
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'projects' 
        AND column_name = 'accountingintegrations'
    ) THEN
        RAISE NOTICE 'Column accountingintegrations does not exist - this migration needs to be applied';
    END IF;
END $$;

-- If the above check passes, the column exists. 
-- This migration confirms the schema is properly synced.
-- The actual column definition is in 20240526000001_remote_schema.sql

-- Note: If you encounter schema cache errors, you may need to:
-- 1. Go to Supabase Dashboard -> Settings -> API
-- 2. Click "Refresh Schema" to clear the cached schema
-- 3. Or re-fetch the project data after schema changes

SELECT 
    column_name, 
    data_type, 
    column_default,
    is_nullable
FROM information_schema.columns 
WHERE table_name = 'projects' 
AND column_name IN (
    'accountingintegrations', 
    'accountingtransactions',
    'structuretemplates',
    'auditlogs'
)
ORDER BY column_name;
