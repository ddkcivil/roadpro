-- FINAL CONSOLIDATED SCHEMA FOR ROADMASTER PRO
-- Run this in your Supabase SQL Editor to fix all "Table not found" and "Internal Server Error" issues.

BEGIN;

-- 1. PROFILES (Linked to Supabase Auth)
CREATE TABLE IF NOT EXISTS public.profiles (
    id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    "name" TEXT,
    email TEXT UNIQUE NOT NULL,
    phone TEXT,
    "role" TEXT DEFAULT 'SITE_ENGINEER',
    avatar TEXT,
    "lastSeen" TIMESTAMPTZ DEFAULT NOW(),
    "updatedAt" TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public profiles are viewable by everyone" ON public.profiles FOR SELECT USING (true);
CREATE POLICY "Users can insert their own profile" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = id);
CREATE POLICY "Users can update their own profile" ON public.profiles FOR UPDATE USING (auth.uid() = id);

-- 2. PROJECTS (CamelCase columns to match API)
CREATE TABLE IF NOT EXISTS public.projects (
    id TEXT PRIMARY KEY,
    "name" TEXT NOT NULL,
    "code" TEXT,
    "client" TEXT,
    "clientName" TEXT,
    "location" TEXT,
    "contractor" TEXT,
    "engineer" TEXT,
    "startDate" TEXT,
    "endDate" TEXT,
    "contractPeriod" TEXT,
    "projectManager" TEXT,
    "supervisor" TEXT,
    "consultantName" TEXT,
    "logo" TEXT,
    "contractNo" TEXT,
    lat DOUBLE PRECISION,
    lng DOUBLE PRECISION,
    
    -- Large data arrays as JSONB
    boq JSONB DEFAULT '[]',
    "variationOrders" JSONB DEFAULT '[]',
    rfis JSONB DEFAULT '[]',
    "labTests" JSONB DEFAULT '[]',
    schedule JSONB DEFAULT '[]',
    roads JSONB DEFAULT '[]',
    structures JSONB DEFAULT '[]',
    agencies JSONB DEFAULT '[]',
    "agencyPayments" JSONB DEFAULT '[]',
    "agencyMaterials" JSONB DEFAULT '[]',
    "agencyBills" JSONB DEFAULT '[]',
    materials JSONB DEFAULT '[]',
    "subcontractorPayments" JSONB DEFAULT '[]',
    "linearWorks" JSONB DEFAULT '[]',
    inventory JSONB DEFAULT '[]',
    "purchaseOrders" JSONB DEFAULT '[]',
    "inventoryTransactions" JSONB DEFAULT '[]',
    vehicles JSONB DEFAULT '[]',
    "vehicleLogs" JSONB DEFAULT '[]',
    documents JSONB DEFAULT '[]',
    "sitePhotos" JSONB DEFAULT '[]',
    "dailyReports" JSONB DEFAULT '[]',
    "preConstruction" JSONB DEFAULT '[]',
    "preConstructionTasks" JSONB DEFAULT '[]',
    "landParcels" JSONB DEFAULT '[]',
    "mapOverlays" JSONB DEFAULT '[]',
    "kmlData" JSONB DEFAULT '[]',
    hindrances JSONB DEFAULT '[]',
    ncrs JSONB DEFAULT '[]',
    "contractBills" JSONB DEFAULT '[]',
    "subcontractorBills" JSONB DEFAULT '[]',
    "measurementSheets" JSONB DEFAULT '[]',
    "staffLocations" JSONB DEFAULT '[]',
    "environmentRegistry" JSONB DEFAULT '{}',
    weather JSONB DEFAULT '{}',
    settings JSONB DEFAULT '{}',
    resources JSONB DEFAULT '[]',
    "resourceAllocations" JSONB DEFAULT '[]',
    milestones JSONB DEFAULT '[]',
    comments JSONB DEFAULT '[]',
    checklists JSONB DEFAULT '[]',
    defects JSONB DEFAULT '[]',
    "complianceWorkflows" JSONB DEFAULT '[]',
    personnel JSONB DEFAULT '{}',
    
    -- Metadata
    "lastSynced" TIMESTAMPTZ,
    "spreadsheetId" TEXT,
    "createdAt" TIMESTAMPTZ DEFAULT NOW(),
    "updatedAt" TEXT -- ISO timestamp used by frontend
);

ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can read projects" ON public.projects FOR SELECT USING (true);
CREATE POLICY "Admins/Managers can modify projects" ON public.projects FOR ALL USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND (role = 'Admin' OR role = 'ADMIN' OR role = 'Project Manager'))
);

