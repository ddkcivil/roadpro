-- Migration: Create projects table with RLS policies
-- Run in Supabase Dashboard → SQL Editor

-- 1. Create table
CREATE TABLE IF NOT EXISTS public.projects (
  id text PRIMARY KEY,
  name text NOT NULL,
  client text NOT NULL,
  owner_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  contract_no text,
  location text,
  status text,
  budget numeric,
  start_date timestamptz,
  end_date timestamptz,
  description text,
  metadata jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- 2. Add indexes
CREATE INDEX IF NOT EXISTS idx_projects_owner_id ON public.projects(owner_id);
CREATE INDEX IF NOT EXISTS idx_projects_created_at ON public.projects(created_at);
CREATE INDEX IF NOT EXISTS idx_projects_name ON public.projects(name);

-- 3. Enable RLS
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;

-- 4. RLS Policies
-- All authenticated users can view projects
CREATE POLICY "Authenticated users can view projects" ON public.projects
FOR SELECT USING (auth.role() = 'authenticated');

-- Users can create projects they own
CREATE POLICY "Users can create own projects" ON public.projects
FOR INSERT WITH CHECK (owner_id = auth.uid());

-- Users can update own projects
CREATE POLICY "Users can update own projects" ON public.projects  
FOR UPDATE USING (owner_id = auth.uid());

-- Admins can update any project (via service role or profile role check in app)
CREATE POLICY "Admins can update all projects" ON public.projects
FOR UPDATE USING (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() AND role = 'ADMIN'
  )
);

-- Admins can delete projects
CREATE POLICY "Admins can delete projects" ON public.projects
FOR DELETE USING (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() AND role = 'ADMIN'
  )
);

-- 5. Seed general project if missing
INSERT INTO public.projects (id, name, client, owner_id) 
VALUES ('general', 'General Project', 'System', NULL)
ON CONFLICT (id) DO NOTHING;

-- 6. Verify
SELECT 'Projects table created successfully' as status;
SELECT count(*) as project_count FROM public.projects;
SELECT schemaname, tablename, rowsecurity 
FROM pg_tables t 
JOIN pg_namespace n ON n.oid = t.schemaname::regnamespace 
WHERE tablename = 'projects';
