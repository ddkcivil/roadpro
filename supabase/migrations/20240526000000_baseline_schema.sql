SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;


COMMENT ON SCHEMA "public" IS 'standard public schema';



CREATE EXTENSION IF NOT EXISTS "pg_stat_statements" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "pgcrypto" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "supabase_vault" WITH SCHEMA "vault";






CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA "extensions";






CREATE OR REPLACE FUNCTION "public"."handle_new_user"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, role)
  VALUES (new.id, new.raw_user_meta_data->>'full_name', 'User');
  RETURN new;
END;
$$;


ALTER FUNCTION "public"."handle_new_user"() OWNER TO "postgres";


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


ALTER FUNCTION "public"."set_project_owner"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_project_documents_updated_at"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."update_project_documents_updated_at"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_updated_at_column"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."update_updated_at_column"() OWNER TO "postgres";

SET default_tablespace = '';

SET default_table_access_method = "heap";


CREATE TABLE IF NOT EXISTS "public"."alignments" (
    "id" character varying(255) NOT NULL,
    "road_id" character varying(255) NOT NULL,
    "name" character varying(255) NOT NULL,
    "type" character varying(50) NOT NULL,
    "total_length" numeric,
    "kml_data" "text",
    CONSTRAINT "alignments_type_check" CHECK ((("type")::"text" = ANY ((ARRAY['Pavement'::character varying, 'Drainage'::character varying, 'Footpath'::character varying, 'Kerb'::character varying, 'service'::character varying])::"text"[])))
);


ALTER TABLE "public"."alignments" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."audit_logs" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid",
    "user_name" character varying(255),
    "action" character varying(100) NOT NULL,
    "entity_type" character varying(100),
    "entity_id" "uuid",
    "entity_name" character varying(255),
    "severity" character varying(20) DEFAULT 'INFO'::character varying,
    "metadata" "jsonb" DEFAULT '{}'::"jsonb",
    "timestamp" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."audit_logs" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."chainage_points" (
    "id" integer NOT NULL,
    "alignment_id" character varying(255) NOT NULL,
    "chainage_id" character varying(50) NOT NULL,
    "distance" numeric NOT NULL,
    "lat" numeric NOT NULL,
    "lng" numeric NOT NULL,
    "alt" numeric
);


ALTER TABLE "public"."chainage_points" OWNER TO "postgres";


CREATE SEQUENCE IF NOT EXISTS "public"."chainage_points_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE "public"."chainage_points_id_seq" OWNER TO "postgres";


ALTER SEQUENCE "public"."chainage_points_id_seq" OWNED BY "public"."chainage_points"."id";



CREATE TABLE IF NOT EXISTS "public"."document_versions" (
    "id" "text" NOT NULL,
    "doc_id" "text",
    "blob_url" "text" NOT NULL,
    "version_num" integer NOT NULL,
    "size" bigint,
    "notes" "text",
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."document_versions" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."messages" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "project_id" "text",
    "sender_id" "uuid",
    "receiver_id" "text",
    "content" "text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "timestamp" timestamp with time zone DEFAULT "now"(),
    "read_at" timestamp with time zone,
    "read" boolean DEFAULT false,
    "attachment_url" "text",
    "attachment_name" "text",
    "attachment_type" "text"
);


ALTER TABLE "public"."messages" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."profiles" (
    "id" "uuid" NOT NULL,
    "full_name" character varying(255),
    "avatar_url" "text",
    "role" character varying(50) NOT NULL,
    "status" character varying(20) DEFAULT 'pending'::character varying NOT NULL,
    "last_seen" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "phone" "text",
    "email" "text",
    CONSTRAINT "profiles_status_check" CHECK ((("status")::"text" = ANY (ARRAY[('pending'::character varying)::"text", ('approved'::character varying)::"text", ('rejected'::character varying)::"text", ('active'::character varying)::"text"])))
);


