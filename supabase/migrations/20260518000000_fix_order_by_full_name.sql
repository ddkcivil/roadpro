-- Migration: Fix ORDER BY full_name issue (PostgREST error 42P17)
-- This migration specifically fixes the 500 error when ordering by full_name
-- =====================================================

-- STEP 1: Check if full_name column exists, add if missing
-- =====================================================
DO $$
BEGIN
    -- Check if column exists, add it if not
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'profiles' AND column_name = 'full_name'
    ) THEN
        ALTER TABLE public.profiles ADD COLUMN full_name text;
    END IF;
END $$;

-- STEP 2: Create index on full_name for ordering queries
-- =====================================================
DROP INDEX IF EXISTS idx_profiles_full_name;
CREATE INDEX idx_profiles_full_name ON public.profiles(full_name);

-- STEP 3: Clear all existing profiles RLS policies and recreate simple ones
-- =====================================================
DO $$
DECLARE
    pol record;
BEGIN
    -- Drop all profiles policies
    FOR pol IN SELECT policyname FROM pg_policies WHERE tablename = 'profiles' AND schemaname = 'public'
    LOOP
        EXECUTE 'DROP POLICY IF EXISTS "' || pol.policyname || '" ON public.profiles';
    END LOOP;
END $$;

-- STEP 4: Create simple non-recursive profiles policies
-- =====================================================

-- SELECT - All authenticated users can read all profiles
CREATE POLICY "profiles_select_all"
ON profiles FOR SELECT
TO authenticated
USING (true);

-- INSERT - Users can insert their own profile
CREATE POLICY "profiles_insert_own"
ON profiles FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = id);

-- UPDATE - Users can update their own profile
CREATE POLICY "profiles_update_own"
ON profiles FOR UPDATE
TO authenticated
USING (auth.uid() = id)
WITH CHECK (auth.uid() = id);

-- STEP 5: Grant permissions to authenticated role
-- =====================================================
GRANT SELECT ON profiles TO authenticated;
GRANT INSERT ON profiles TO authenticated;
GRANT UPDATE ON profiles TO authenticated;

-- STEP 6: Verify the fix works
-- =====================================================
-- Test query to ensure ORDER BY works
SELECT id, full_name, role 
FROM profiles 
ORDER BY full_name ASC NULLS FIRST
LIMIT 1;

-- Check current policies
SELECT 
    policyname, 
    cmd, 
    qual, 
    with_check 
FROM pg_policies 
WHERE tablename = 'profiles' AND schemaname = 'public'
ORDER BY cmd;
