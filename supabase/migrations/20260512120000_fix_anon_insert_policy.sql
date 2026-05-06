-- Migration: Fix anon INSERT policy for projects
-- This removes the restrictive "Users can create own projects" policy that blocks anon inserts
-- and ensures anon users can insert projects without owner_id

-- =====================================================
-- PROJECTS TABLE - Fix INSERT policies
-- =====================================================

-- Step 1: Drop restrictive policies that block anon inserts
-- These policies have complex conditions that don't work for anon role
DROP POLICY IF EXISTS "Users can create own projects" ON projects;
DROP POLICY IF EXISTS "projects_insert_anon" ON projects;

-- Step 2: Disable RLS temporarily to clean up
ALTER TABLE projects DISABLE ROW LEVEL SECURITY;

-- Step 3: Drop all existing INSERT policies (we'll recreate them cleanly)
DROP POLICY IF EXISTS "projects_insert_authenticated" ON projects;
DROP POLICY IF EXISTS "Authenticated users can insert projects" ON projects;

-- Step 4: Create clean INSERT policy for authenticated users (owner-based)
-- Any authenticated user can create a project - they become the owner
CREATE POLICY "projects_insert_authenticated"
ON projects FOR INSERT
TO authenticated
WITH CHECK (
    -- New projects: owner_id must match the current user
    (owner_id IS NULL OR owner_id = auth.uid())
);

-- Step 5: Create permissive INSERT policy for anon users
-- The app uses the public anon key for unauthenticated operations
-- This is needed because Supabase client doesn't get auth session in the current architecture
CREATE POLICY "projects_anon_insert"
ON projects FOR INSERT
TO anon
WITH CHECK (true);

-- Step 6: Re-enable RLS
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- Verify the policies are correct
-- =====================================================

-- List all INSERT policies on projects table
SELECT 
    policyname,
    cmd,
    with_check
FROM pg_policies 
WHERE tablename = 'projects' 
AND cmd = 'INSERT'
ORDER BY policyname;
