-- Migration: Refine RLS policies for projects table
-- Created: 2026-05-20
-- Purpose: Ensure robust access for both authenticated and anonymous users to prevent 401/42501 errors

-- First, ensure RLS is enabled
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;

-- 1. DROP old or conflicting policies
DROP POLICY IF EXISTS "projects_select_authenticated" ON projects;
DROP POLICY IF EXISTS "projects_select_all" ON projects;
DROP POLICY IF EXISTS "projects_insert_all_authenticated" ON projects;
DROP POLICY IF EXISTS "projects_insert_anon_permissive" ON projects;
DROP POLICY IF EXISTS "projects_insert_permissive" ON projects;

-- 2. CREATE clean, robust policies

-- SELECT: Allow all authenticated and anonymous users to view projects
-- (Anonymous read is often needed for landing pages or public shares)
CREATE POLICY "projects_select_permissive"
ON projects FOR SELECT
TO anon, authenticated
USING (true);

-- INSERT: Allow all authenticated and anonymous users to create projects
-- (Permissive for initial onboarding/orphaned projects)
CREATE POLICY "projects_insert_permissive"
ON projects FOR INSERT
TO anon, authenticated
WITH CHECK (true);

-- UPDATE: Only owner or authenticated users can update (more restrictive than insert)
-- We keep the existing "projects_update_owner" if it exists, or recreate it
DROP POLICY IF EXISTS "projects_update_owner" ON projects;
CREATE POLICY "projects_update_owner"
ON projects FOR UPDATE
TO authenticated
USING (owner_id = auth.uid() OR owner_id IS NULL)
WITH CHECK (owner_id = auth.uid() OR owner_id IS NULL);

-- DELETE: Only owner can delete
DROP POLICY IF EXISTS "projects_delete_owner" ON projects;
CREATE POLICY "projects_delete_owner"
ON projects FOR DELETE
TO authenticated
USING (owner_id = auth.uid());

-- 3. Ensure proper grants
GRANT ALL ON TABLE public.projects TO anon;
GRANT ALL ON TABLE public.projects TO authenticated;
GRANT ALL ON TABLE public.projects TO service_role;
