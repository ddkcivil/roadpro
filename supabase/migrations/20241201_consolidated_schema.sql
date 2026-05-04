-- Consolidated Migration: All schema definitions combined
-- Created from: All 17 original migration files (20241201 to 20260504120000)
-- Created: 2025 (consolidated from historical migrations)
-- Note: This file replaces multiple small migrations. Run in order if starting fresh.

BEGIN;

-- ============================================================================
-- SECTION 1: CORE TABLES - Profiles and Projects
-- ============================================================================

-- Create profiles table
CREATE TABLE IF NOT EXISTS public.profiles (
  id uuid PRIMARY KEY,
  full_name text,
  avatar_url text,
  role text DEFAULT 'USER',
  status text DEFAULT 'active',
  last_seen timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  phone text,
  email text
);

-- Enable RLS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Function to handle new user
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, role)
  VALUES (new.id, new.raw_user_meta_data->>'full_name', 'User');
  RETURN new;
END;
$$ language plpgsql security definer;

-- Trigger
CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- Profiles indexes
CREATE INDEX IF NOT EXISTS profiles_role_idx ON public.profiles(role);
CREATE INDEX IF NOT EXISTS idx_profiles_role ON public.profiles(role);
CREATE INDEX IF NOT EXISTS idx_profiles_status ON public.profiles(status);
CREATE INDEX IF NOT EXISTS idx_profiles_email ON public.profiles(email);

-- Admin RLS Policies for Profiles (idempotent - drop first if exists)
DROP POLICY IF EXISTS "Admin full access to profiles" ON public.profiles;
CREATE POLICY "Admin full access to profiles" ON public.profiles
  FOR ALL
  USING (EXISTS (
    SELECT 1 FROM public.profiles admin_profile 
    WHERE admin_profile.id = auth.uid() 
    AND admin_profile.role IN ('Admin', 'ADMIN')
  ))
  WITH CHECK (true);

DROP POLICY IF EXISTS "Users view own profile" ON public.profiles;
CREATE POLICY "Users view own profile" ON public.profiles
  FOR SELECT
  USING (
    auth.uid() = id 
    OR EXISTS (
      SELECT 1 FROM public.profiles admin_profile 
      WHERE admin_profile.id = auth.uid() 
      AND admin_profile.role IN ('Admin', 'ADMIN')
    )
  );

DROP POLICY IF EXISTS "Users update own profile" ON public.profiles;
CREATE POLICY "Users update own profile" ON public.profiles
  FOR UPDATE
  USING (
    auth.uid() = id
    OR EXISTS (
      SELECT 1 FROM public.profiles admin_profile 
      WHERE admin_profile.id = auth.uid() 
      AND admin_profile.role IN ('Admin', 'ADMIN')
    )
  )
  WITH CHECK (
    (auth.uid() = id)
    OR EXISTS (
      SELECT 1 FROM public.profiles admin_profile 
      WHERE admin_profile.id = auth.uid() 
      AND admin_profile.role IN ('Admin', 'ADMIN')
    )
  );

DROP POLICY IF EXISTS "Users insert own profile" ON public.profiles;
CREATE POLICY "Users insert own profile" ON public.profiles
  FOR INSERT
  WITH CHECK (auth.uid() = id);

-- Create projects table
CREATE TABLE IF NOT EXISTS public.projects (
  id text PRIMARY KEY,
  name text NOT NULL,
  client text,
  owner_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  contract_no text,
  location text,
  status text DEFAULT 'active',
  budget numeric,
  start_date timestamptz,
  end_date timestamptz,
  description text,
  contractor text,
  metadata jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  -- Additional JSONB columns
  roads jsonb DEFAULT '[]'::jsonb,
  accountingintegrations jsonb DEFAULT '[]'::jsonb,
  accountingtransactions jsonb DEFAULT '[]'::jsonb,
  structuretemplates jsonb DEFAULT '[]'::jsonb,
  auditlogs jsonb DEFAULT '[]'::jsonb,
  -- BOQ and related columns
  boq jsonb DEFAULT '[]'::jsonb,
  variation_orders jsonb DEFAULT '[]'::jsonb,
  measurement_sheets jsonb DEFAULT '[]'::jsonb
);

