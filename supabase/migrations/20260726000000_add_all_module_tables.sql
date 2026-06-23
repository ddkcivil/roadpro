-- =============================================================================
-- COMPREHENSIVE DATABASE TABLES MIGRATION
-- Run this in Supabase SQL Editor to add all tables used by the application
-- =============================================================================

-- 1. PROJECTS TABLE (base table with JSONB columns)
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
    code text,
    engineer text,
    consultant_name text,
    metadata jsonb DEFAULT '{}',
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now(),
    -- Core JSONB fields (added for all modules)
    boq jsonb DEFAULT '[]',
    variation_orders jsonb DEFAULT '[]',
    measurement_sheets jsonb DEFAULT '[]',
    agencies jsonb DEFAULT '[]',
    agency_payments jsonb DEFAULT '[]',
    subcontractor_payments jsonb DEFAULT '[]',
    agency_materials jsonb DEFAULT '[]',
    agency_bills jsonb DEFAULT '[]',
    materials jsonb DEFAULT '[]',
    linear_works jsonb DEFAULT '[]',
    linear_progress_logs jsonb DEFAULT '[]',
    inventory jsonb DEFAULT '[]',
    purchase_orders jsonb DEFAULT '[]',
    inventory_transactions jsonb DEFAULT '[]',
    vehicles jsonb DEFAULT '[]',
    vehicle_logs jsonb DEFAULT '[]',
    daily_reports jsonb DEFAULT '[]',
    pre_construction jsonb DEFAULT '[]',
    land_parcels jsonb DEFAULT '[]',
    map_overlays jsonb DEFAULT '[]',
    kml_data jsonb DEFAULT '[]',
    ncrs jsonb DEFAULT '[]',
    contract_bills jsonb DEFAULT '[]',
    staff_locations jsonb DEFAULT '[]',
    environment_registry jsonb DEFAULT '{}',
    resources jsonb DEFAULT '[]',
    resource_allocations jsonb DEFAULT '[]',
    milestones jsonb DEFAULT '[]',
    personnel jsonb DEFAULT '{}',
    -- Project relationship fields
    rfis jsonb DEFAULT '[]',
    lab_tests jsonb DEFAULT '[]',
    schedule jsonb DEFAULT '[]',
    structures jsonb DEFAULT '[]',
    roads jsonb DEFAULT '[]',
    accounting_integrations jsonb DEFAULT '[]',
    accounting_transactions jsonb DEFAULT '[]',
    structure_templates jsonb DEFAULT '[]',
    audit_logs jsonb DEFAULT '[]'
);
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;

-- RLS Policies for projects
DROP POLICY IF EXISTS "projects_select" ON public.projects;
CREATE POLICY "projects_select" ON public.projects FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "projects_insert" ON public.projects;
CREATE POLICY "projects_insert" ON public.projects FOR INSERT TO authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "projects_update" ON public.projects;
CREATE POLICY "projects_update" ON public.projects FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "projects_delete_owner" ON public.projects;
CREATE POLICY "projects_delete_owner" ON public.projects FOR DELETE TO authenticated USING (owner_id = auth.uid());

-- 2. PROFILES TABLE
CREATE TABLE IF NOT EXISTS public.profiles (
    id uuid REFERENCES auth.users NOT NULL PRIMARY KEY,
    email text,
    full_name text,
    role text DEFAULT 'SITE_ENGINEER',
    avatar_url text,
    phone text,
    status text DEFAULT 'active',
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now(),
    last_seen timestamptz
);
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "profiles_select_all" ON public.profiles;
CREATE POLICY "profiles_select_all" ON public.profiles FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "profiles_update_own" ON public.profiles;
CREATE POLICY "profiles_update_own" ON public.profiles FOR UPDATE TO authenticated USING (auth.uid() = id);

-- 3. MESSAGES TABLE
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

-- 4. REGISTRATIONS TABLE
CREATE TABLE IF NOT EXISTS public.registrations (
    id uuid DEFAULT gen_random_uuid() NOT NULL PRIMARY KEY,
    name text NOT NULL,
    email text UNIQUE NOT NULL,
    phone text,
    password_hash text,
    requested_role text DEFAULT 'SITE_ENGINEER',
    status text DEFAULT 'pending',
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);
ALTER TABLE public.registrations ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "registrations_public_select" ON public.registrations;
CREATE POLICY "registrations_public_select" ON public.registrations FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "registrations_insert" ON public.registrations;
CREATE POLICY "registrations_insert" ON public.registrations FOR INSERT TO authenticated WITH CHECK (true);

-- 5. AUDIT LOGS TABLE
CREATE TABLE IF NOT EXISTS public.audit_logs (
    id uuid DEFAULT gen_random_uuid() NOT NULL PRIMARY KEY,
    user_id uuid,
    user_name text,
    action text NOT NULL,
    entity_type text,
    entity_id text,
    entity_name text,
    severity text DEFAULT 'INFO',
    metadata jsonb DEFAULT '{}',
    timestamp timestamptz DEFAULT now(),
    created_at timestamptz DEFAULT now()
);
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "audit_logs_select" ON public.audit_logs;
CREATE POLICY "audit_logs_select" ON public.audit_logs FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "audit_logs_insert" ON public.audit_logs;
CREATE POLICY "audit_logs_insert" ON public.audit_logs FOR INSERT TO authenticated WITH CHECK (true);

