-- Ensure all columns required by the API exist in the projects table
ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS contract_no text;
ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS contractor text;
ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS budget numeric;
ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS start_date date DEFAULT '2025-01-01';
ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS end_date date DEFAULT '2026-01-01';
ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS description text;

-- Add any missing JSONB fields for safety
ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS boq jsonb DEFAULT '{}';
ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS variation_orders jsonb DEFAULT '[]';
ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS measurement_sheets jsonb DEFAULT '[]';
ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS agencies jsonb DEFAULT '[]';
ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS agency_payments jsonb DEFAULT '[]';
ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS agency_materials jsonb DEFAULT '[]';
ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS agency_bills jsonb DEFAULT '[]';
ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS materials jsonb DEFAULT '[]';
ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS linear_works jsonb DEFAULT '[]';
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
