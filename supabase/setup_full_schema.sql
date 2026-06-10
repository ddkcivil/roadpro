-- Full Schema Setup (Idempotent)
-- Run this in the Supabase SQL Editor: https://supabase.com/dashboard/project/hrampejpzsanbkrpzbod/sql

-- ==================== TABLES ====================

-- Messages
CREATE TABLE IF NOT EXISTS public.messages (
    id uuid DEFAULT gen_random_uuid() NOT NULL PRIMARY KEY,
    project_id text,
    sender_id uuid,
    receiver_id text,
    content text NOT NULL,
    created_at timestamptz DEFAULT now(),
    timestamp timestamptz DEFAULT now(),
    read_at timestamptz,
    read boolean DEFAULT false,
    attachment_url text,
    attachment_name text,
    attachment_type text
);
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "messages_select" ON public.messages;
CREATE POLICY "messages_select" ON public.messages FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "messages_insert" ON public.messages;
CREATE POLICY "messages_insert" ON public.messages FOR INSERT TO authenticated WITH CHECK (true);

-- Projects
CREATE TABLE IF NOT EXISTS public.projects (
    id text PRIMARY KEY,
    name text NOT NULL,
    client text NOT NULL,
    owner_id uuid,
    contract_no text,
    location text,
    status text,
    budget numeric,
    start_date date DEFAULT '2025-01-01',
    end_date date DEFAULT '2026-01-01',
    description text,
    contractor text,
    metadata jsonb DEFAULT '{}',
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "projects_select" ON public.projects;
CREATE POLICY "projects_select" ON public.projects FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "projects_insert" ON public.projects;
CREATE POLICY "projects_insert" ON public.projects FOR INSERT TO authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "projects_update" ON public.projects;
CREATE POLICY "projects_update" ON public.projects FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "projects_delete_owner" ON public.projects;
CREATE POLICY "projects_delete_owner" ON public.projects FOR DELETE TO authenticated USING (owner_id = auth.uid());

-- Profiles
CREATE TABLE IF NOT EXISTS public.profiles (
    id uuid REFERENCES auth.users NOT NULL PRIMARY KEY,
    email text,
    full_name text,
    role text DEFAULT 'SITE_ENGINEER',
    status text DEFAULT 'active',
    created_at timestamptz DEFAULT now()
);
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "profiles_select_all" ON public.profiles;
CREATE POLICY "profiles_select_all" ON public.profiles FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "profiles_update_own" ON public.profiles;
CREATE POLICY "profiles_update_own" ON public.profiles FOR UPDATE TO authenticated USING (auth.uid() = id);

-- ==================== REFRESH SCHEMA ====================
NOTIFY pgrst, 'reload schema';

SELECT 'Schema setup complete!' as status;