-- 3. MESSAGES (CamelCase columns to match API)
CREATE TABLE IF NOT EXISTS public.messages (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    "projectId" TEXT REFERENCES public.projects(id) ON DELETE CASCADE,
    "senderId" uuid REFERENCES auth.users(id) ON DELETE CASCADE,
    "receiverId" TEXT, -- User ID or 'general'
    content TEXT,
    "timestamp" TIMESTAMPTZ DEFAULT NOW(),
    "read" BOOLEAN DEFAULT FALSE,
    "readAt" TIMESTAMPTZ,
    "attachmentUrl" TEXT,
    "attachmentName" TEXT,
    "attachmentType" TEXT
);

ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users can use chat" ON public.messages FOR ALL USING (auth.uid() IS NOT NULL);

-- 3.5. STAFF LOCATIONS
CREATE TABLE IF NOT EXISTS public."staffLocations" (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    "projectId" TEXT REFERENCES public.projects(id) ON DELETE CASCADE,
    "userId" uuid REFERENCES auth.users(id) ON DELETE CASCADE,
    latitude DOUBLE PRECISION NOT NULL,
    longitude DOUBLE PRECISION NOT NULL,
    "timestamp" TIMESTAMPTZ DEFAULT NOW(),
    status TEXT DEFAULT 'Active',
    "userName" TEXT,
    "userRole" TEXT,
    UNIQUE("projectId", "userId")
);

ALTER TABLE public."staffLocations" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Staff can update own location" ON public."staffLocations" FOR ALL USING (auth.uid() = "userId");
CREATE POLICY "Admins can view all locations" ON public."staffLocations" FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND (role = 'Admin' OR role = 'ADMIN' OR role = 'Project Manager'))
);

-- 4. AUDIT LOGS (Snake_case columns to match API)
CREATE TABLE IF NOT EXISTS public.audit_logs (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
    user_name TEXT,
    action TEXT NOT NULL,
    entity_type TEXT,
    entity_id TEXT,
    entity_name TEXT,
    severity TEXT DEFAULT 'INFO',
    metadata JSONB DEFAULT '{}',
    timestamp TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins can see audit logs" ON public.audit_logs FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND (role = 'Admin' OR role = 'ADMIN'))
);
CREATE POLICY "Anyone can insert logs" ON public.audit_logs FOR INSERT WITH CHECK (true);

-- 5. REGISTRATIONS
CREATE TABLE IF NOT EXISTS public.registrations (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    "name" TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    phone TEXT,
    "passwordHash" TEXT,
    "requestedRole" TEXT,
    status TEXT DEFAULT 'pending',
    "createdAt" TIMESTAMPTZ DEFAULT NOW(),
    "updatedAt" TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.registrations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public can submit registrations" ON public.registrations FOR INSERT WITH CHECK (true);
CREATE POLICY "Admins can manage registrations" ON public.registrations FOR ALL USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND (role = 'Admin' OR role = 'ADMIN'))
);

-- 6. RPC FOR ROADS
CREATE OR REPLACE FUNCTION append_road_to_project(project_id TEXT, new_road_data JSONB)
RETURNS void AS $$
BEGIN
    UPDATE public.projects
    SET roads = COALESCE(roads, '[]'::jsonb) || jsonb_build_array(new_road_data),
        "updatedAt" = NOW()::text
    WHERE id = project_id;
END;
$$ LANGUAGE plpgsql;

COMMIT;