ALTER TABLE "public"."profiles" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."project_documents" (
    "id" "text" NOT NULL,
    "project_id" "text",
    "name" "text" NOT NULL,
    "folder" "text",
    "tags" "text"[] DEFAULT '{}'::"text"[],
    "subject" "text",
    "ref_no" "text",
    "size" "text",
    "type" "text",
    "status" "text" DEFAULT 'Active'::"text",
    "metadata" "jsonb" DEFAULT '{}'::"jsonb",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."project_documents" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."project_site_photos" (
    "id" "text" NOT NULL,
    "project_id" "text",
    "url" "text" NOT NULL,
    "caption" "text",
    "location_lat" numeric,
    "location_lng" numeric,
    "uploaded_by" "text",
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."project_site_photos" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."projects" (
    "id" "text" NOT NULL,
    "name" "text" NOT NULL,
    "client" "text" NOT NULL,
    "owner_id" "uuid",
    "contract_no" "text",
    "location" "text",
    "status" "text",
    "budget" numeric,
    "start_date" "date" DEFAULT '2025-01-01'::"date",
    "end_date" "date" DEFAULT '2026-01-01'::"date",
    "description" "text",
    "contractor" "text",
    "metadata" "jsonb" DEFAULT '{}'::"jsonb",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "roads" "jsonb" DEFAULT '[]'::"jsonb",
    "accountingintegrations" "jsonb" DEFAULT '[]'::"jsonb",
    "accountingtransactions" "jsonb" DEFAULT '[]'::"jsonb",
    "structuretemplates" "jsonb" DEFAULT '[]'::"jsonb",
    "auditlogs" "jsonb" DEFAULT '[]'::"jsonb",
    "boq" "jsonb",
    "variation_orders" "jsonb" DEFAULT '[]'::"jsonb",
    "measurement_sheets" "jsonb" DEFAULT '[]'::"jsonb",
    "agencies" "jsonb" DEFAULT '[]'::"jsonb",
    "agency_payments" "jsonb" DEFAULT '[]'::"jsonb",
    "agency_materials" "jsonb" DEFAULT '[]'::"jsonb",
    "agency_bills" "jsonb" DEFAULT '[]'::"jsonb",
    "materials" "jsonb" DEFAULT '[]'::"jsonb",
    "linear_works" "jsonb" DEFAULT '[]'::"jsonb",
    "inventory" "jsonb" DEFAULT '[]'::"jsonb",
    "purchase_orders" "jsonb" DEFAULT '[]'::"jsonb",
    "inventory_transactions" "jsonb" DEFAULT '[]'::"jsonb",
    "vehicles" "jsonb" DEFAULT '[]'::"jsonb",
    "vehicle_logs" "jsonb" DEFAULT '[]'::"jsonb",
    "daily_reports" "jsonb" DEFAULT '[]'::"jsonb",
    "pre_construction" "jsonb" DEFAULT '[]'::"jsonb",
    "land_parcels" "jsonb" DEFAULT '[]'::"jsonb",
    "map_overlays" "jsonb" DEFAULT '[]'::"jsonb",
    "ncrs" "jsonb" DEFAULT '[]'::"jsonb",
    "contract_bills" "jsonb" DEFAULT '[]'::"jsonb",
    "staff_locations" "jsonb" DEFAULT '[]'::"jsonb",
    "environment_registry" "jsonb" DEFAULT '{}'::"jsonb",
    "lab_tests" "jsonb" DEFAULT '[]'::"jsonb",
    "schedule" "jsonb" DEFAULT '[]'::"jsonb",
    "rfis" "jsonb" DEFAULT '[]'::"jsonb",
    "structures" "jsonb" DEFAULT '[]'::"jsonb"
);


ALTER TABLE "public"."projects" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."registrations" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "name" "text" NOT NULL,
    "email" "text" NOT NULL,
    "phone" "text",
    "password_hash" "text",
    "requested_role" "text",
    "status" "text" DEFAULT 'pending'::"text",
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."registrations" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."road_types" (
    "id" integer NOT NULL,
    "type_name" character varying(100) NOT NULL,
    "description" "text",
    "standard_width" numeric
);


ALTER TABLE "public"."road_types" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."roads" (
    "id" character varying(255) NOT NULL,
    "name" character varying(255) NOT NULL,
    "chainage_offset" numeric,
    "geometry" "jsonb",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."roads" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."staff_locations" (
    "project_id" "text" NOT NULL,
    "user_id" "uuid" NOT NULL,
    "latitude" numeric NOT NULL,
    "longitude" numeric NOT NULL,
    "timestamp" timestamp with time zone DEFAULT "now"(),
    "status" character varying(50) DEFAULT 'Active'::character varying,
    "user_name" character varying(255),
    "user_role" character varying(50)
);


ALTER TABLE "public"."staff_locations" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."structures" (
    "id" character varying(255) NOT NULL,
    "road_id" character varying(255) NOT NULL,
    "type" character varying(100) NOT NULL,
    "name" character varying(255) NOT NULL,
    "chainage" character varying(50) NOT NULL,
    "distance" numeric NOT NULL,
    "geometry" "jsonb",
    "alignments" "text"[],
    "properties" "jsonb",
    CONSTRAINT "structures_type_check" CHECK ((("type")::"text" = ANY ((ARRAY['Box Culvert'::character varying, 'Pipe Culvert'::character varying, 'Bridge'::character varying, 'Retaining Wall'::character varying, 'Abutment'::character varying, 'Pier'::character varying, 'Slab Culvert'::character varying, 'Minor Bridge'::character varying, 'Major Bridge'::character varying, 'Drainage (Lined)'::character varying, 'Drainage (Unlined)'::character varying, 'Breast Wall'::character varying, 'Pavement (Flexible)'::character varying, 'Pavement (Rigid)'::character varying, 'Footpath'::character varying, 'Utility Duct'::character varying, 'Street Light Base'::character varying, 'Road Signal'::character varying, 'Junction Box'::character varying, 'Median Barrier'::character varying, 'Pedestrian Guardrail'::character varying, 'Bus Shelter'::character varying, 'culvert'::character varying, 'box-culvert'::character varying, 'bridge'::character varying, 'underpass'::character varying])::"text"[])))
);


ALTER TABLE "public"."structures" OWNER TO "postgres";


ALTER TABLE ONLY "public"."chainage_points" ALTER COLUMN "id" SET DEFAULT "nextval"('"public"."chainage_points_id_seq"'::"regclass");



ALTER TABLE ONLY "public"."alignments"
    ADD CONSTRAINT "alignments_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."audit_logs"
    ADD CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."chainage_points"
    ADD CONSTRAINT "chainage_points_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."document_versions"
    ADD CONSTRAINT "document_versions_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."messages"
    ADD CONSTRAINT "messages_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."profiles"
    ADD CONSTRAINT "profiles_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."project_documents"
    ADD CONSTRAINT "project_documents_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."project_site_photos"
    ADD CONSTRAINT "project_site_photos_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."projects"
    ADD CONSTRAINT "projects_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."registrations"
    ADD CONSTRAINT "registrations_email_key" UNIQUE ("email");



ALTER TABLE ONLY "public"."registrations"
    ADD CONSTRAINT "registrations_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."road_types"
    ADD CONSTRAINT "road_types_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."road_types"
    ADD CONSTRAINT "road_types_type_name_key" UNIQUE ("type_name");



ALTER TABLE ONLY "public"."roads"
    ADD CONSTRAINT "roads_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."staff_locations"
    ADD CONSTRAINT "staff_locations_pkey" PRIMARY KEY ("project_id", "user_id");



ALTER TABLE ONLY "public"."structures"
    ADD CONSTRAINT "structures_pkey" PRIMARY KEY ("id");



CREATE INDEX "idx_alignments_road_id" ON "public"."alignments" USING "btree" ("road_id");



CREATE INDEX "idx_audit_logs_action" ON "public"."audit_logs" USING "btree" ("action");



CREATE INDEX "idx_audit_logs_timestamp" ON "public"."audit_logs" USING "btree" ("timestamp");



CREATE INDEX "idx_audit_logs_user_id" ON "public"."audit_logs" USING "btree" ("user_id");



CREATE INDEX "idx_chainage_points_alignment_id" ON "public"."chainage_points" USING "btree" ("alignment_id");



CREATE INDEX "idx_document_versions_doc_id" ON "public"."document_versions" USING "btree" ("doc_id");



CREATE INDEX "idx_messages_project_id" ON "public"."messages" USING "btree" ("project_id");



CREATE INDEX "idx_messages_sender_id" ON "public"."messages" USING "btree" ("sender_id");



CREATE INDEX "idx_profiles_email" ON "public"."profiles" USING "btree" ("email");



CREATE INDEX "idx_profiles_full_name" ON "public"."profiles" USING "btree" ("full_name");



CREATE INDEX "idx_profiles_role" ON "public"."profiles" USING "btree" ("role");



CREATE INDEX "idx_profiles_status" ON "public"."profiles" USING "btree" ("status");



CREATE INDEX "idx_project_documents_project_id" ON "public"."project_documents" USING "btree" ("project_id");



CREATE INDEX "idx_project_site_photos_project_id" ON "public"."project_site_photos" USING "btree" ("project_id");



CREATE INDEX "idx_projects_contract_no" ON "public"."projects" USING "btree" ("contract_no");



CREATE INDEX "idx_projects_created_at" ON "public"."projects" USING "btree" ("created_at");



CREATE INDEX "idx_projects_name" ON "public"."projects" USING "btree" ("name");



CREATE INDEX "idx_projects_owner_id" ON "public"."projects" USING "btree" ("owner_id");



CREATE INDEX "idx_structures_road_id" ON "public"."structures" USING "btree" ("road_id");



CREATE INDEX "profiles_role_idx" ON "public"."profiles" USING "btree" ("role");



CREATE OR REPLACE TRIGGER "set_project_owner_trigger" BEFORE INSERT ON "public"."projects" FOR EACH ROW EXECUTE FUNCTION "public"."set_project_owner"();



CREATE OR REPLACE TRIGGER "tr_project_documents_updated_at" BEFORE UPDATE ON "public"."project_documents" FOR EACH ROW EXECUTE FUNCTION "public"."update_project_documents_updated_at"();



CREATE OR REPLACE TRIGGER "update_projects_updated_at" BEFORE UPDATE ON "public"."projects" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



ALTER TABLE ONLY "public"."alignments"
    ADD CONSTRAINT "alignments_road_id_fkey" FOREIGN KEY ("road_id") REFERENCES "public"."roads"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."chainage_points"
    ADD CONSTRAINT "chainage_points_alignment_id_fkey" FOREIGN KEY ("alignment_id") REFERENCES "public"."alignments"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."document_versions"
    ADD CONSTRAINT "document_versions_doc_id_fkey" FOREIGN KEY ("doc_id") REFERENCES "public"."project_documents"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."messages"
    ADD CONSTRAINT "messages_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."project_documents"
    ADD CONSTRAINT "project_documents_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."project_site_photos"
    ADD CONSTRAINT "project_site_photos_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."staff_locations"
    ADD CONSTRAINT "staff_locations_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."staff_locations"
    ADD CONSTRAINT "staff_locations_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."structures"
    ADD CONSTRAINT "structures_road_id_fkey" FOREIGN KEY ("road_id") REFERENCES "public"."roads"("id") ON DELETE CASCADE;



CREATE POLICY "Anyone can submit registrations" ON "public"."registrations" FOR INSERT TO "authenticated", "anon" WITH CHECK (true);



CREATE POLICY "Authenticated users can insert audit logs" ON "public"."audit_logs" FOR INSERT TO "authenticated" WITH CHECK (true);



CREATE POLICY "Authenticated users can insert document versions" ON "public"."document_versions" FOR INSERT TO "authenticated" WITH CHECK (true);



CREATE POLICY "Authenticated users can insert documents" ON "public"."project_documents" FOR INSERT TO "authenticated" WITH CHECK (true);



CREATE POLICY "Authenticated users can insert messages" ON "public"."messages" FOR INSERT TO "authenticated" WITH CHECK (("sender_id" = "auth"."uid"()));



CREATE POLICY "Authenticated users can insert site photos" ON "public"."project_site_photos" FOR INSERT TO "authenticated" WITH CHECK (true);



CREATE POLICY "Authenticated users can upsert own location" ON "public"."staff_locations" TO "authenticated" USING (("user_id" = "auth"."uid"())) WITH CHECK (("user_id" = "auth"."uid"()));



CREATE POLICY "Authenticated users can view document versions" ON "public"."document_versions" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "Authenticated users can view documents" ON "public"."project_documents" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "Authenticated users can view messages" ON "public"."messages" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "Authenticated users can view registrations" ON "public"."registrations" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "Authenticated users can view site photos" ON "public"."project_site_photos" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "Authenticated users can view staff locations" ON "public"."staff_locations" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "Authorized users can delete documents" ON "public"."project_documents" FOR DELETE TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."id" = "auth"."uid"()) AND (("profiles"."role")::"text" = ANY ((ARRAY['ADMIN'::character varying, 'PROJECT MANAGER'::character varying, 'MANAGER'::character varying, 'PROJECT_MANAGER'::character varying])::"text"[]))))));



