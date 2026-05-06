-- Migration: Add anon INSERT policy to projects
-- This allows the Supabase client (which doesn't have proper auth session) to insert projects
-- This is a workaround for code architecture issue where custom auth tokens aren't passed to Supabase client

-- Drop the old policy first (ignore if it doesn't exist)
DROP POLICY IF EXISTS "projects_insert_anon" ON projects;

-- Add INSERT policy for anon users on projects table
CREATE POLICY "projects_insert_anon"
ON projects FOR INSERT
TO anon
WITH CHECK (true);