-- Projects indexes
CREATE INDEX IF NOT EXISTS idx_projects_owner_id ON public.projects(owner_id);
CREATE INDEX IF NOT EXISTS idx_projects_created_at ON public.projects(created_at);
CREATE INDEX IF NOT EXISTS idx_projects_name ON public.projects(name);
CREATE INDEX IF NOT EXISTS idx_projects_contract_no ON public.projects(contract_no);

-- Enable RLS
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;

-- Projects RLS Policies (idempotent - drop first if exists)
DROP POLICY IF EXISTS "Authenticated users can view projects" ON public.projects;
CREATE POLICY "Authenticated users can view projects" ON public.projects
  FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Authenticated users can insert projects" ON public.projects;
CREATE POLICY "Authenticated users can insert projects" ON public.projects
  FOR INSERT TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "Owners or admins can update projects" ON public.projects;
CREATE POLICY "Owners or admins can update projects" ON public.projects
  FOR UPDATE TO authenticated
  USING (owner_id = auth.uid() OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND LOWER(role) = 'admin'));

DROP POLICY IF EXISTS "Owners or admins can delete projects" ON public.projects;
CREATE POLICY "Owners or admins can delete projects" ON public.projects
  FOR DELETE TO authenticated
  USING (owner_id = auth.uid() OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND LOWER(role) = 'admin'));

-- Seed general project
INSERT INTO public.projects (id, name, client, owner_id) 
VALUES ('general', 'General Project', 'System', NULL)
ON CONFLICT (id) DO NOTHING;

-- Trigger functions
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_projects_updated_at ON public.projects;
CREATE TRIGGER update_projects_updated_at
  BEFORE UPDATE ON public.projects
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE OR REPLACE FUNCTION public.set_project_owner()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.owner_id IS NULL AND auth.uid() IS NOT NULL THEN
    NEW.owner_id = auth.uid();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS set_project_owner_trigger ON public.projects;
CREATE TRIGGER set_project_owner_trigger
  BEFORE INSERT ON public.projects
  FOR EACH ROW EXECUTE FUNCTION public.set_project_owner();

-- ============================================================================
-- SECTION 2: ROAD TABLES
-- ============================================================================