CREATE POLICY "Authorized users can update documents" ON "public"."project_documents" FOR UPDATE TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."id" = "auth"."uid"()) AND (("profiles"."role")::"text" = ANY ((ARRAY['ADMIN'::character varying, 'PROJECT MANAGER'::character varying, 'MANAGER'::character varying, 'PROJECT_MANAGER'::character varying])::"text"[]))))));



CREATE POLICY "Public can insert audit logs" ON "public"."audit_logs" FOR INSERT TO "anon" WITH CHECK (true);



ALTER TABLE "public"."alignments" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."audit_logs" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "audit_logs_insert_authenticated" ON "public"."audit_logs" FOR INSERT TO "authenticated" WITH CHECK ((("auth"."uid"() = "user_id") OR ("auth"."role"() = 'service_role'::"text")));



CREATE POLICY "audit_logs_select_authenticated" ON "public"."audit_logs" FOR SELECT TO "authenticated" USING (true);



ALTER TABLE "public"."chainage_points" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."document_versions" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."messages" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."profiles" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "profiles_insert_own" ON "public"."profiles" FOR INSERT TO "authenticated" WITH CHECK (("auth"."uid"() = "id"));



CREATE POLICY "profiles_select_all" ON "public"."profiles" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "profiles_update_own" ON "public"."profiles" FOR UPDATE TO "authenticated" USING (("auth"."uid"() = "id")) WITH CHECK (("auth"."uid"() = "id"));



