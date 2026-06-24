-- =============================================================================
-- CONSOLIDATED DATABASE FIX MIGRATION v2
-- Run this in Supabase SQL Editor to fix all remaining issues
-- =============================================================================
-- Created: 2026-07-28
-- Purpose: Fix duplicates, ensure all tables/columns exist, fix RLS policies

-- =============================================================================
-- PART 1: Fix duplicate column additions (messages table)
-- =============================================================================
-- attachment_name was added twice in migrations 20260711000000 and 20260711000001
-- This is idempotent so it's fine, but let's ensure all message columns exist
ALTER TABLE public.messages ADD COLUMN IF NOT EXISTS attachment_url text;
ALTER TABLE public.messages ADD COLUMN IF NOT EXISTS attachment_name text;
ALTER TABLE public.messages ADD COLUMN IF NOT EXISTS attachment_type text;

-- =============================================================================
-- PART 2: Add any missing columns to projects table (idempotent)
-- =============================================================================
-- Core text columns
ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS code text;
ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS engineer text;
ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS consultant_name text;

-- Additional JSONB columns not in previous migrations
ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS linear_progress_logs jsonb DEFAULT '[]';
ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS personnel jsonb DEFAULT '{}';
ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS accounting_integrations jsonb DEFAULT '[]';
ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS accounting_transactions jsonb DEFAULT '[]';
ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS structure_templates jsonb DEFAULT '[]';
ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS audit_logs jsonb DEFAULT '[]';

-- =============================================================================
-- PART 3: Add any missing columns to profiles table (idempotent)
-- =============================================================================
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS email text;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS avatar_url text;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS phone text;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS last_seen timestamptz;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS updated_at timestamptz;

-- =============================================================================
-- PART 4: Add any missing columns to project_documents (idempotent)
-- =============================================================================
ALTER TABLE public.project_documents ADD COLUMN IF NOT EXISTS correspondence_type text;
ALTER TABLE public.project_documents ADD COLUMN IF NOT EXISTS letter_date date;
ALTER TABLE public.project_documents ADD COLUMN IF NOT EXISTS current_version integer DEFAULT 1;

-- =============================================================================
-- PART 5: Add any missing columns to project_site_photos (idempotent)
-- =============================================================================
ALTER TABLE public.project_site_photos ADD COLUMN IF NOT EXISTS date date;
ALTER TABLE public.project_site_photos ADD COLUMN IF NOT EXISTS location_lat double precision;
ALTER TABLE public.project_site_photos ADD COLUMN IF NOT EXISTS location_lng double precision;
ALTER TABLE public.project_site_photos ADD COLUMN IF NOT EXISTS updated_at timestamptz;

-- =============================================================================
-- PART 6: Add any missing columns to staff_locations (idempotent)
-- =============================================================================
ALTER TABLE public.staff_locations ADD COLUMN IF NOT EXISTS id uuid DEFAULT gen_random_uuid();
ALTER TABLE public.staff_locations ADD COLUMN IF NOT EXISTS user_name text;
ALTER TABLE public.staff_locations ADD COLUMN IF NOT EXISTS user_role text;
ALTER TABLE public.staff_locations ADD COLUMN IF NOT EXISTS status text DEFAULT 'Active';
ALTER TABLE public.staff_locations ADD COLUMN IF NOT EXISTS created_at timestamptz;

-- Add unique constraint for upsert (with error handling)
DO $$
BEGIN
    ALTER TABLE public.staff_locations ADD CONSTRAINT staff_locations_project_user_unique UNIQUE (project_id, user_id);
EXCEPTION
    WHEN duplicate_table THEN NULL;
    WHEN duplicate_object THEN NULL;
END
$$;

-- =============================================================================
-- PART 7: Fix RLS policies - Ensure consistent permissive policies
-- =============================================================================
-- Projects table - Drop old policies and create permissive ones
DROP POLICY IF EXISTS "projects_select_permissive" ON public.projects;
DROP POLICY IF EXISTS "projects_insert_permissive" ON public.projects;
DROP POLICY IF EXISTS "projects_update_owner" ON public.projects;
DROP POLICY IF EXISTS "projects_delete_owner" ON public.projects;
DROP POLICY IF EXISTS "projects_select" ON public.projects;
DROP POLICY IF EXISTS "projects_insert" ON public.projects;
DROP POLICY IF EXISTS "projects_update" ON public.projects;

