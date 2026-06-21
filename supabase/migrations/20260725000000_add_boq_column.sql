-- Add missing JSONB columns for BOQ and other project data
-- Run this in Supabase SQL Editor

-- Add boq column for Bill of Quantities
ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS boq jsonb DEFAULT '[]';

-- Add other missing columns that may not exist
ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS variation_orders jsonb DEFAULT '[]';
ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS measurement_sheets jsonb DEFAULT '[]';
ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS agencies jsonb DEFAULT '[]';
ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS agency_payments jsonb DEFAULT '[]';
ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS subcontractor_payments jsonb DEFAULT '[]';
ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS agency_materials jsonb DEFAULT '[]';
ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS agency_bills jsonb DEFAULT '[]';
ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS materials jsonb DEFAULT '[]';
ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS linear_works jsonb DEFAULT '[]';
ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS linear_progress_logs jsonb DEFAULT '[]';
ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS inventory jsonb DEFAULT '[]';
ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS purchase_orders jsonb DEFAULT '[]';
ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS inventory_transactions jsonb DEFAULT '[]';
ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS vehicles jsonb DEFAULT '[]';
ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS vehicle_logs jsonb DEFAULT '[]';
ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS daily_reports jsonb DEFAULT '[]';
ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS pre_construction jsonb DEFAULT '[]';
ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS land_parcels jsonb DEFAULT '[]';
ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS map_overlays jsonb DEFAULT '[]';
ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS kml_data jsonb DEFAULT '[]';
ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS ncrs jsonb DEFAULT '[]';
ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS contract_bills jsonb DEFAULT '[]';
ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS staff_locations jsonb DEFAULT '[]';
ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS environment_registry jsonb DEFAULT '{}';
ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS resources jsonb DEFAULT '[]';
ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS resource_allocations jsonb DEFAULT '[]';
ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS milestones jsonb DEFAULT '[]';
ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS personnel jsonb DEFAULT '{}';

-- Refresh schema cache
NOTIFY pgrst, 'reload schema';

SELECT 'Added all missing JSONB columns' as status;
