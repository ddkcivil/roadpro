-- MIGRATION: consolidated_projects_schema_v2
-- Recreate projects table with camelCase columns for direct compatibility with frontend types
DROP TABLE IF EXISTS public.projects CASCADE;

CREATE TABLE public.projects (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    code TEXT,
    client TEXT,
    clientName TEXT,
    location TEXT,
    contractor TEXT,
    engineer TEXT,
    startDate TEXT,
    endDate TEXT,
    contractPeriod TEXT,
    projectManager TEXT,
    supervisor TEXT,
    consultantName TEXT,
    logo TEXT,
    contractNo TEXT,
    lat DOUBLE PRECISION,
    lng DOUBLE PRECISION,
    
    -- Large data arrays as JSONB (matching frontend property names)
    boq JSONB DEFAULT '[]',
    variationOrders JSONB DEFAULT '[]',
    rfis JSONB DEFAULT '[]',
    labTests JSONB DEFAULT '[]',
    schedule JSONB DEFAULT '[]',
    roads JSONB DEFAULT '[]',
    structures JSONB DEFAULT '[]',
    agencies JSONB DEFAULT '[]',
    agencyPayments JSONB DEFAULT '[]',
    agencyMaterials JSONB DEFAULT '[]',
    agencyBills JSONB DEFAULT '[]',
    materials JSONB DEFAULT '[]',
    subcontractorPayments JSONB DEFAULT '[]',
    linearWorks JSONB DEFAULT '[]',
    inventory JSONB DEFAULT '[]',
    purchaseOrders JSONB DEFAULT '[]',
    inventoryTransactions JSONB DEFAULT '[]',
    vehicles JSONB DEFAULT '[]',
    vehicleLogs JSONB DEFAULT '[]',
    documents JSONB DEFAULT '[]',
    sitePhotos JSONB DEFAULT '[]',
    dailyReports JSONB DEFAULT '[]',
    preConstruction JSONB DEFAULT '[]',
    preConstructionTasks JSONB DEFAULT '[]',
    landParcels JSONB DEFAULT '[]',
    mapOverlays JSONB DEFAULT '[]',
    kmlData JSONB DEFAULT '[]',
    hindrances JSONB DEFAULT '[]',
    ncrs JSONB DEFAULT '[]',
    contractBills JSONB DEFAULT '[]',
    subcontractorBills JSONB DEFAULT '[]',
    measurementSheets JSONB DEFAULT '[]',
    staffLocations JSONB DEFAULT '[]',
    environmentRegistry JSONB DEFAULT '{}',
    weather JSONB DEFAULT '{}',
    settings JSONB DEFAULT '{}',
    resources JSONB DEFAULT '[]',
    resourceAllocations JSONB DEFAULT '[]',
    milestones JSONB DEFAULT '[]',
    comments JSONB DEFAULT '[]',
    checklists JSONB DEFAULT '[]',
    defects JSONB DEFAULT '[]',
    complianceWorkflows JSONB DEFAULT '[]',
    personnel JSONB DEFAULT '{}',
    
    -- Metadata
    lastSynced TIMESTAMPTZ,
    spreadsheetId TEXT,
    createdAt TIMESTAMPTZ DEFAULT NOW(),
    updatedAt TEXT -- ISO timestamp used by frontend
);

-- Enable RLS
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;

-- Simple RLS Policies
CREATE POLICY "Allow all authenticated users to read projects" ON public.projects
    FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Allow admins and managers to insert projects" ON public.projects
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.profiles 
            WHERE id = auth.uid() AND (role = 'Admin' OR role = 'ADMIN' OR role = 'Project Manager')
        )
    );

CREATE POLICY "Allow admins and managers to update projects" ON public.projects
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM public.profiles 
            WHERE id = auth.uid() AND (role = 'Admin' OR role = 'ADMIN' OR role = 'Project Manager')
        )
    );

CREATE POLICY "Allow admins to delete projects" ON public.projects
    FOR DELETE USING (
        EXISTS (
            SELECT 1 FROM public.profiles 
            WHERE id = auth.uid() AND (role = 'Admin' OR role = 'ADMIN')
        )
    );

-- RPC function for roads ingestion (updated for camelCase)
CREATE OR REPLACE FUNCTION append_road_to_project(project_id TEXT, new_road_data JSONB)
RETURNS void AS $$
BEGIN
    UPDATE public.projects
    SET roads = COALESCE(roads, '[]'::jsonb) || jsonb_build_array(new_road_data),
        updatedAt = NOW()::text
    WHERE id = project_id;
END;
$$ LANGUAGE plpgsql;