CREATE POLICY "projects_select_permissive"
ON public.projects FOR SELECT
TO anon, authenticated, service_role
USING (true);

CREATE POLICY "projects_insert_permissive"
ON public.projects FOR INSERT
TO anon, authenticated, service_role
WITH CHECK (true);

DROP POLICY IF EXISTS "projects_update_permissive" ON public.projects;
CREATE POLICY "projects_update_permissive"
ON public.projects FOR UPDATE
TO authenticated, service_role
USING (true)
WITH CHECK (true);

CREATE POLICY "projects_delete_owner"
ON public.projects FOR DELETE
TO authenticated, service_role
USING (owner_id = auth.uid() OR auth.uid() IS NULL);

-- Profiles table
DROP POLICY IF EXISTS "profiles_select_all" ON public.profiles;
DROP POLICY IF EXISTS "profiles_update_own" ON public.profiles;
DROP POLICY IF EXISTS "profiles_insert" ON public.profiles;
DROP POLICY IF EXISTS "profiles_select" ON public.profiles;

CREATE POLICY "profiles_select_all"
ON public.profiles FOR SELECT
TO anon, authenticated, service_role
USING (true);

CREATE POLICY "profiles_insert"
ON public.profiles FOR INSERT
TO authenticated, service_role
WITH CHECK (true);

CREATE POLICY "profiles_update_own"
ON public.profiles FOR UPDATE
TO authenticated, service_role
USING (auth.uid() = id OR auth.uid() IS NULL)
WITH CHECK (auth.uid() = id OR auth.uid() IS NULL);

-- Messages table
DROP POLICY IF EXISTS "messages_select" ON public.messages;
DROP POLICY IF EXISTS "messages_select_all" ON public.messages;
DROP POLICY IF EXISTS "messages_insert" ON public.messages;

CREATE POLICY "messages_select_all"
ON public.messages FOR SELECT
TO anon, authenticated, service_role
USING (true);

CREATE POLICY "messages_insert"
ON public.messages FOR INSERT
TO authenticated, service_role
WITH CHECK (true);

-- Audit logs table
DROP POLICY IF EXISTS "audit_logs_select" ON public.audit_logs;
DROP POLICY IF EXISTS "audit_logs_insert" ON public.audit_logs;

CREATE POLICY "audit_logs_select"
ON public.audit_logs FOR SELECT
TO authenticated, service_role
USING (true);

CREATE POLICY "audit_logs_insert"
ON public.audit_logs FOR INSERT
TO authenticated, service_role
WITH CHECK (true);

-- Project documents table
DROP POLICY IF EXISTS "project_documents_select" ON public.project_documents;
DROP POLICY IF EXISTS "project_documents_insert" ON public.project_documents;
DROP POLICY IF EXISTS "project_documents_update" ON public.project_documents;

CREATE POLICY "project_documents_select"
ON public.project_documents FOR SELECT
TO authenticated, service_role
USING (true);

CREATE POLICY "project_documents_insert"
ON public.project_documents FOR INSERT
TO authenticated, service_role
WITH CHECK (true);

CREATE POLICY "project_documents_update"
ON public.project_documents FOR UPDATE
TO authenticated, service_role
USING (true)
WITH CHECK (true);

-- Project kml table
DROP POLICY IF EXISTS "project_kml_select" ON public.project_kml;
DROP POLICY IF EXISTS "project_kml_insert" ON public.project_kml;
DROP POLICY IF EXISTS "project_kml_update" ON public.project_kml;

CREATE POLICY "project_kml_select"
ON public.project_kml FOR SELECT
TO authenticated, service_role
USING (true);

CREATE POLICY "project_kml_insert"
ON public.project_kml FOR INSERT
TO authenticated, service_role
WITH CHECK (true);

CREATE POLICY "project_kml_update"
ON public.project_kml FOR UPDATE
TO authenticated, service_role
USING (true)
WITH CHECK (true);

