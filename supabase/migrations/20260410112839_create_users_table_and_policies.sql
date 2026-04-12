-- MIGRATION: create_users_table_and_policies
-- This migration creates the 'users' table and associated Row Level Security (RLS) policies.
-- It is based on the User interface defined in types.ts.

BEGIN;

-- Enable uuid-ossp extension if needed for gen_random_uuid()
-- Uncomment the line below if you encounter issues with gen_random_uuid()
-- CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE TABLE IF NOT EXISTS public.users (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT,
    email TEXT UNIQUE NOT NULL,
    phone TEXT,
    role TEXT, -- Corresponds to UserRole enum, stored as text
    avatar TEXT, -- URL to avatar image
    last_seen TIMESTAMP WITH TIME ZONE -- ISO date string
);

-- Enable Row Level Security for the users table
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

-- RLS Policies for the users table:

-- Allow authenticated users to read their own profile
CREATE POLICY "Allow users to read their own profile"
ON public.users FOR SELECT
USING (auth.uid() = id);

-- Allow authenticated users to update their own profile
CREATE POLICY "Allow users to update their own profile"
ON public.users FOR UPDATE
USING (auth.uid() = id);

-- (Optional) Allow admins to read all users
CREATE POLICY "Allow admins to read all users"
ON public.users FOR SELECT
USING (
  EXISTS (
    SELECT 1
    FROM public.users u
    WHERE u.id = auth.uid() AND u.role = 'Admin'
  )
);

COMMIT;
