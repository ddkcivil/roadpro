-- Add missing columns to projects
ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();
ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS client VARCHAR(255);
ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS contract_no VARCHAR(100);
ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS roads JSONB DEFAULT '[]'::jsonb;

-- Add missing columns to messages (matching api/messages.ts expectations)
ALTER TABLE public.messages ADD COLUMN IF NOT EXISTS receiver_id TEXT;
ALTER TABLE public.messages ADD COLUMN IF NOT EXISTS timestamp TIMESTAMPTZ DEFAULT NOW();
ALTER TABLE public.messages ADD COLUMN IF NOT EXISTS read BOOLEAN DEFAULT FALSE;
ALTER TABLE public.messages ADD COLUMN IF NOT EXISTS attachment_url TEXT;
ALTER TABLE public.messages ADD COLUMN IF NOT EXISTS attachment_name VARCHAR(255);
ALTER TABLE public.messages ADD COLUMN IF NOT EXISTS attachment_type VARCHAR(50);

-- Table for tracking staff locations
CREATE TABLE IF NOT EXISTS public.staff_locations (
    project_id TEXT REFERENCES public.projects(id) ON DELETE CASCADE,
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    latitude NUMERIC NOT NULL,
    longitude NUMERIC NOT NULL,
    timestamp TIMESTAMPTZ DEFAULT NOW(),
    status VARCHAR(50) DEFAULT 'Active',
    user_name VARCHAR(255),
    user_role VARCHAR(50),
    PRIMARY KEY (project_id, user_id)
);

-- Table for user registrations awaiting approval
CREATE TABLE IF NOT EXISTS public.registrations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    phone TEXT,
    passwordHash TEXT,
    requestedRole TEXT,
    status TEXT DEFAULT 'pending',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Note: We keep snake_case for database columns. 
-- The API handlers (which use camelCase) might need adjustment or mapping if they don't handle it automatically.
