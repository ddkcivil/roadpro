-- Migration: Fix projects INSERT policy
-- This script ensures any authenticated user can create projects

-- Drop the restrictive INSERT policy if it exists
DROP POLICY IF EXISTS projects_insert_authenticated ON projects;
DROP POLICY IF EXISTS projects_insert_any_authenticated ON projects;

-- Create fully permissive INSERT policy (any authenticated user can create)
CREATE POLICY projects_insert_authenticated
ON projects FOR INSERT
TO authenticated
WITH CHECK (true);

-- Verify final policies
SELECT policyname, cmd, with_check FROM pg_policies WHERE tablename = 'projects';
