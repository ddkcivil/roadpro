-- Migration: Add structures column to projects table
-- Created: 2026-05-15
-- Purpose: Fix schema cache error "Could not find the 'structures' column of 'projects'"

-- Add structures column if it doesn't exist
ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS structures jsonb DEFAULT '[]'::jsonb;

-- Also add other missing columns from schema.sql that might be needed
ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS boq jsonb DEFAULT '[]'::jsonb;
ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS variation_orders jsonb DEFAULT '[]'::jsonb;
ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS measurement_sheets jsonb DEFAULT '[]'::jsonb;
ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS metadata jsonb DEFAULT '{}'::jsonb;

-- Grant permissions
GRANT ALL ON TABLE public.projects TO anon;
GRANT ALL ON TABLE public.projects TO authenticated;
GRANT ALL ON TABLE public.projects TO service_role;

-- CRITICAL: Refresh the PostgREST schema cache to reflect new columns
-- This notifies PostgREST to reload the schema cache
NOTIFY pgrst, 'reload schema';

-- Verify the column now exists
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'projects' AND column_name = 'structures';
