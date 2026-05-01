-- Additional migration for tables mentioned in seed.sql (profiles, projects, road_types, messages)

-- Table for user profiles (skip if exists)

-- Table for projects is already created in 20241202_create_projects_table.sql
-- We skip re-creating it here to avoid conflicting id types (text vs uuid).

-- Table for road types reference
CREATE TABLE IF NOT EXISTS public.road_types (
    id INTEGER PRIMARY KEY, -- Based on seed data (1, 2, 3)
    type_name VARCHAR(100) NOT NULL UNIQUE,
    description TEXT,
    standard_width NUMERIC
);

-- Table for messages
CREATE TABLE IF NOT EXISTS public.messages (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    -- project_id links to projects (must be text to support 'general')
    project_id text REFERENCES public.projects(id) ON DELETE CASCADE,
    -- sender_id links to profiles
    sender_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
    receiver_id text,
    content TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    read_at TIMESTAMP WITH TIME ZONE,
    read boolean DEFAULT false,
    attachment_url text,
    attachment_name text,
    attachment_type text
);

-- Add indexes for common foreign key lookups
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'projects' AND column_name = 'owner_id') THEN
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE schemaname = 'public' AND tablename = 'projects' AND indexname = 'idx_projects_owner_id') THEN
      CREATE INDEX idx_projects_owner_id ON public.projects(owner_id);
    END IF;
  END IF;
END $$;
CREATE INDEX IF NOT EXISTS idx_messages_project_id ON public.messages(project_id);
CREATE INDEX IF NOT EXISTS idx_messages_sender_id ON public.messages(sender_id);
