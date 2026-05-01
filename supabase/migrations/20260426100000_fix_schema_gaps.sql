-- Fix schema gaps identified during app/database alignment audit
-- Run this in Supabase SQL Editor or via CLI: supabase db push

-- 1. Add missing JSONB columns to projects (expected by frontend mappers)
ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS accountingintegrations JSONB DEFAULT '[]'::jsonb;
ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS accountingtransactions JSONB DEFAULT '[]'::jsonb;
ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS structuretemplates JSONB DEFAULT '[]'::jsonb;
ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS auditlogs JSONB DEFAULT '[]'::jsonb;

-- 2. Add owner_id and description (expected by earlier migrations and RLS)
ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS owner_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL;
ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS description TEXT;

-- 3. Trigger to auto-set owner_id on INSERT via authenticated client
CREATE OR REPLACE FUNCTION set_project_owner()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.owner_id IS NULL AND auth.uid() IS NOT NULL THEN
        NEW.owner_id = auth.uid();
    END IF;
    RETURN NEW;
END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS set_project_owner_trigger ON public.projects;
CREATE TRIGGER set_project_owner_trigger
    BEFORE INSERT ON public.projects
    FOR EACH ROW EXECUTE FUNCTION set_project_owner();

-- 4. Fix RLS policies for projects
-- Enable RLS (idempotent)
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;

-- Drop old policies that may reference missing columns
DROP POLICY IF EXISTS "Users can view own projects" ON public.projects;
DROP POLICY IF EXISTS "Users can insert own projects" ON public.projects;
DROP POLICY IF EXISTS "Users can update own projects" ON public.projects;
DROP POLICY IF EXISTS "Users can delete own projects" ON public.projects;

-- Allow all authenticated users to view projects
DROP POLICY IF EXISTS "Authenticated users can view projects" ON public.projects;
CREATE POLICY "Authenticated users can view projects" ON public.projects
    FOR SELECT TO authenticated
    USING (true);

-- Allow authenticated users to insert (owner_id set by trigger)
CREATE POLICY "Authenticated users can insert projects" ON public.projects
    FOR INSERT TO authenticated
    WITH CHECK (true);

-- Allow owners or admins to update
CREATE POLICY "Owners or admins can update projects" ON public.projects
    FOR UPDATE TO authenticated
    USING (owner_id = auth.uid() OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin', 'ADMIN')));

-- Allow owners or admins to delete
CREATE POLICY "Owners or admins can delete projects" ON public.projects
    FOR DELETE TO authenticated
    USING (owner_id = auth.uid() OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin', 'ADMIN')));

-- 5. Fix messages RLS policies (ensure they work with text project_id)
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view project messages" ON public.messages;
DROP POLICY IF EXISTS "Users can insert messages" ON public.messages;

CREATE POLICY "Authenticated users can view messages" ON public.messages
    FOR SELECT TO authenticated
    USING (true);

CREATE POLICY "Authenticated users can insert messages" ON public.messages
    FOR INSERT TO authenticated
    WITH CHECK (sender_id = auth.uid());

-- 6. Fix staff_locations RLS
ALTER TABLE public.staff_locations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Authenticated users can view staff locations" ON public.staff_locations;
DROP POLICY IF EXISTS "Authenticated users can upsert staff locations" ON public.staff_locations;

CREATE POLICY "Authenticated users can view staff locations" ON public.staff_locations
    FOR SELECT TO authenticated
    USING (true);

CREATE POLICY "Authenticated users can upsert own location" ON public.staff_locations
    FOR ALL TO authenticated
    USING (user_id = auth.uid())
    WITH CHECK (user_id = auth.uid());

-- 7. Ensure registrations table has RLS for public signup
ALTER TABLE public.registrations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can submit registrations" ON public.registrations;
CREATE POLICY "Anyone can submit registrations" ON public.registrations
    FOR INSERT TO anon, authenticated
    WITH CHECK (true);

CREATE POLICY "Authenticated users can view registrations" ON public.registrations
    FOR SELECT TO authenticated
    USING (true);

-- 8. Indexes for new columns
CREATE INDEX IF NOT EXISTS idx_projects_owner_id ON public.projects(owner_id);

SELECT 'Schema gap fixes applied successfully!' as status;
