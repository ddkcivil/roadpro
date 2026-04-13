-- Migration 001: Create projects & staffLocations tables + RLS

-- Projects table
CREATE TABLE IF NOT EXISTS public.projects (
  id text PRIMARY KEY,
  name text NOT NULL,
  client text NOT NULL,
  description text,
  status text DEFAULT 'active',
  start_date timestamptz,
  end_date timestamptz,
  budget numeric,
  latitude numeric,
  longitude numeric,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL
);

-- Staff locations table (from PATCH update-location)
CREATE TABLE IF NOT EXISTS public.staffLocations (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id text REFERENCES public.projects(id) ON DELETE CASCADE,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  latitude numeric NOT NULL,
  longitude numeric NOT NULL,
  timestamp timestamptz DEFAULT now() NOT NULL,
  status text DEFAULT 'Active',
  user_name text,
  user_role text
);

-- RLS for projects
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admin full access" ON public.projects FOR ALL USING (true); -- Adjust with auth.jwt()
CREATE POLICY "Users read projects" ON public.projects FOR SELECT USING (true);

-- RLS for staffLocations
ALTER TABLE public.staffLocations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Staff can insert/update own location" ON public.staffLocations FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Admins full access" ON public.staffLocations FOR ALL USING (true);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_projects_status ON public.projects(status);
CREATE INDEX IF NOT EXISTS idx_projects_client ON public.projects(client);
CREATE INDEX IF NOT EXISTS idx_staff_locations_project_user ON public.staffLocations(project_id, user_id);
CREATE INDEX IF NOT EXISTS idx_staff_locations_timestamp ON public.staffLocations(timestamp);

-- Trigger for updated_at
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
   NEW.updated_at = now();
   RETURN NEW;
END;
$$ language plpgsql;

CREATE TRIGGER update_projects_updated_at BEFORE UPDATE ON public.projects
FOR EACH ROW EXECUTE PROCEDURE public.handle_updated_at();
