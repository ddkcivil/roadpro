-- Fix RLS policy for projects table to allow anonymous inserts
-- This is needed because the Supabase client doesn't always have auth session

-- Drop existing restrictive INSERT policies if they exist
DROP POLICY IF EXISTS "projects_insert_authenticated" ON projects;
DROP POLICY IF EXISTS "Admins and Project Managers can insert projects" ON projects;
DROP POLICY IF EXISTS "Users can create own projects" ON projects;
DROP POLICY IF EXISTS "projects_insert_all_authenticated" ON projects;
DROP POLICY IF EXISTS "projects_insert_anon_permissive" ON projects;

-- Create permissive INSERT policy for authenticated users
CREATE POLICY "projects_insert_all_authenticated"
ON projects FOR INSERT
TO authenticated
WITH CHECK (true);

-- Create permissive INSERT policy for anon (needed for client-side inserts without session)
CREATE POLICY "projects_insert_anon_permissive"
ON projects FOR INSERT
TO anon
WITH CHECK (true);
