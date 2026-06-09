-- ============================================================================
-- Consolidated Database Migration - Fix All Issues
-- ============================================================================
-- Created: 2026-07-01
-- Purpose: Fix PostgreSQL upsert errors (42P10), add missing tables, and ensure app works
--
-- Run this SQL in Supabase Dashboard -> SQL Editor
-- ============================================================================

-- ============================================================================
-- PART 1: Add explicit UNIQUE constraint on projects.id for upsert operations
-- Fixes error: "there is no unique or exclusion constraint matching the ON CONFLICT specification"
-- ============================================================================
DO $$
BEGIN
    -- Check if constraint doesn't exist, then add it
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'projects_id_key' 
        AND conrelid = 'public.projects'::regclass
    ) THEN
        ALTER TABLE public.projects ADD CONSTRAINT projects_id_key UNIQUE (id);
    END IF;
END $$;

-- ============================================================================
-- PART 2: Add missing columns to projects table (idempotent)
-- ============================================================================
ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS contract_no text;
ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS contractor text;
ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS budget numeric;
ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS start_date date DEFAULT '2025-01-01';
ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS end_date date DEFAULT '2026-01-01';
ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS description text;

-- Add any missing JSONB fields (MUST be arrays '[]' not objects '{}' for reduce() to work)
ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS boq jsonb DEFAULT '[]';
ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS variation_orders jsonb DEFAULT '[]';
ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS measurement_sheets jsonb DEFAULT '[]';
ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS agencies jsonb DEFAULT '[]';
ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS agency_payments jsonb DEFAULT '[]';
ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS agency_materials jsonb DEFAULT '[]';
ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS agency_bills jsonb DEFAULT '[]';
ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS materials jsonb DEFAULT '[]';
ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS linear_works jsonb DEFAULT '[]';
ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS inventory jsonb DEFAULT '[]';
ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS purchase_orders jsonb DEFAULT '[]';
ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS inventory_transactions jsonb DEFAULT '[]';
ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS vehicles jsonb DEFAULT '[]';
ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS vehicle_logs jsonb DEFAULT '[]';
ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS daily_reports jsonb DEFAULT '[]';
ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS pre_construction jsonb DEFAULT '[]';
ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS land_parcels jsonb DEFAULT '[]';
ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS map_overlays jsonb DEFAULT '[]';
ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS kml_data jsonb DEFAULT '[]';
ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS ncrs jsonb DEFAULT '[]';
ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS contract_bills jsonb DEFAULT '[]';
ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS staff_locations jsonb DEFAULT '[]';
ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS environment_registry jsonb DEFAULT '{}';

-- FIX: Convert existing boq from object '{}' to array '[]' if needed (fixes reduce() error)
UPDATE public.projects SET boq = '[]'::jsonb WHERE jsonb_typeof(boq) = 'object';
UPDATE public.projects SET variation_orders = COALESCE(variation_orders, '[]'::jsonb) WHERE variation_orders IS NULL OR jsonb_typeof(variation_orders) = 'object';
UPDATE public.projects SET agencies = COALESCE(agencies, '[]'::jsonb) WHERE agencies IS NULL OR jsonb_typeof(agencies) = 'object';
UPDATE public.projects SET contract_bills = COALESCE(contract_bills, '[]'::jsonb) WHERE contract_bills IS NULL OR jsonb_typeof(contract_bills) = 'object';

-- ============================================================================
-- PART 3: Create missing tables used by the API
-- ============================================================================

-- Create project_kml table (if not exists)
CREATE TABLE IF NOT EXISTS public.project_kml (
    id text NOT NULL,
    project_id text NOT NULL,
    name text NOT NULL,
    kml_content text,
    timestamp timestamp with time zone DEFAULT NOW(),
    visible boolean DEFAULT true,
    color text,
    PRIMARY KEY (id)
);

-- Create index on project_id for project_kml
CREATE INDEX IF NOT EXISTS idx_project_kml_project_id ON public.project_kml (project_id);

-- ============================================================================
-- PART 4: Create append_road_to_project RPC function
-- ============================================================================
CREATE OR REPLACE FUNCTION public.append_road_to_project(
    project_id UUID,
    new_road_data JSONB
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    updated_id UUID;
BEGIN
    UPDATE public.projects
    SET 
        roads = COALESCE(roads, '[]'::jsonb) || new_road_data,
        updated_at = NOW()
    WHERE id = project_id
    RETURNING id INTO updated_id;

    IF updated_id IS NULL THEN
        RAISE EXCEPTION 'Project not found: %', project_id;
    END IF;

    RETURN updated_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.append_road_to_project(UUID, JSONB) TO authenticated;
GRANT EXECUTE ON FUNCTION public.append_road_to_project(UUID, JSONB) TO service_role;

-- ============================================================================
-- PART 5: Fix RLS policies for projects table
-- ============================================================================
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;

-- Drop old policies
DROP POLICY IF EXISTS "projects_select_authenticated" ON projects;
DROP POLICY IF EXISTS "projects_select_all" ON projects;
DROP POLICY IF EXISTS "projects_insert_all_authenticated" ON projects;
DROP POLICY IF EXISTS "projects_insert_anon_permissive" ON projects;

-- Create clean permissive policies
CREATE POLICY "projects_select_permissive"
ON projects FOR SELECT
TO anon, authenticated
USING (true);

CREATE POLICY "projects_insert_permissive"
ON projects FOR INSERT
TO anon, authenticated
WITH CHECK (true);

DROP POLICY IF EXISTS "projects_update_owner" ON projects;
CREATE POLICY "projects_update_owner"
ON projects FOR UPDATE
TO authenticated
USING (owner_id = auth.uid() OR owner_id IS NULL)
WITH CHECK (owner_id = auth.uid() OR owner_id IS NULL);

DROP POLICY IF EXISTS "projects_delete_owner" ON projects;
CREATE POLICY "projects_delete_owner"
ON projects FOR DELETE
TO authenticated
USING (owner_id = auth.uid());

-- ============================================================================
-- PART 6: Grant permissions
-- ============================================================================
GRANT ALL ON TABLE public.projects TO anon;
GRANT ALL ON TABLE public.projects TO authenticated;
GRANT ALL ON TABLE public.projects TO service_role;

GRANT ALL ON TABLE public.project_kml TO anon;
GRANT ALL ON TABLE public.project_kml TO authenticated;
GRANT ALL ON TABLE public.project_kml TO service_role;

-- ============================================================================
-- DONE: Confirmation
-- ============================================================================
DO $$
BEGIN
    RAISE NOTICE 'Database migration completed successfully!';
    RAISE NOTICE 'Fixed: projects_id_key UNIQUE constraint';
    RAISE NOTICE 'Added: missing columns to projects table';
    RAISE NOTICE 'Added: project_kml table';
    RAISE NOTICE 'Added: append_road_to_project function';
    RAISE NOTICE 'Fixed: RLS policies for projects';
END
$$;
