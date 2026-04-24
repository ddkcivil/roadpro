-- Fix for "column projects.created_at does not exist" error
-- Adds missing timestamp columns and aligns ID type with API expectations
-- Safe operations using IF NOT EXISTS where possible

-- Add created_at column if missing (used in api/projects.ts .order('created_at'))
ALTER TABLE public.projects
ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();

-- Add updated_at column if missing (used in INSERT/UPDATE in api/projects.ts)
ALTER TABLE public.projects
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- Performance index for common ordering in api/projects.ts
CREATE INDEX IF NOT EXISTS idx_projects_created_at
ON public.projects(created_at DESC);

-- Optional: Trigger to auto-update updated_at (Supabase best practice)
-- Drop existing trigger first (safe)
DROP TRIGGER IF EXISTS update_projects_updated_at ON public.projects;

-- Create/replace function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger (no IF NOT EXISTS needed after DROP)
CREATE TRIGGER update_projects_updated_at
    BEFORE UPDATE ON public.projects
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Verify changes (run separately in Supabase SQL editor)
-- SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'projects';
-- SELECT * FROM projects ORDER BY created_at DESC LIMIT 5;

COMMENT ON TABLE public.projects IS 'Projects table - fixed schema for created_at/updated_at and text ID compatibility';
