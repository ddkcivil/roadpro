-- Create projects table
CREATE TABLE IF NOT EXISTS public.projects (
  id text PRIMARY KEY,
  name text NOT NULL,
  client text NOT NULL,
  description text,
  status text DEFAULT 'active',
  start_date timestamptz,
  end_date timestamptz,
  budget numeric,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;

-- Policy for admin full access
CREATE POLICY "Admin full access" ON public.projects
FOR ALL USING (auth.role() = 'service_role') OR (auth.jwt() ->> 'role' = 'Admin');

-- Policy for authenticated read
CREATE POLICY "Users can read projects" ON public.projects
FOR SELECT USING (true);

-- Index
CREATE INDEX idx_projects_status ON public.projects(status);
CREATE INDEX idx_projects_client ON public.projects(client);

-- Trigger for updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated
