-- Migration: Add missing columns to profiles table
-- Run this in the Supabase SQL Editor: https://supabase.com/dashboard/project/hrampejpzsanbkrpzbod/sql
-- Or via Supabase CLI: supabase db push

-- ==================== ADD MISSING COLUMNS ====================

-- Add avatar_url column if not exists
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'avatar_url') THEN
        ALTER TABLE public.profiles ADD COLUMN avatar_url text;
        COMMENT ON COLUMN public.profiles.avatar_url IS 'URL to user avatar image';
    END IF;
END $$;

-- Add phone column if not exists
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'phone') THEN
        ALTER TABLE public.profiles ADD COLUMN phone text;
        COMMENT ON COLUMN public.profiles.phone IS 'User phone number';
    END IF;
END $$;

-- Add last_seen column if not exists
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'last_seen') THEN
        ALTER TABLE public.profiles ADD COLUMN last_seen timestamptz;
        COMMENT ON COLUMN public.profiles.last_seen IS 'Last time user was active';
    END IF;
END $$;

-- Add updated_at column if not exists
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'updated_at') THEN
        ALTER TABLE public.profiles ADD COLUMN updated_at timestamptz;
        COMMENT ON COLUMN public.profiles.updated_at IS 'Last update timestamp';
    END IF;
END $$;

-- ==================== FIX RLS POLICIES ====================

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "profiles_select_all" ON public.profiles;
DROP POLICY IF EXISTS "profiles_update_own" ON public.profiles;
DROP POLICY IF EXISTS "profiles_insert" ON public.profiles;

-- Create permissive SELECT policy for authenticated users
CREATE POLICY "profiles_select_all" ON public.profiles 
FOR SELECT TO authenticated 
USING (true);

-- Create UPDATE policy for own profile
CREATE POLICY "profiles_update_own" ON public.profiles 
FOR UPDATE TO authenticated 
USING (auth.uid() = id) 
WITH CHECK (auth.uid() = id);

-- Create INSERT policy for authenticated users
CREATE POLICY "profiles_insert" ON public.profiles 
FOR INSERT TO authenticated 
WITH CHECK (true);

-- Grant permissions to service_role
GRANT ALL ON TABLE public.profiles TO service_role;
GRANT SELECT ON TABLE public.profiles TO anon;

-- ==================== REFRESH SCHEMA ====================
NOTIFY pgrst, 'reload schema';

SELECT 'Profiles table migration complete!' as status;
