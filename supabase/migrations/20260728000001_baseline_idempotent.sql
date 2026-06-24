-- =============================================================================
-- BASELINE SCHEMA (IDEMPOTENT VERSION)
-- This version handles existing tables/constraints gracefully
-- Run this FIRST if tables already exist in the database
-- =============================================================================

-- Extensions (idempotent)
CREATE EXTENSION IF NOT EXISTS "pg_stat_statements" WITH SCHEMA "extensions";
CREATE EXTENSION IF NOT EXISTS "pgcrypto" WITH SCHEMA "extensions";
CREATE EXTENSION IF NOT EXISTS "supabase_vault" WITH SCHEMA "vault";
CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA "extensions";

-- Functions (always recreate to handle updates)
CREATE OR REPLACE FUNCTION "public"."handle_new_user"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, role)
  VALUES (new.id, new.raw_user_meta_data->>'full_name', 'User');
  RETURN new;
END;
$$;

CREATE OR REPLACE FUNCTION "public"."set_project_owner"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  IF NEW.owner_id IS NULL AND auth.uid() IS NOT NULL THEN
    NEW.owner_id = auth.uid();
  END IF;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION "public"."update_project_documents_updated_at"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION "public"."update_updated_at_column"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

-- Grant function permissions
GRANT ALL ON FUNCTION "public"."handle_new_user"() TO "anon", "authenticated", "service_role";
GRANT ALL ON FUNCTION "public"."set_project_owner"() TO "anon", "authenticated", "service_role";
GRANT ALL ON FUNCTION "public"."update_project_documents_updated_at"() TO "anon", "authenticated", "service_role";
GRANT ALL ON FUNCTION "public"."update_updated_at_column"() TO "anon", "authenticated", "service_role";

-- Note: Tables and constraints are assumed to exist from previous setup
-- This migration just ensures functions and basic setup are in place

-- Refresh schema cache
NOTIFY pgrst, 'reload schema';

SELECT 'Baseline idempotent migration applied successfully' as status;
