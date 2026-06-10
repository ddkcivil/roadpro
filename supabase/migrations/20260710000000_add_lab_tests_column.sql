-- ============================================================================
-- Migration: Add lab_tests column and refresh schema cache
-- ============================================================================
-- Created: 2026-07-10
-- Purpose: Fix "Could not find the 'lab_tests' column of 'projects' in the schema cache"
--
-- Run this SQL in Supabase Dashboard -> SQL Editor
-- ============================================================================

-- ============================================================================
-- PART 1: Add lab_tests column (idempotent - only runs if column doesn't exist)
-- ============================================================================
ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS lab_tests jsonb DEFAULT '[]';

-- Also add any other missing JSONB columns that may be missing
ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS schedule jsonb DEFAULT '[]';
ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS rfis jsonb DEFAULT '[]';
ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS structures jsonb DEFAULT '[]';

-- ============================================================================
-- PART 2: Refresh PostgREST schema cache so it recognizes new columns
-- ============================================================================
-- This is the KEY fix for the "schema cache" error
NOTIFY pgrst, 'reload schema';

-- ============================================================================
-- PART 3: Verify the columns exist
-- ============================================================================
DO $$
DECLARE
    col_exists BOOLEAN;
BEGIN
    -- Check if lab_tests column exists
    SELECT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'projects' AND column_name = 'lab_tests'
    ) INTO col_exists;

    IF col_exists THEN
        RAISE NOTICE '✓ lab_tests column verified in projects table';
    ELSE
        RAISE WARNING '⚠️ lab_tests column still not found - may need manual intervention';
    END IF;
END
$$;

-- List all JSONB columns in projects table
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'projects'
  AND data_type = 'jsonb'
ORDER BY column_name;

-- ============================================================================
-- Confirmation
-- ============================================================================
DO $$
BEGIN
    RAISE NOTICE '========================================';
    RAISE NOTICE 'Migration completed successfully!';
    RAISE NOTICE 'Added: lab_tests, schedule, rfis, structures columns';
    RAISE NOTICE 'Refreshed: PostgREST schema cache';
    RAISE NOTICE '========================================';
END
$$;
