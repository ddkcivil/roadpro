-- Idempotent migration: normalize `projects` and `profiles` schema to snake_case
-- Safe and non-destructive where possible. Run in Supabase SQL Editor or via `supabase db push`.

BEGIN;

-- 1) Ensure canonical columns exist on projects
ALTER TABLE public.projects
  ADD COLUMN IF NOT EXISTS owner_id UUID,
  ADD COLUMN IF NOT EXISTS description TEXT,
  ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW(),
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW(),
  ADD COLUMN IF NOT EXISTS contract_no TEXT,
  ADD COLUMN IF NOT EXISTS start_date TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS end_date TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS client TEXT;

-- 2) Migrate/rename known variants into canonical columns
-- Removed DO block because the columns are now created as snake_case natively in 20241202_create_projects_table.sql

-- 3) Add foreign key and indexes
-- Skipped adding constraints and indexes here because they are natively handled in 20241202_create_projects_table.sql
CREATE INDEX IF NOT EXISTS idx_projects_contract_no ON public.projects(contract_no);

-- 4) Ensure updated_at auto-update trigger
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

-- 5) Ensure owner set-on-insert trigger (if owner_id omitted)
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

-- 6) Enable RLS and canonical policies (idempotent creation via conditional checks)
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'projects' AND policyname = 'Authenticated users can view projects') THEN
    CREATE POLICY "Authenticated users can view projects" ON public.projects
      FOR SELECT TO authenticated
      USING (true);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'projects' AND policyname = 'Authenticated users can insert projects') THEN
    CREATE POLICY "Authenticated users can insert projects" ON public.projects
      FOR INSERT TO authenticated
      WITH CHECK (true);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'projects' AND policyname = 'Owners or admins can update projects') THEN
    CREATE POLICY "Owners or admins can update projects" ON public.projects
      FOR UPDATE TO authenticated
      USING (owner_id = auth.uid() OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND LOWER(role) = 'admin'));
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'projects' AND policyname = 'Owners or admins can delete projects') THEN
    CREATE POLICY "Owners or admins can delete projects" ON public.projects
      FOR DELETE TO authenticated
      USING (owner_id = auth.uid() OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND LOWER(role) = 'admin'));
  END IF;
END$$;

-- 7) Ensure profiles table has expected columns (non-destructive)
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW(),
  ADD COLUMN IF NOT EXISTS status VARCHAR(50) DEFAULT 'active';

CREATE INDEX IF NOT EXISTS idx_profiles_role ON public.profiles(role);

-- 8) Optional JSONB columns used by frontend
ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS accountingintegrations JSONB DEFAULT '[]'::jsonb;
ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS accountingtransactions JSONB DEFAULT '[]'::jsonb;
ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS structuretemplates JSONB DEFAULT '[]'::jsonb;
ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS auditlogs JSONB DEFAULT '[]'::jsonb;

COMMIT;

-- Verify
SELECT 'standardize_projects_profiles: completed' as status;
