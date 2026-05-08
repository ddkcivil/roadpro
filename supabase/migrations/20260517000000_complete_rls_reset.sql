-- Migration: Complete RLS Reset for profiles, projects, and audit_logs
-- This migration completely removes ALL existing RLS policies and replaces them with clean, non-recursive ones
-- Run this if the previous fix migrations didn't resolve the 500 error
-- =====================================================

-- STEP 1: Drop ALL profiles policies (use dynamic approach for any existing ones)
-- =====================================================
DO $$
DECLARE
    pol record;
BEGIN
    FOR pol IN SELECT policyname FROM pg_policies WHERE tablename = 'profiles'
    LOOP
        EXECUTE 'DROP POLICY IF EXISTS "' || pol.policyname || '" ON profiles';
    END LOOP;
END $$;

-- STEP 2: Drop ALL projects policies
-- =====================================================
DO $$
DECLARE
    pol record;
BEGIN
    FOR pol IN SELECT policyname FROM pg_policies WHERE tablename = 'projects'
    LOOP
        EXECUTE 'DROP POLICY IF EXISTS "' || pol.policyname || '" ON projects';
    END LOOP;
END $$;

-- STEP 3: Drop audit_logs policies that reference profiles
-- =====================================================
DO $$
DECLARE
    pol record;
BEGIN
    FOR pol IN SELECT policyname, qual FROM pg_policies WHERE tablename = 'audit_logs'
    LOOP
        -- Drop any policy that has a subquery to profiles
        IF pol.qual LIKE '%profiles%' THEN
            EXECUTE 'DROP POLICY IF EXISTS "' || pol.policyname || '" ON audit_logs';
        END IF;
    END LOOP;
END $$;

-- STEP 4: Create SIMPLE, non-recursive profiles policies
-- =====================================================

-- Drop existing profiles policies if they exist (to recreate with correct definition)
DROP POLICY IF EXISTS "profiles_select_all_authenticated" ON profiles;
DROP POLICY IF EXISTS "profiles_insert_own" ON profiles;
DROP POLICY IF EXISTS "profiles_update_own" ON profiles;
DROP POLICY IF EXISTS "profiles_service_role_full_access" ON profiles;

-- SELECT - Allow all authenticated users to read all profiles
-- This is needed for user listing in admin interfaces
CREATE POLICY "profiles_select_all_authenticated"
ON profiles FOR SELECT
TO authenticated
USING (true);

-- INSERT - Users can only insert their own profile (id must match auth.uid)
CREATE POLICY "profiles_insert_own"
ON profiles FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = id);

-- UPDATE - Users can update their own profile only
CREATE POLICY "profiles_update_own"
ON profiles FOR UPDATE
TO authenticated
USING (auth.uid() = id)
WITH CHECK (auth.uid() = id);

-- Service role - Full access
CREATE POLICY "profiles_service_role_full_access"
ON profiles FOR ALL
TO service_role
USING (auth.role() = 'service_role')
WITH CHECK (auth.role() = 'service_role');

-- STEP 5: Create simple projects policies (no profiles subqueries)
-- =====================================================

-- Drop existing projects policies if they exist (to recreate with correct definition)
DROP POLICY IF EXISTS "projects_select_authenticated" ON projects;
DROP POLICY IF EXISTS "projects_insert_authenticated" ON projects;
DROP POLICY IF EXISTS "projects_update_owner" ON projects;
DROP POLICY IF EXISTS "projects_delete_owner" ON projects;

-- SELECT - All authenticated can read
CREATE POLICY "projects_select_authenticated"
ON projects FOR SELECT
TO authenticated
USING (true);

-- INSERT - All authenticated can create
CREATE POLICY "projects_insert_authenticated"
ON projects FOR INSERT
TO authenticated
WITH CHECK (true);

-- UPDATE - Only owner can update (no profiles reference!)
CREATE POLICY "projects_update_owner"
ON projects FOR UPDATE
TO authenticated
USING (owner_id = auth.uid())
WITH CHECK (owner_id = auth.uid());

-- DELETE - Only owner can delete
CREATE POLICY "projects_delete_owner"
ON projects FOR DELETE
TO authenticated
USING (owner_id = auth.uid());

-- STEP 6: Create simple audit_logs policies (no profiles subqueries!)
-- =====================================================

-- DROP existing audit_logs policies if they exist (to recreate with correct definition)
DROP POLICY IF EXISTS "audit_logs_select_authenticated" ON audit_logs;
DROP POLICY IF EXISTS "audit_logs_insert_authenticated" ON audit_logs;

-- SELECT - All authenticated can read audit logs
CREATE POLICY "audit_logs_select_authenticated"
ON audit_logs FOR SELECT
TO authenticated
USING (true);

-- INSERT - Authenticated users can insert their own logs
CREATE POLICY "audit_logs_insert_authenticated"
ON audit_logs FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id OR auth.role() = 'service_role');

-- STEP 7: Grant permissions
-- =====================================================
GRANT SELECT ON profiles TO authenticated;
GRANT INSERT ON profiles TO authenticated;
GRANT UPDATE ON profiles TO authenticated;

GRANT SELECT ON projects TO authenticated;
GRANT INSERT ON projects TO authenticated;
GRANT UPDATE ON projects TO authenticated;
GRANT DELETE ON projects TO authenticated;

GRANT SELECT ON audit_logs TO authenticated;
GRANT INSERT ON audit_logs TO authenticated;

-- STEP 8: Add index on full_name for ordering queries
-- =====================================================
-- This index helps with ORDER BY full_name queries
DROP INDEX IF EXISTS idx_profiles_full_name;
CREATE INDEX idx_profiles_full_name ON public.profiles(full_name);

-- STEP 9: Ensure full_name allows NULL for RLS policies (prevents filtering issues)
-- =====================================================
ALTER TABLE public.profiles ALTER COLUMN full_name DROP NOT NULL;

-- STEP 10: Verify policies are correctly set up
-- =====================================================
SELECT 
    'profiles' as table_name, 
    policyname, 
    cmd, 
    qual, 
    with_check 
FROM pg_policies 
WHERE tablename = 'profiles'
ORDER BY cmd, policyname;

SELECT 
    'projects' as table_name, 
    policyname, 
    cmd, 
    qual, 
    with_check 
FROM pg_policies 
WHERE tablename = 'projects'
ORDER BY cmd, policyname;

SELECT 
    'audit_logs' as table_name, 
    policyname, 
    cmd, 
    qual, 
    with_check 
FROM pg_policies 
WHERE tablename = 'audit_logs'
ORDER BY cmd, policyname;
