-- Migration for enhanced user management: registration, approval, and login metadata.
-- This script updates the 'profiles' table to align with Supabase Auth UUIDs and adds approval status/timestamps.

-- WARNING: This will drop and recreate the 'profiles' table.
-- If you have already populated the 'profiles' table, consider using ALTER TABLE statements instead.

DROP TABLE IF EXISTS public.profiles CASCADE;

CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY, -- Corresponds to auth.users.id in Supabase Auth
    full_name VARCHAR(255) NOT NULL,
    avatar_url TEXT,
    role VARCHAR(50) NOT NULL, -- e.g., 'admin', 'manager', 'user'
    -- Status field for managing approval workflow (e.g., pending, approved, rejected, active)
    status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'active')),
    last_seen TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add indexes for common lookups on role and status
CREATE INDEX IF NOT EXISTS idx_profiles_role ON public.profiles(role);
CREATE INDEX IF NOT EXISTS idx_profiles_status ON public.profiles(status);

-- Note: Login functionality is primarily handled by Supabase Auth.
-- This 'profiles' table stores the user's metadata, linked by the 'id' (UUID).
-- The 'status' field can be used to manage approval workflows before a user is fully active.
-- The 'role' field can manage authorization.
