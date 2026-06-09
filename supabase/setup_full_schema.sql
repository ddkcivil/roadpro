-- Full Schema Setup for hrampejpzsanbkrpzbod Supabase Project
-- Run this in the Supabase SQL Editor: https://supabase.com/dashboard/project/hrampejpzsanbkrpzbod/sql

-- ==================== TABLES ====================

-- Messages table
CREATE TABLE IF NOT EXISTS public.messages (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
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
CREATE POLICY "messages_select" ON messages FOR SELECT TO authenticated USING (true);
CREATE POLICY "messages_insert" ON messages FOR INSERT TO authenticated WITH CHECK (true);
ALTER TABLE public.messages OWNER TO postgres;
GRANT ALL ON TABLE public.messages TO authenticated;
GRANT ALL ON TABLE public.messages TO anon;

-- Projects table  
CREATE TABLE IF NOT EXISTS public.projects (
    id text NOT NULL,
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
    updated_at timestamptz DEFAULT now(),
    roads jsonb DEFAULT '[]',
    accountingintegrations jsonb DEFAULT '[]',
    accountingtransactions jsonb DEFAULT '[]',
    structuretemplates jsonb DEFAULT '[]',
    auditlogs jsonb DEFAULT '[]',
    boq jsonb,
    variation_orders jsonb DEFAULT '[]',
    measurement_sheets jsonb DEFAULT '[]',
    agencies jsonb DEFAULT '[]',
    agency_payments jsonb DEFAULT '[]',
    agency_materials jsonb DEFAULT '[]',
    agency_bills jsonb DEFAULT '[]',
    materials jsonb DEFAULT '[]',
    linear_works jsonb DEFAULT '[]',
    inventory jsonb DEFAULT '[]',
    purchase_orders jsonb DEFAULT '[]',
    inventory_transactions jsonb DEFAULT '[]',
    vehicles jsonb DEFAULT '[]',
    vehicle_logs jsonb DEFAULT '[]',
    daily_reports jsonb DEFAULT '[]',
    pre_construction jsonb DEFAULT '[]',
    land_parcels jsonb DEFAULT '[]',
    map_overlays jsonb DEFAULT '[]',
    ncrs jsonb DEFAULT '[]',
    contract_bills jsonb DEFAULT '[]',
    staff_locations jsonb DEFAULT '[]',
    environment_registry jsonb DEFAULT '{}',
    lab_tests jsonb DEFAULT '[]',
    schedule jsonb DEFAULT '[]',
    rfis jsonb DEFAULT '[]',
    structures jsonb DEFAULT '[]'
);
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;
CREATE POLICY "projects_select" ON projects FOR SELECT TO authenticated USING (true);
CREATE POLICY "projects_insert" ON projects FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "projects_update" ON projects FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
ALTER TABLE public.projects OWNER TO postgres;
GRANT ALL ON TABLE public.projects TO authenticated;
GRANT ALL ON TABLE public.projects TO anon;

-- Roads table
CREATE TABLE IF NOT EXISTS public.roads (
    id varchar(255) NOT NULL,
    name varchar(255) NOT NULL,
    chainage_offset numeric,
    geometry jsonb,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);
ALTER TABLE public.roads ENABLE ROW LEVEL SECURITY;
CREATE POLICY "roads_select" ON roads FOR SELECT TO authenticated USING (true);
ALTER TABLE public.roads OWNER TO postgres;
GRANT ALL ON TABLE public.roads TO authenticated;
GRANT ALL ON TABLE public.roads TO anon;

-- Road types table
CREATE TABLE IF NOT EXISTS public.road_types (
    id integer NOT NULL,
    type_name varchar(100) NOT NULL,
    description text,
    standard_width numeric
);
INSERT INTO public.road_types (id, type_name, description, standard_width) VALUES 
(1, 'National Highway', 'Primary arterial road', 7.3),
(2, 'Provincial Road', 'Secondary road network', 6.0),
(3, 'Rural Access', 'Local gravel/dirt roads', 4.5)
ON CONFLICT (id) DO NOTHING;
ALTER TABLE public.road_types ENABLE ROW LEVEL SECURITY;
CREATE POLICY "road_types_select" ON road_types FOR SELECT TO authenticated USING (true);
ALTER TABLE public.road_types OWNER TO postgres;
GRANT ALL ON TABLE public.road_types TO authenticated;
GRANT ALL ON TABLE public.road_types TO anon;

-- Registrations table
CREATE TABLE IF NOT EXISTS public.registrations (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name text NOT NULL,
    email text NOT NULL,
    phone text,
    password_hash text,
    requested_role text,
    status text DEFAULT 'pending',
    created_at timestamptz DEFAULT now()
);
ALTER TABLE public.registrations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "registrations_insert" ON registrations FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "registrations_select" ON registrations FOR SELECT TO authenticated USING (true);
ALTER TABLE public.registrations OWNER TO postgres;
GRANT ALL ON TABLE public.registrations TO authenticated;
GRANT ALL ON TABLE public.registrations TO anon;

-- Audit logs table
CREATE TABLE IF NOT EXISTS public.audit_logs (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid,
    user_name varchar(255),
    action varchar(100) NOT NULL,
    entity_type varchar(100),
    entity_id uuid,
    entity_name varchar(255),
    severity varchar(20) DEFAULT 'INFO',
    metadata jsonb DEFAULT '{}',
    timestamp timestamptz DEFAULT now()
);
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "audit_logs_insert" ON audit_logs FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "audit_logs_select" ON audit_logs FOR SELECT TO authenticated USING (true);
ALTER TABLE public.audit_logs OWNER TO postgres;
GRANT ALL ON TABLE public.audit_logs TO authenticated;
GRANT ALL ON TABLE public.audit_logs TO anon;

-- Alignments table
CREATE TABLE IF NOT EXISTS public.alignments (
    id varchar(255) NOT NULL,
    road_id varchar(255) NOT NULL,
    name varchar(255) NOT NULL,
    type varchar(50) NOT NULL,
    total_length numeric,
    kml_data text
);
ALTER TABLE public.alignments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "alignments_select" ON alignments FOR SELECT TO authenticated USING (true);
ALTER TABLE public.alignments OWNER TO postgres;
GRANT ALL ON TABLE public.alignments TO authenticated;
GRANT ALL ON TABLE public.alignments TO anon;

-- Chainage points table
CREATE TABLE IF NOT EXISTS public.chainage_points (
    id integer NOT NULL,
    alignment_id varchar(255) NOT NULL,
    chainage_id varchar(50) NOT NULL,
    distance numeric NOT NULL,
    lat numeric NOT NULL,
    lng numeric NOT NULL,
    alt numeric
);
CREATE SEQUENCE IF NOT EXISTS chainage_points_id_seq;
ALTER TABLE public.chainage_points ENABLE ROW LEVEL SECURITY;
CREATE POLICY "chainage_points_select" ON chainage_points FOR SELECT TO authenticated USING (true);
ALTER TABLE public.chainage_points OWNER TO postgres;
GRANT ALL ON TABLE public.chainage_points TO authenticated;
GRANT ALL ON TABLE public.chainage_points TO anon;

-- Structures table
CREATE TABLE IF NOT EXISTS public.structures (
    id varchar(255) NOT NULL,
    road_id varchar(255) NOT NULL,
    type varchar(100) NOT NULL,
    name varchar(255) NOT NULL,
    chainage varchar(50) NOT NULL,
    distance numeric NOT NULL,
    geometry jsonb,
    alignments text[],
    properties jsonb
);
ALTER TABLE public.structures ENABLE ROW LEVEL SECURITY;
CREATE POLICY "structures_select" ON structures FOR SELECT TO authenticated USING (true);
ALTER TABLE public.structures OWNER TO postgres;
GRANT ALL ON TABLE public.structures TO authenticated;
GRANT ALL ON TABLE public.structures TO anon;

-- Project documents table
CREATE TABLE IF NOT EXISTS public.project_documents (
    id text NOT NULL,
    project_id text,
    name text NOT NULL,
    folder text,
    tags text[] DEFAULT '{}',
    subject text,
    ref_no text,
    size text,
    type text,
    status text DEFAULT 'Active',
    metadata jsonb DEFAULT '{}',
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);
ALTER TABLE public.project_documents ENABLE ROW LEVEL SECURITY;
CREATE POLICY "project_documents_select" ON project_documents FOR SELECT TO authenticated USING (true);
CREATE POLICY "project_documents_insert" ON project_documents FOR INSERT TO authenticated WITH CHECK (true);
ALTER TABLE public.project_documents OWNER TO postgres;
GRANT ALL ON TABLE public.project_documents TO authenticated;
GRANT ALL ON TABLE public.project_documents TO anon;

-- Project site photos table
CREATE TABLE IF NOT EXISTS public.project_site_photos (
    id text NOT NULL,
    project_id text,
    url text NOT NULL,
    caption text,
    location_lat numeric,
    location_lng numeric,
    uploaded_by text,
    created_at timestamptz DEFAULT now()
);
ALTER TABLE public.project_site_photos ENABLE ROW LEVEL SECURITY;
CREATE POLICY "project_site_photos_select" ON project_site_photos FOR SELECT TO authenticated USING (true);
CREATE POLICY "project_site_photos_insert" ON project_site_photos FOR INSERT TO authenticated WITH CHECK (true);
ALTER TABLE public.project_site_photos OWNER TO postgres;
GRANT ALL ON TABLE public.project_site_photos TO authenticated;
GRANT ALL ON TABLE public.project_site_photos TO anon;

-- Document versions table
CREATE TABLE IF NOT EXISTS public.document_versions (
    id text NOT NULL,
    doc_id text,
    blob_url text NOT NULL,
    version_num integer NOT NULL,
    size bigint,
    notes text,
    created_at timestamptz DEFAULT now()
);
ALTER TABLE public.document_versions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "document_versions_select" ON document_versions FOR SELECT TO authenticated USING (true);
ALTER TABLE public.document_versions OWNER TO postgres;
GRANT ALL ON TABLE public.document_versions TO authenticated;
GRANT ALL ON TABLE public.document_versions TO anon;

-- Staff locations table
CREATE TABLE IF NOT EXISTS public.staff_locations (
    project_id text NOT NULL,
    user_id uuid NOT NULL,
    latitude numeric NOT NULL,
    longitude numeric NOT NULL,
    timestamp timestamptz DEFAULT now(),
    status varchar(50) DEFAULT 'Active',
    user_name varchar(255),
    user_role varchar(50)
);
ALTER TABLE public.staff_locations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "staff_locations_select" ON staff_locations FOR SELECT TO authenticated USING (true);
CREATE POLICY "staff_locations_insert" ON staff_locations FOR INSERT TO authenticated WITH CHECK (true);
ALTER TABLE public.staff_locations OWNER TO postgres;
GRANT ALL ON TABLE public.staff_locations TO authenticated;
GRANT ALL ON TABLE public.staff_locations TO anon;

-- ==================== REFRESH SCHEMA ====================
NOTIFY pgrst, 'reload schema';

SELECT 'Schema setup complete!' as status;
