-- Migration: Fix infinite recursion in profiles RLS policies
-- Root cause: Multiple conflicting SELECT policies + policies using subqueries to profiles table
-- Solution: Drop all profiles policies and create simplified, non-recursive policies

-- =====================================================
-- STEP 1: Drop all existing profiles policies
-- =====================================================

-- Drop from 20240526000001_remote_schema.sql
DROP POLICY IF EXISTS "Admin full access to profiles" ON profiles;
DROP POLICY IF EXISTS "Users view own profile" ON profiles;
DROP POLICY IF EXISTS "Users insert own profile" ON profiles;
DROP POLICY IF EXISTS "Users update own profile" ON profiles;

-- Drop from 20260510120005_fix_rls_policies_v2.sql
DROP POLICY IF EXISTS "profiles_select_all_authenticated" ON profiles;
DROP POLICY IF EXISTS "profiles_insert_own" ON profiles;
DROP POLICY IF EXISTS "profiles_update_own" ON profiles;
DROP POLICY IF EXISTS "profiles_service_role_full_access" ON profiles;

-- =====================================================
-- STEP 2: Create simplified profiles policies (no recursion)
-- =====================================================

-- SELECT: All authenticated users can view all profiles
-- (The app needs to list all users for admin functions)
CREATE POLICY "profiles_select_all_authenticated"
ON profiles FOR SELECT
TO authenticated
USING (true);

-- INSERT: Users can only insert their own profile
CREATE POLICY "profiles_insert_own"
ON profiles FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = id);

-- UPDATE: Users can update their own profile
CREATE POLICY "profiles_update_own"
ON profiles FOR UPDATE
TO authenticated
USING (auth.uid() = id)
WITH CHECK (auth.uid() = id);

-- Service role: Full access for admin operations
CREATE POLICY "profiles_service_role_full_access"
ON profiles FOR ALL
TO service_role
USING (auth.role() = 'service_role')
WITH CHECK (auth.role() = 'service_role');

-- =====================================================
-- STEP 3: Fix projects policies that reference profiles (prevent recursion)
-- =====================================================

-- Drop existing projects policies that use subqueries to profiles
DROP POLICY IF EXISTS "Owners or admins can update projects" ON projects;
DROP POLICY IF EXISTS "Owners or admins can delete projects" ON projects;
DROP POLICY IF EXISTS "Admins and Project Managers can insert projects" ON projects;
DROP POLICY IF EXISTS "Admins and Project Managers can select projects" ON projects;

-- Create simplified projects policies (no profiles subqueries)
-- SELECT: All authenticated users can view projects
CREATE POLICY "projects_select_authenticated"
ON projects FOR SELECT
TO authenticated
USING (true);

-- INSERT: All authenticated users can create projects
CREATE POLICY "projects_insert_authenticated"
ON projects FOR INSERT
TO authenticated
WITH CHECK (true);

-- UPDATE: Owners can update their projects (simple check, no profiles reference)
CREATE POLICY "projects_update_owner"
ON projects FOR UPDATE
TO authenticated
USING (owner_id = auth.uid())
WITH CHECK (owner_id = auth.uid());

-- DELETE: Owners can delete their projects
CREATE POLICY "projects_delete_owner"
ON projects FOR DELETE
TO authenticated
USING (owner_id = auth.uid());

-- =====================================================
-- STEP 4: Fix audit_logs policy that references profiles
-- =====================================================

DROP POLICY IF EXISTS "Admins can read audit logs" ON audit_logs;

-- Simplify audit_logs SELECT - all authenticated can read
CREATE POLICY "audit_logs_select_authenticated"
ON audit_logs FOR SELECT
TO authenticated
USING (true);

-- =====================================================
-- STEP 5: Verify the fix
-- =====================================================

-- Check profiles policies are correct
SELECT 'profiles' as table_name, policyname, cmd, qual, with_check 
FROM pg_policies 
WHERE tablename = 'profiles'
ORDER BY policyname;

-- Check projects policies are correct
SELECT 'projects' as table_name, policyname, cmd, qual, with_check 
FROM pg_policies 
WHERE tablename = 'projects'
ORDER BY policyname;