ALTER TABLE "public"."project_documents" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."project_site_photos" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."projects" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "projects_delete_owner" ON "public"."projects" FOR DELETE TO "authenticated" USING (("owner_id" = "auth"."uid"()));



CREATE POLICY "projects_insert_all_authenticated" ON "public"."projects" FOR INSERT TO "authenticated" WITH CHECK (true);



CREATE POLICY "projects_insert_anon_permissive" ON "public"."projects" FOR INSERT TO "anon" WITH CHECK (true);



CREATE POLICY "projects_select_authenticated" ON "public"."projects" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "projects_update_owner" ON "public"."projects" FOR UPDATE TO "authenticated" USING (("owner_id" = "auth"."uid"())) WITH CHECK (("owner_id" = "auth"."uid"()));



ALTER TABLE "public"."registrations" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."road_types" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."roads" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."staff_locations" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."structures" ENABLE ROW LEVEL SECURITY;




ALTER PUBLICATION "supabase_realtime" OWNER TO "postgres";


GRANT USAGE ON SCHEMA "public" TO "postgres";
GRANT USAGE ON SCHEMA "public" TO "anon";
GRANT USAGE ON SCHEMA "public" TO "authenticated";
GRANT USAGE ON SCHEMA "public" TO "service_role";






















































































































































