-- Migration: Clean up duplicate RLS policies
-- This script removes duplicate/malformed policies before creating clean ones

-- =====================================================
-- PROFILES - Clean up duplicates
-- =====================================================

-- Drop all profiles policies (they may have duplicates)
ALTER TABLE profiles DISABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admin full access to profiles" ON profiles;
DROP POLICY IF EXISTS "Users can view own profile" ON profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
DROP POLICY IF EXISTS "Users insert own profile" ON profiles;
DROP POLICY IF EXISTS "Users view own profile" ON profiles;
DROP POLICY IF EXISTS "Users update own profile" ON profiles;
DROP POLICY IF EXISTS "Authenticated users can view profiles" ON profiles;
DROP POLICY IF EXISTS "authenticated users can view profiles" ON profiles;
DROP POLICY IF EXISTS "Users insert own profile" ON profiles;
DROP POLICY IF EXISTS "users can insert own profile" ON profiles;
DROP POLICY IF EXISTS "Users update own profile" ON profiles;
DROP POLICY IF EXISTS "users can update own profile" ON profiles;
DROP POLICY IF EXISTS "service_role full access to profiles" ON profiles;

-- Create clean profiles policies

-- Policy 1: All authenticated users can view all profiles
CREATE POLICY "profiles_select_all_authenticated"
ON profiles FOR SELECT
TO authenticated
USING (true);

-- Policy 2: Users can insert their own profile
CREATE POLICY "profiles_insert_own"
ON profiles FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = id);

-- Policy 3: Users can update their own profile
CREATE POLICY "profiles_update_own"
ON profiles FOR UPDATE
TO authenticated
USING (auth.uid() = id)
WITH CHECK (auth.uid() = id);

-- Re-enable RLS
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Policy 4: Service role full access
CREATE POLICY "profiles_service_role_full_access"
ON profiles FOR ALL
TO service_role
USING (auth.role() = 'service_role')
WITH CHECK (auth.role() = 'service_role');

-- =====================================================
-- PROJECTS - Clean up and create proper policies
-- =====================================================

-- Drop all projects policies
DROP POLICY IF EXISTS "Users can create own projects" ON projects;
DROP POLICY IF EXISTS "Authenticated users can insert projects" ON projects;
DROP POLICY IF EXISTS "Owners or admins can update projects" ON projects;
DROP POLICY IF EXISTS "Owners or admins can delete projects" ON projects;
DROP POLICY IF EXISTS "users can view own projects" ON projects;
DROP POLICY IF EXISTS "owners can update own projects" ON projects;
DROP POLICY IF EXISTS "owners can delete own projects" ON projects;
DROP POLICY IF EXISTS "Authenticated users can view projects" ON projects;
DROP POLICY IF EXISTS "authenticated users can create projects" ON projects;
DROP POLICY IF EXISTS "users can view own projects" ON projects;

-- Create SELECT policy - all authenticated users can view all projects
CREATE POLICY "projects_select_all_authenticated"
ON projects FOR SELECT
TO authenticated
USING (true);

-- Create INSERT policy - any authenticated user can create projects (fully permissive)
CREATE POLICY "projects_insert_authenticated"
ON projects FOR INSERT
TO authenticated
WITH CHECK (true);

-- Create UPDATE policy - owners or admins can update
CREATE POLICY "projects_update_owner_or_admin"
ON projects FOR UPDATE
TO authenticated
USING (
    owner_id = auth.uid() OR 
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND lower(role) = 'admin')
)
WITH CHECK (
    owner_id = auth.uid() OR 
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND lower(role) = 'admin')
);

-- Create DELETE policy - owners or admins can delete
CREATE POLICY "projects_delete_owner_or_admin"
ON projects FOR DELETE
TO authenticated
USING (
    owner_id = auth.uid() OR 
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND lower(role) = 'admin')
);

-- =====================================================
-- Verify final policies
-- =====================================================

-- Check profiles policies
SELECT 'profiles' as table_name, policyname, cmd, qual, with_check 
FROM pg_policies 
WHERE tablename = 'profiles';

-- Check projects policies
SELECT 'projects' as table_name, policyname, cmd, qual, with_check 
FROM pg_policies 
WHERE tablename = 'projects';
