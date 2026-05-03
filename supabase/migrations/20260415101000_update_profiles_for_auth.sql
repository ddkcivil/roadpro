-- Migration for enhanced user management: registration, approval, and login metadata.
-- This script adds columns to the existing 'profiles' table to align with Supabase Auth UUIDs and adds approval status/timestamps.
-- Safe version using ALTER TABLE instead of DROP to preserve existing data.

-- Add missing columns if they don't exist
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS full_name VARCHAR(255);
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS avatar_url TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS role VARCHAR(50) NOT NULL DEFAULT 'user';
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS status VARCHAR(20) DEFAULT 'pending';
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- Add CHECK constraint for status if doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'profiles_status_check'
    ) THEN
        ALTER TABLE public.profiles ADD CHECK (status IN ('pending', 'approved', 'rejected', 'active'));
    END IF;
END $$;

-- Add indexes for common lookups on role and status
CREATE INDEX IF NOT EXISTS idx_profiles_role ON public.profiles(role);
CREATE INDEX IF NOT EXISTS idx_profiles_status ON public.profiles(status);

-- Note: Login functionality is primarily handled by Supabase Auth.
-- This 'profiles' table stores the user's metadata, linked by the 'id' (UUID).
-- The 'status' field can be used to manage approval workflows before a user is fully active.
-- The 'role' field can manage authorization.