GRANT ALL ON FUNCTION "public"."handle_new_user"() TO "anon";
GRANT ALL ON FUNCTION "public"."handle_new_user"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."handle_new_user"() TO "service_role";



GRANT ALL ON FUNCTION "public"."set_project_owner"() TO "anon";
GRANT ALL ON FUNCTION "public"."set_project_owner"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."set_project_owner"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_project_documents_updated_at"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_project_documents_updated_at"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_project_documents_updated_at"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_updated_at_column"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_updated_at_column"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_updated_at_column"() TO "service_role";


















GRANT ALL ON TABLE "public"."alignments" TO "anon";
GRANT ALL ON TABLE "public"."alignments" TO "authenticated";
GRANT ALL ON TABLE "public"."alignments" TO "service_role";



GRANT ALL ON TABLE "public"."audit_logs" TO "anon";
GRANT ALL ON TABLE "public"."audit_logs" TO "authenticated";
GRANT ALL ON TABLE "public"."audit_logs" TO "service_role";



GRANT ALL ON TABLE "public"."chainage_points" TO "anon";
GRANT ALL ON TABLE "public"."chainage_points" TO "authenticated";
GRANT ALL ON TABLE "public"."chainage_points" TO "service_role";



GRANT ALL ON SEQUENCE "public"."chainage_points_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."chainage_points_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."chainage_points_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."document_versions" TO "anon";
GRANT ALL ON TABLE "public"."document_versions" TO "authenticated";
GRANT ALL ON TABLE "public"."document_versions" TO "service_role";



