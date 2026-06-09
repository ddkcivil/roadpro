-- Add UNIQUE constraint on projects.id column for upsert operations
-- This fixes error 42P10 for the POST /api/projects endpoint

-- Use a DO block to safely handle errors if constraint already exists
DO $$

BEGIN
    -- Try to add the constraint
    -- If it already exists, we'll catch the error
    ALTER TABLE public.projects ADD CONSTRAINT projects_id_key UNIQUE (id);
    
EXCEPTION
    WHEN duplicate_table THEN
        -- Constraint already exists, that's fine
        NULL;
    WHEN duplicate_object THEN
        -- Constraint already exists, that's fine
        NULL;
END

$$;