-- Table for roads
CREATE TABLE IF NOT EXISTS public.roads (
  id VARCHAR(255) PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  chainage_offset NUMERIC,
  geometry JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Table for alignments
CREATE TABLE IF NOT EXISTS public.alignments (
  id VARCHAR(255) PRIMARY KEY,
  road_id VARCHAR(255) NOT NULL REFERENCES public.roads(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  type VARCHAR(50) NOT NULL CHECK (type IN ('Pavement', 'Drainage', 'Footpath', 'Kerb', 'service')),
  total_length NUMERIC,
  kml_data TEXT
);

-- Table for structures
CREATE TABLE IF NOT EXISTS public.structures (
  id VARCHAR(255) PRIMARY KEY,
  road_id VARCHAR(255) NOT NULL REFERENCES public.roads(id) ON DELETE CASCADE,
  type VARCHAR(100) NOT NULL CHECK (type IN ('Box Culvert', 'Pipe Culvert', 'Bridge', 'Retaining Wall', 'Abutment', 'Pier', 'Slab Culvert', 'Minor Bridge', 'Major Bridge', 'Drainage (Lined)', 'Drainage (Unlined)', 'Breast Wall', 'Pavement (Flexible)', 'Pavement (Rigid)', 'Footpath', 'Utility Duct', 'Street Light Base', 'Road Signal', 'Junction Box', 'Median Barrier', 'Pedestrian Guardrail', 'Bus Shelter', 'culvert', 'box-culvert', 'bridge', 'underpass')),
  name VARCHAR(255) NOT NULL,
  chainage VARCHAR(50) NOT NULL,
  distance NUMERIC NOT NULL,
  geometry JSONB,
  alignments TEXT[],
  properties JSONB
);

-- Table for chainage_points
CREATE TABLE IF NOT EXISTS public.chainage_points (
  id SERIAL PRIMARY KEY,
  alignment_id VARCHAR(255) NOT NULL REFERENCES public.alignments(id) ON DELETE CASCADE,
  chainage_id VARCHAR(50) NOT NULL,
  distance NUMERIC NOT NULL,
  lat NUMERIC NOT NULL,
  lng NUMERIC NOT NULL,
  alt NUMERIC
);

-- Road table indexes
CREATE INDEX IF NOT EXISTS idx_alignments_road_id ON public.alignments(road_id);
CREATE INDEX IF NOT EXISTS idx_structures_road_id ON public.structures(road_id);
CREATE INDEX IF NOT EXISTS idx_chainage_points_alignment_id ON public.chainage_points(alignment_id);

-- ============================================================================
-- SECTION 3: REFERENCE TABLES
-- ============================================================================

-- Table for road types reference
CREATE TABLE IF NOT EXISTS public.road_types (
  id INTEGER PRIMARY KEY,
  type_name VARCHAR(100) NOT NULL UNIQUE,
  description TEXT,
  standard_width NUMERIC
);

-- ============================================================================
-- SECTION 4: OPERATIONAL TABLES
-- ============================================================================

-- Table for messages
CREATE TABLE IF NOT EXISTS public.messages (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id text REFERENCES public.projects(id) ON DELETE CASCADE,
  sender_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  receiver_id text,
  content TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  read_at TIMESTAMP WITH TIME ZONE,
  read boolean DEFAULT false,
  attachment_url text,
  attachment_name text,
  attachment_type text
);

-- Messages indexes
CREATE INDEX IF NOT EXISTS idx_messages_project_id ON public.messages(project_id);
CREATE INDEX IF NOT EXISTS idx_messages_sender_id ON public.messages(sender_id);

-- Enable RLS
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Authenticated users can view messages" ON public.messages;
CREATE POLICY "Authenticated users can view messages" ON public.messages
  FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Authenticated users can insert messages" ON public.messages;
CREATE POLICY "Authenticated users can insert messages" ON public.messages
  FOR INSERT TO authenticated WITH CHECK (sender_id = auth.uid());

-- Table for audit_logs
CREATE TABLE IF NOT EXISTS public.audit_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  user_name VARCHAR(255),
  action VARCHAR(100) NOT NULL,
  entity_type VARCHAR(100),
  entity_id UUID,
  entity_name VARCHAR(255),
  severity VARCHAR(20) DEFAULT 'INFO',
  metadata JSONB DEFAULT '{}',
  timestamp TIMESTAMPTZ DEFAULT NOW()
);

-- Audit logs indexes
CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id ON public.audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_timestamp ON public.audit_logs(timestamp);
CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON public.audit_logs(action);

-- Enable RLS
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Authenticated users can insert audit logs" ON public.audit_logs;
CREATE POLICY "Authenticated users can insert audit logs" ON public.audit_logs
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid()::text = user_id::text OR auth.role() = 'service_role');

DROP POLICY IF EXISTS "Admins can read audit logs" ON public.audit_logs;
CREATE POLICY "Admins can read audit logs" ON public.audit_logs
  FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin', 'ADMIN')));

-- Table for staff locations
CREATE TABLE IF NOT EXISTS public.staff_locations (
  project_id TEXT REFERENCES public.projects(id) ON DELETE CASCADE,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  latitude NUMERIC NOT NULL,
  longitude NUMERIC NOT NULL,
  timestamp TIMESTAMPTZ DEFAULT NOW(),
  status VARCHAR(50) DEFAULT 'Active',
  user_name VARCHAR(255),
  user_role VARCHAR(50),
  PRIMARY KEY (project_id, user_id)
);

-- Enable RLS
ALTER TABLE public.staff_locations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Authenticated users can view staff locations" ON public.staff_locations;
CREATE POLICY "Authenticated users can view staff locations" ON public.staff_locations
  FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Authenticated users can upsert own location" ON public.staff_locations;
CREATE POLICY "Authenticated users can upsert own location" ON public.staff_locations
  FOR ALL TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Table for registrations
CREATE TABLE IF NOT EXISTS public.registrations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  phone TEXT,
  passwordHash TEXT,
  requestedRole TEXT,
  status TEXT DEFAULT 'pending',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.registrations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can submit registrations" ON public.registrations;
CREATE POLICY "Anyone can submit registrations" ON public.registrations
  FOR INSERT TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "Authenticated users can view registrations" ON public.registrations;
