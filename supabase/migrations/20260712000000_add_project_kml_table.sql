-- Migration: Add project_kml table
-- Date: 2026-07-12
-- Purpose: Fix missing table that causes 500 errors in Vercel logs

-- Create the project_kml table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.project_kml (
    id text NOT NULL PRIMARY KEY,
    project_id text NOT NULL,
    name text NOT NULL,
    kml_content text,
    timestamp timestamp with time zone DEFAULT now(),
    visible boolean DEFAULT true,
    color text,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    CONSTRAINT project_kml_project_id_fkey FOREIGN KEY (project_id) 
        REFERENCES public.projects(id) ON DELETE CASCADE
);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_project_kml_project_id 
    ON public.project_kml (project_id);

-- Enable RLS
ALTER TABLE public.project_kml ENABLE ROW LEVEL SECURITY;

-- RLS Policies
DROP POLICY IF EXISTS "project_kml_select" ON public.project_kml;
CREATE POLICY "project_kml_select" ON public.project_kml FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "project_kml_insert" ON public.project_kml;
CREATE POLICY "project_kml_insert" ON public.project_kml FOR INSERT TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "project_kml_update" ON public.project_kml;
CREATE POLICY "project_kml_update" ON public.project_kml FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "project_kml_delete" ON public.project_kml;
CREATE POLICY "project_kml_delete" ON public.project_kml FOR DELETE TO authenticated USING (true);

-- Grant permissions
GRANT ALL ON TABLE public.project_kml TO anon;
GRANT ALL ON TABLE public.project_kml TO authenticated;
GRANT ALL ON TABLE public.project_kml TO service_role;

-- Create trigger to auto-update updated_at
DROP TRIGGER IF EXISTS tr_project_kml_updated_at ON public.project_kml;
CREATE OR REPLACE TRIGGER tr_project_kml_updated_at 
    BEFORE UPDATE ON public.project_kml 
    FOR EACH ROW EXECUTE FUNCTION public.update_project_documents_updated_at();

-- Refresh schema cache so PostgREST sees the new table
NOTIFY pgrst, 'reload schema';

SELECT 'project_kml table created successfully' as status;
