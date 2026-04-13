-- MIGRATION: clear_all_data
-- USE WITH CAUTION: This will delete all your project, audit, registration, and message data.
-- It keeps your auth user profiles so you can still log in.

BEGIN;

-- 1. Truncate all project-related tables
TRUNCATE TABLE public.projects CASCADE;
TRUNCATE TABLE public.audit_logs CASCADE;
TRUNCATE TABLE public.messages CASCADE;
TRUNCATE TABLE public.registrations CASCADE;
TRUNCATE TABLE public.test_table CASCADE;

-- 2. Optional: Clear staff locations
-- TRUNCATE TABLE public.staffLocations CASCADE;

COMMIT;

-- Note: To also delete ALL USERS (except your current admin session), 
-- you would need to use Supabase Dashboard > Authentication > Users.
-- Truncating 'profiles' will prevent you from logging in unless you recreate them.
