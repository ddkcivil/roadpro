-- Fix RLS policies to allow service_role to access tables
-- This migration ensures the service_role can bypass RLS policies

-- Drop existing policies that might block service_role
DROP POLICY IF EXISTS "projects_select_authenticated" ON "public"."projects";
DROP POLICY IF EXISTS "projects_insert_all_authenticated" ON "public"."projects";
DROP POLICY IF EXISTS "projects_insert_anon_permissive" ON "public"."projects";
DROP POLICY IF EXISTS "projects_update_owner" ON "public"."projects";
DROP POLICY IF EXISTS "projects_delete_owner" ON "public"."projects";

-- Create permissive policies for projects
CREATE POLICY "allow_all_read_projects" ON "public"."projects" FOR SELECT TO "anon", "authenticated", "service_role" USING (true);
CREATE POLICY "allow_all_insert_projects" ON "public"."projects" FOR INSERT TO "anon", "authenticated", "service_role" WITH CHECK (true);
CREATE POLICY "allow_all_update_projects" ON "public"."projects" FOR UPDATE TO "anon", "authenticated", "service_role" USING (true);
CREATE POLICY "allow_all_delete_projects" ON "public"."projects" FOR DELETE TO "authenticated", "service_role" USING (true);

-- Profiles table
DROP POLICY IF EXISTS "profiles_select_all" ON "public"."profiles";
CREATE POLICY "allow_all_read_profiles" ON "public"."profiles" FOR SELECT TO "anon", "authenticated", "service_role" USING (true);

-- Allow service_role to do everything
GRANT ALL ON "public"."profiles" TO "service_role";
GRANT ALL ON "public"."projects" TO "service_role";

-- Ensure service_role has proper access
ALTER TABLE "public"."profiles" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."projects" ENABLE ROW LEVEL SECURITY;
