-- Migration: Simplify RLS policies for projects table - allow anonymous inserts
-- This is a simplified version that doesn't try to recreate existing policies

-- First, ensure RLS is enabled
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;

-- Create a simple INSERT policy for anon if it doesn't exist (using DO block to handle existing)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE policyname = 'projects_anon_insert' 
        AND tablename = 'projects'
    ) THEN
        CREATE POLICY "projects_anon_insert"
        ON projects FOR INSERT
        TO anon
        WITH CHECK (true);
    END IF;
END $$;

-- Grant permissions to anon role
GRANT INSERT ON TABLE projects TO anon;
GRANT SELECT ON TABLE projects TO anon;
GRANT UPDATE ON TABLE projects TO anon;
GRANT DELETE ON TABLE projects TO anon;
