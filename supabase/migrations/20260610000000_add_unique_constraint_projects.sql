-- Add explicit UNIQUE constraint on projects.id column for upsert operations
-- This fixes the PostgreSQL error:
-- "there is no unique or exclusion constraint matching the ON CONFLICT specification"
-- Error code: 42P10
--
-- PostgreSQL PRIMARY KEY should normally work for upsert, but Supabase client
-- may require a named UNIQUE constraint. This migration ensures it exists.

-- Use ALTER TABLE to add constraint if not present (PostgreSQL 9.3+)
-- This is idempotent - it will succeed silently if constraint already exists
ALTER TABLE public.projects 
ADD CONSTRAINT IF NOT EXISTS projects_id_key UNIQUE (id);
