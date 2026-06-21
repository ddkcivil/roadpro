-- Add missing subcontractor_payments column for legacy SubcontractorModule
-- This fixes the issue where subcontractor payments are not saving/fetching

ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS subcontractor_payments jsonb DEFAULT '[]';

-- Grant necessary permissions
GRANT ALL ON TABLE public.projects TO authenticated;
GRANT ALL ON TABLE public.projects TO anon;
GRANT ALL ON TABLE public.projects TO service_role;

-- Create index for faster subcontractor payment lookups
CREATE INDEX IF NOT EXISTS idx_projects_subcontractor_payments ON public.projects USING gin(subcontractor_payments);

DO $$
BEGIN
    RAISE NOTICE 'Added subcontractor_payments column to projects table';
END
$$;
