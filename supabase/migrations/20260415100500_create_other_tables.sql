-- Additional migration for tables mentioned in seed.sql (profiles, projects, road_types, messages)

-- Table for user profiles (skip if exists)

-- Table for projects
CREATE TABLE IF NOT EXISTS public.projects (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    -- owner_id references profiles.id
    owner_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

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
    -- project_id links to projects
    project_id uuid REFERENCES public.projects(id) ON DELETE CASCADE,
    -- sender_id links to profiles
    sender_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
    content TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    read_at TIMESTAMP WITH TIME ZONE
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