CREATE POLICY "Authenticated users can view registrations" ON public.registrations
  FOR SELECT TO authenticated USING (true);

-- ============================================================================
-- SECTION 5: DOCUMENT TABLES
-- ============================================================================

-- Table for project_documents
CREATE TABLE IF NOT EXISTS public.project_documents (
  id text PRIMARY KEY,
  project_id text REFERENCES public.projects(id) ON DELETE CASCADE,
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

-- Table for document_versions
CREATE TABLE IF NOT EXISTS public.document_versions (
  id text PRIMARY KEY,
  doc_id text REFERENCES public.project_documents(id) ON DELETE CASCADE,
  blob_url text NOT NULL,
  version_num integer NOT NULL,
  size bigint,
  notes text,
  created_at timestamptz DEFAULT now()
);

-- Table for project_site_photos
CREATE TABLE IF NOT EXISTS public.project_site_photos (
  id text PRIMARY KEY,
  project_id text REFERENCES public.projects(id) ON DELETE CASCADE,
  url text NOT NULL,
  caption text,
  location_lat numeric,
  location_lng numeric,
  uploaded_by text,
  created_at timestamptz DEFAULT now()
);

-- Document table indexes
CREATE INDEX IF NOT EXISTS idx_project_documents_project_id ON public.project_documents(project_id);
CREATE INDEX IF NOT EXISTS idx_document_versions_doc_id ON public.document_versions(doc_id);
CREATE INDEX IF NOT EXISTS idx_project_site_photos_project_id ON public.project_site_photos(project_id);

-- Enable RLS
ALTER TABLE public.project_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.document_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_site_photos ENABLE ROW LEVEL SECURITY;

-- Document RLS Policies (idempotent - drop first if exists)
DROP POLICY IF EXISTS "Authenticated users can view documents" ON public.project_documents;
CREATE POLICY "Authenticated users can view documents" ON public.project_documents
  FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Authenticated users can view document versions" ON public.document_versions;
CREATE POLICY "Authenticated users can view document versions" ON public.document_versions
  FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Authenticated users can view site photos" ON public.project_site_photos;
CREATE POLICY "Authenticated users can view site photos" ON public.project_site_photos
  FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Authenticated users can insert documents" ON public.project_documents;
CREATE POLICY "Authenticated users can insert documents" ON public.project_documents
  FOR INSERT TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "Authenticated users can insert document versions" ON public.document_versions;
CREATE POLICY "Authenticated users can insert document versions" ON public.document_versions
  FOR INSERT TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "Authenticated users can insert site photos" ON public.project_site_photos;
CREATE POLICY "Authenticated users can insert site photos" ON public.project_site_photos
  FOR INSERT TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "Authorized users can update documents" ON public.project_documents;
CREATE POLICY "Authorized users can update documents" ON public.project_documents
  FOR UPDATE TO authenticated USING (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE id = auth.uid() AND role IN ('ADMIN', 'PROJECT MANAGER', 'MANAGER', 'PROJECT_MANAGER')
    )
  );

DROP POLICY IF EXISTS "Authorized users can delete documents" ON public.project_documents;
CREATE POLICY "Authorized users can delete documents" ON public.project_documents
  FOR DELETE TO authenticated USING (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE id = auth.uid() AND role IN ('ADMIN', 'PROJECT MANAGER', 'MANAGER', 'PROJECT_MANAGER')
    )
  );

-- Trigger for updated_at on project_documents
CREATE OR REPLACE FUNCTION update_project_documents_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS tr_project_documents_updated_at ON public.project_documents;
CREATE TRIGGER tr_project_documents_updated_at
  BEFORE UPDATE ON public.project_documents
  FOR EACH ROW EXECUTE FUNCTION update_project_documents_updated_at();

COMMIT;

-- ============================================================================
-- VERIFICATION
-- ============================================================================

SELECT 'Consolidated migration completed successfully!' as status;

-- List all tables created
SELECT schemaname, tablename 
FROM pg_tables 
WHERE schemaname = 'public' 
ORDER BY tablename;

-- List all RLS policies
SELECT tablename, policyname 
FROM pg_policies 
WHERE schemaname = 'public' 
ORDER BY tablename, policyname;
