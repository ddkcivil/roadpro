-- Migration: Add missing columns to projects table
-- Created: 2026-05-14
-- Purpose: Fix schema cache errors - add agencies and other missing JSONB columns

-- Add missing columns to projects table
ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS agencies jsonb DEFAULT '[]'::jsonb;
ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS agency_payments jsonb DEFAULT '[]'::jsonb;
ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS agency_materials jsonb DEFAULT '[]'::jsonb;
ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS agency_bills jsonb DEFAULT '[]'::jsonb;
ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS materials jsonb DEFAULT '[]'::jsonb;
ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS linear_works jsonb DEFAULT '[]'::jsonb;
ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS inventory jsonb DEFAULT '[]'::jsonb;
ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS purchase_orders jsonb DEFAULT '[]'::jsonb;
ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS inventory_transactions jsonb DEFAULT '[]'::jsonb;
ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS vehicles jsonb DEFAULT '[]'::jsonb;
ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS vehicle_logs jsonb DEFAULT '[]'::jsonb;
ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS daily_reports jsonb DEFAULT '[]'::jsonb;
ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS pre_construction jsonb DEFAULT '[]'::jsonb;
ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS land_parcels jsonb DEFAULT '[]'::jsonb;
ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS map_overlays jsonb DEFAULT '[]'::jsonb;
ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS ncrs jsonb DEFAULT '[]'::jsonb;
ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS contract_bills jsonb DEFAULT '[]'::jsonb;
ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS staff_locations jsonb DEFAULT '[]'::jsonb;
ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS environment_registry jsonb DEFAULT '{}'::jsonb;
ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS lab_tests jsonb DEFAULT '[]'::jsonb;
ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS schedule jsonb DEFAULT '[]'::jsonb;
ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS rfis jsonb DEFAULT '[]'::jsonb;

-- Grant permissions
GRANT ALL ON TABLE public.projects TO anon;
GRANT ALL ON TABLE public.projects TO authenticated;
GRANT ALL ON TABLE public.projects TO service_role;

-- Verify columns were added
SELECT column_name, data_type, column_default 
FROM information_schema.columns 
WHERE table_name = 'projects' 
AND column_name IN (
    'agencies', 'agency_payments', 'agency_materials', 'agency_bills', 
    'materials', 'linear_works', 'inventory', 'purchase_orders', 
    'inventory_transactions', 'vehicles', 'vehicle_logs', 'daily_reports', 
    'pre_construction', 'land_parcels', 'map_overlays', 'ncrs', 
    'contract_bills', 'staff_locations', 'environment_registry', 
    'lab_tests', 'schedule', 'rfis'
)
ORDER BY column_name;