-- 6. PROJECT DOCUMENTS TABLE
CREATE TABLE IF NOT EXISTS public.project_documents (
    id text PRIMARY KEY,
    project_id text NOT NULL,
    name text NOT NULL,
    folder text,
    tags text[] DEFAULT '{}',
    subject text,
    ref_no text,
    size text,
    type text,
    status text DEFAULT 'Active',
    metadata jsonb DEFAULT '{}',
    current_version integer DEFAULT 1,
    letter_date date,
    correspondence_type text,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);
ALTER TABLE public.project_documents ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "project_documents_select" ON public.project_documents;
CREATE POLICY "project_documents_select" ON public.project_documents FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "project_documents_insert" ON public.project_documents;
CREATE POLICY "project_documents_insert" ON public.project_documents FOR INSERT TO authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "project_documents_update" ON public.project_documents;
CREATE POLICY "project_documents_update" ON public.project_documents FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

-- 7. DOCUMENT VERSIONS TABLE
CREATE TABLE IF NOT EXISTS public.document_versions (
    id text PRIMARY KEY,
    doc_id text NOT NULL REFERENCES public.project_documents(id),
    version_num integer DEFAULT 1,
    blob_url text,
    size bigint,
    notes text,
    uploaded_by text,
    created_at timestamptz DEFAULT now()
);
ALTER TABLE public.document_versions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "document_versions_select" ON public.document_versions;
CREATE POLICY "document_versions_select" ON public.document_versions FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "document_versions_insert" ON public.document_versions;
CREATE POLICY "document_versions_insert" ON public.document_versions FOR INSERT TO authenticated WITH CHECK (true);

-- 8. PROJECT SITE PHOTOS TABLE
CREATE TABLE IF NOT EXISTS public.project_site_photos (
    id text PRIMARY KEY,
    project_id text NOT NULL,
    url text,
    caption text,
    date date,
    uploaded_by text,
    location_lat double precision,
    location_lng double precision,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);
ALTER TABLE public.project_site_photos ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "project_site_photos_select" ON public.project_site_photos;
CREATE POLICY "project_site_photos_select" ON public.project_site_photos FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "project_site_photos_insert" ON public.project_site_photos;
CREATE POLICY "project_site_photos_insert" ON public.project_site_photos FOR INSERT TO authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "project_site_photos_update" ON public.project_site_photos;
CREATE POLICY "project_site_photos_update" ON public.project_site_photos FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

-- 9. PROJECT KML TABLE
CREATE TABLE IF NOT EXISTS public.project_kml (
    id text PRIMARY KEY,
    project_id text NOT NULL,
    name text NOT NULL,
    kml_content text,
    timestamp bigint,
    visible boolean DEFAULT true,
    color text,
    created_at timestamptz DEFAULT now()
);
ALTER TABLE public.project_kml ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "project_kml_select" ON public.project_kml;
CREATE POLICY "project_kml_select" ON public.project_kml FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "project_kml_insert" ON public.project_kml;
CREATE POLICY "project_kml_insert" ON public.project_kml FOR INSERT TO authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "project_kml_update" ON public.project_kml;
CREATE POLICY "project_kml_update" ON public.project_kml FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

-- 10. STAFF LOCATIONS TABLE
CREATE TABLE IF NOT EXISTS public.staff_locations (
    id uuid DEFAULT gen_random_uuid() NOT NULL PRIMARY KEY,
    project_id text NOT NULL,
    user_id uuid NOT NULL,
    user_name text,
    user_role text,
    latitude double precision NOT NULL,
    longitude double precision NOT NULL,
    status text DEFAULT 'Active',
    timestamp timestamptz DEFAULT now(),
    created_at timestamptz DEFAULT now()
);
ALTER TABLE public.staff_locations ENABLE ROW LEVEL SECURITY;
-- Add unique constraint for upsert
ALTER TABLE public.staff_locations DROP CONSTRAINT IF EXISTS staff_locations_project_user_unique;
ALTER TABLE public.staff_locations ADD CONSTRAINT staff_locations_project_user_unique UNIQUE (project_id, user_id);

DROP POLICY IF EXISTS "staff_locations_select" ON public.staff_locations;
CREATE POLICY "staff_locations_select" ON public.staff_locations FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "staff_locations_insert" ON public.staff_locations;
CREATE POLICY "staff_locations_insert" ON public.staff_locations FOR INSERT TO authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "staff_locations_upsert" ON public.staff_locations;
CREATE POLICY "staff_locations_upsert" ON public.staff_locations FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

-- Refresh schema cache
NOTIFY pgrst, 'reload schema';

SELECT 'All tables and columns created successfully!' as status;