GRANT ALL ON TABLE "public"."messages" TO "anon";
GRANT ALL ON TABLE "public"."messages" TO "authenticated";
GRANT ALL ON TABLE "public"."messages" TO "service_role";



GRANT ALL ON TABLE "public"."profiles" TO "anon";
GRANT ALL ON TABLE "public"."profiles" TO "authenticated";
GRANT ALL ON TABLE "public"."profiles" TO "service_role";



GRANT ALL ON TABLE "public"."project_documents" TO "anon";
GRANT ALL ON TABLE "public"."project_documents" TO "authenticated";
GRANT ALL ON TABLE "public"."project_documents" TO "service_role";



GRANT ALL ON TABLE "public"."project_site_photos" TO "anon";
GRANT ALL ON TABLE "public"."project_site_photos" TO "authenticated";
GRANT ALL ON TABLE "public"."project_site_photos" TO "service_role";



GRANT ALL ON TABLE "public"."projects" TO "anon";
GRANT ALL ON TABLE "public"."projects" TO "authenticated";
GRANT ALL ON TABLE "public"."projects" TO "service_role";



GRANT ALL ON TABLE "public"."registrations" TO "anon";
GRANT ALL ON TABLE "public"."registrations" TO "authenticated";
GRANT ALL ON TABLE "public"."registrations" TO "service_role";



GRANT ALL ON TABLE "public"."road_types" TO "anon";
GRANT ALL ON TABLE "public"."road_types" TO "authenticated";
GRANT ALL ON TABLE "public"."road_types" TO "service_role";



GRANT ALL ON TABLE "public"."roads" TO "anon";
GRANT ALL ON TABLE "public"."roads" TO "authenticated";
GRANT ALL ON TABLE "public"."roads" TO "service_role";



GRANT ALL ON TABLE "public"."staff_locations" TO "anon";
GRANT ALL ON TABLE "public"."staff_locations" TO "authenticated";
GRANT ALL ON TABLE "public"."staff_locations" TO "service_role";



GRANT ALL ON TABLE "public"."structures" TO "anon";
GRANT ALL ON TABLE "public"."structures" TO "authenticated";
GRANT ALL ON TABLE "public"."structures" TO "service_role";









ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "service_role";































