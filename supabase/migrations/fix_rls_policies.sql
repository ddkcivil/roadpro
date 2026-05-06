-- Migration: Fix RLS policies for profiles and projects tables
-- This script performs a nuclear reset and creates safe policies

-- =====================================================
-- BUG 1: PROFILES - Fix 500 recursion
-- =====================================================

-- Nuclear reset for profiles
ALTER TABLE profiles DISABLE ROW LEVEL SECURITY;

-- Drop all existing problematic policies
DROP POLICY IF EXISTS "Admin full access to profiles" ON profiles;
DROP POLICY IF EXISTS "Users can view own profile" ON profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
DROP POLICY IF EXISTS "Users insert own profile" ON profiles;
DROP POLICY IF EXISTS "Users view own profile" ON profiles;
DROP POLICY IF EXISTS "Users update own profile" ON profiles;
DROP POLICY IF EXISTS "Authenticated users can view profiles" ON profiles;

-- Create simpler policies that don't cause recursion

-- Policy 1: All authenticated users can view all profiles
CREATE POLICY "authenticated users can view profiles"
ON profiles FOR SELECT
TO authenticated
USING (true);

-- Policy 2: Users can insert their own profile
CREATE POLICY "users can insert own profile"
ON profiles FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = id);

-- Policy 3: Users can update their own profile
CREATE POLICY "users can update own profile"
ON profiles FOR UPDATE
TO authenticated
USING (auth.uid() = id)
WITH CHECK (auth.uid() = id);

-- Re-enable RLS
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Policy 4: Admin full access via service_role (doesn't cause recursion)
CREATE POLICY "service_role full access to profiles"
ON profiles FOR ALL
TO service_role
USING (auth.role() = 'service_role')
WITH CHECK (auth.role() = 'service_role');

-- =====================================================
-- BUG 2: PROJECTS - Fix INSERT blocked (401)
-- =====================================================

-- Check existing policies first
SELECT policyname, cmd, qual FROM pg_policies WHERE tablename = 'projects';

-- Drop existing problematic policies
DROP POLICY IF EXISTS "Users can create own projects" ON projects;
DROP POLICY IF EXISTS "Authenticated users can insert projects" ON projects;
DROP POLICY IF EXISTS "Owners or admins can update projects" ON projects;
DROP POLICY IF EXISTS "Owners or admins can delete projects" ON projects;

-- Create SELECT policy - users can view their own projects
CREATE POLICY "users can view own projects"
ON projects FOR SELECT
TO authenticated
USING (owner_id = auth.uid());

-- Create INSERT policy - authenticated users can create projects
-- WITH CHECK requires owner_id to match the authenticated user
CREATE POLICY "authenticated users can create projects"
ON projects FOR INSERT
TO authenticated
WITH CHECK (owner_id = auth.uid());

-- Create UPDATE policy - owners can update their own projects
CREATE POLICY "owners can update own projects"
ON projects FOR UPDATE
TO authenticated
USING (owner_id = auth.uid())
WITH CHECK (owner_id = auth.uid());

-- Create DELETE policy - owners can delete their own projects
CREATE POLICY "owners can delete own projects"
ON projects FOR DELETE
TO authenticated
USING (owner_id = auth.uid());

-- =====================================================
-- Verify policies
-- =====================================================

-- Check profiles policies
SELECT 'profiles' as table_name, policyname, cmd, qual, with_check 
FROM pg_policies 
WHERE tablename = 'profiles';

-- Check projects policies
SELECT 'projects' as table_name, policyname, cmd, qual, with_check 
FROM pg_policies 
WHERE tablename = 'projects';
