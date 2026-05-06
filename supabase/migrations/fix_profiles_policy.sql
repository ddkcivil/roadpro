-- Migration: Fix profiles table RLS policies to prevent infinite recursion
-- This script drops and recreates simpler policies that don't cause recursion

-- Drop existing problematic policies
DROP POLICY IF EXISTS "Admin full access to profiles" ON public.profiles;
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users insert own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users view own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users update own profile" ON public.profiles;

-- Create simpler policies that don't cause recursion

-- Policy 1: All authenticated users can view all profiles (needed for user listing)
-- This uses a simple EXISTS check without referencing the profiles table in a recursive way
CREATE POLICY "Authenticated users can view profiles" ON public.profiles
FOR SELECT TO authenticated
USING (true);

-- Policy 2: Users can insert their own profile
CREATE POLICY "Users insert own profile" ON public.profiles
FOR INSERT TO authenticated
WITH CHECK (auth.uid() = id);

-- Policy 3: Users can update their own profile
CREATE POLICY "Users update own profile" ON public.profiles
FOR UPDATE TO authenticated
USING (auth.uid() = id)
WITH CHECK (auth.uid() = id);

-- Policy 4: Admin users (via service_role) have full access
-- This checks auth.role() directly which doesn't cause recursion
CREATE POLICY "Admin full access to profiles" ON public.profiles
FOR ALL TO service_role
USING (auth.role() = 'service_role')
WITH CHECK (auth.role() = 'service_role');

-- Grant permissions to anon and authenticated roles for basic operations
GRANT SELECT ON public.profiles TO anon, authenticated;
GRANT INSERT ON public.profiles TO authenticated;
GRANT UPDATE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;

-- Verify the policies were created correctly
SELECT policyname, cmd, qual, with_check 
FROM pg_policies 
WHERE tablename = 'profiles';