-- Staff locations table
DROP POLICY IF EXISTS "staff_locations_select" ON public.staff_locations;
DROP POLICY IF EXISTS "staff_locations_insert" ON public.staff_locations;
DROP POLICY IF EXISTS "staff_locations_upsert" ON public.staff_locations;

CREATE POLICY "staff_locations_select"
ON public.staff_locations FOR SELECT
TO authenticated, service_role
USING (true);

CREATE POLICY "staff_locations_insert"
ON public.staff_locations FOR INSERT
TO authenticated, service_role
WITH CHECK (true);

CREATE POLICY "staff_locations_upsert"
ON public.staff_locations FOR UPDATE
TO authenticated, service_role
USING (true)
WITH CHECK (true);

-- Inventory transactions table
DROP POLICY IF EXISTS "allow_all_read_inventory_transactions" ON public.inventory_transactions;
DROP POLICY IF EXISTS "allow_all_insert_inventory_transactions" ON public.inventory_transactions;
DROP POLICY IF EXISTS "allow_all_update_inventory_transactions" ON public.inventory_transactions;
DROP POLICY IF EXISTS "allow_all_delete_inventory_transactions" ON public.inventory_transactions;
DROP POLICY IF EXISTS "inventory_transactions_select" ON public.inventory_transactions;
DROP POLICY IF EXISTS "inventory_transactions_insert" ON public.inventory_transactions;
DROP POLICY IF EXISTS "inventory_transactions_update" ON public.inventory_transactions;
DROP POLICY IF EXISTS "inventory_transactions_delete" ON public.inventory_transactions;

CREATE POLICY "inventory_transactions_select"
ON public.inventory_transactions FOR SELECT
TO anon, authenticated, service_role
USING (true);

CREATE POLICY "inventory_transactions_insert"
ON public.inventory_transactions FOR INSERT
TO authenticated, service_role
WITH CHECK (true);

CREATE POLICY "inventory_transactions_update"
ON public.inventory_transactions FOR UPDATE
TO authenticated, service_role
USING (true)
WITH CHECK (true);

CREATE POLICY "inventory_transactions_delete"
ON public.inventory_transactions FOR DELETE
TO authenticated, service_role
USING (true);

-- =============================================================================
-- PART 8: Grant permissions to all roles
-- =============================================================================
GRANT ALL ON TABLE public.projects TO anon, authenticated, service_role;
GRANT ALL ON TABLE public.profiles TO anon, authenticated, service_role;
GRANT ALL ON TABLE public.messages TO anon, authenticated, service_role;
GRANT ALL ON TABLE public.audit_logs TO authenticated, service_role;
GRANT ALL ON TABLE public.project_documents TO authenticated, service_role;
GRANT ALL ON TABLE public.project_kml TO authenticated, service_role;
GRANT ALL ON TABLE public.staff_locations TO authenticated, service_role;
GRANT ALL ON TABLE public.inventory_transactions TO authenticated, service_role;

-- =============================================================================
-- PART 9: Refresh PostgREST schema cache
-- =============================================================================
NOTIFY pgrst, 'reload schema';

-- =============================================================================
-- PART 10: Verify tables exist
-- =============================================================================
SELECT 
    table_name,
    table_type = 'BASE TABLE' AS is_base_table
FROM information_schema.tables 
WHERE table_schema = 'public'
AND table_name IN (
    'projects', 'profiles', 'messages', 'registrations', 'audit_logs',
    'project_documents', 'document_versions', 'project_site_photos',
    'project_kml', 'staff_locations', 'inventory_transactions',
    'roads', 'structures', 'alignments', 'chainage_points', 'road_types'
)
ORDER BY table_name;

-- =============================================================================
-- DONE
-- =============================================================================
DO $$
BEGIN
    RAISE NOTICE '========================================';
    RAISE NOTICE 'Consolidated Fix v2 completed!';
    RAISE NOTICE 'Fixed: duplicate column additions';
    RAISE NOTICE 'Added: missing columns to all tables';
    RAISE NOTICE 'Fixed: RLS policies for all tables';
    RAISE NOTICE 'Refreshed: PostgREST schema cache';
    RAISE NOTICE '========================================';
END
$$;
