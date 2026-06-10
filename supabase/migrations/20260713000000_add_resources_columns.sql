-- Add missing resources, resource_allocations, and milestones columns for ResourceMatrixModule
-- This fixes the issue where Add Resource button functionality cannot persist to database

ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS resources jsonb DEFAULT '[]';
ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS resource_allocations jsonb DEFAULT '[]';
ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS milestones jsonb DEFAULT '[]';

-- Grant necessary permissions
GRANT ALL ON TABLE public.projects TO authenticated;
GRANT ALL ON TABLE public.projects TO anon;
GRANT ALL ON TABLE public.projects TO service_role;

-- Create index for faster resource lookups
CREATE INDEX IF NOT EXISTS idx_projects_resources ON public.projects USING gin(resources);
CREATE INDEX IF NOT EXISTS idx_projects_resource_allocations ON public.projects USING gin(resource_allocations);
CREATE INDEX IF NOT EXISTS idx_projects_milestones ON public.projects USING gin(milestones);
