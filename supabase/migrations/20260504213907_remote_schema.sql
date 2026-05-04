drop extension if exists "pg_net";

drop policy "Admins can read audit logs" on "public"."audit_logs";

drop policy "Admin full access to profiles" on "public"."profiles";

drop policy "Users update own profile" on "public"."profiles";

drop policy "Users view own profile" on "public"."profiles";

drop policy "Authorized users can delete documents" on "public"."project_documents";

drop policy "Authorized users can update documents" on "public"."project_documents";

drop policy "Owners or admins can delete projects" on "public"."projects";

drop policy "Owners or admins can update projects" on "public"."projects";

alter table "public"."audit_logs" drop constraint "audit_logs_user_id_fkey";

alter table "public"."messages" drop constraint "messages_sender_id_fkey";

alter table "public"."projects" drop constraint "projects_owner_id_fkey";

alter table "public"."alignments" enable row level security;

alter table "public"."chainage_points" enable row level security;

alter table "public"."profiles" alter column "full_name" set not null;

alter table "public"."profiles" alter column "full_name" set data type character varying(255) using "full_name"::character varying(255);

alter table "public"."profiles" alter column "last_seen" drop default;

alter table "public"."profiles" alter column "role" drop default;

alter table "public"."profiles" alter column "role" set not null;

alter table "public"."profiles" alter column "role" set data type character varying(50) using "role"::character varying(50);

alter table "public"."profiles" alter column "status" set default 'pending'::character varying;

alter table "public"."profiles" alter column "status" set not null;

alter table "public"."profiles" alter column "status" set data type character varying(20) using "status"::character varying(20);

alter table "public"."projects" alter column "boq" drop default;

alter table "public"."projects" alter column "client" set not null;

alter table "public"."projects" alter column "end_date" set default '2026-01-01'::date;

alter table "public"."projects" alter column "end_date" set data type date using "end_date"::date;

alter table "public"."projects" alter column "start_date" set default '2025-01-01'::date;

alter table "public"."projects" alter column "start_date" set data type date using "start_date"::date;

alter table "public"."projects" alter column "status" drop default;

alter table "public"."road_types" enable row level security;

alter table "public"."roads" enable row level security;

alter table "public"."structures" enable row level security;

alter table "public"."profiles" add constraint "profiles_status_check" CHECK (((status)::text = ANY ((ARRAY['pending'::character varying, 'approved'::character varying, 'rejected'::character varying, 'active'::character varying])::text[]))) not valid;

alter table "public"."profiles" validate constraint "profiles_status_check";


  create policy "Users can create own projects"
  on "public"."projects"
  as permissive
  for insert
  to public
with check ((owner_id = auth.uid()));



  create policy "Admins can read audit logs"
  on "public"."audit_logs"
  as permissive
  for select
  to authenticated
using ((EXISTS ( SELECT 1
   FROM public.profiles
  WHERE ((profiles.id = auth.uid()) AND ((profiles.role)::text = ANY ((ARRAY['admin'::character varying, 'ADMIN'::character varying])::text[]))))));



  create policy "Admin full access to profiles"
  on "public"."profiles"
  as permissive
  for all
  to public
using ((EXISTS ( SELECT 1
   FROM public.profiles admin_profile
  WHERE ((admin_profile.id = auth.uid()) AND ((admin_profile.role)::text = ANY ((ARRAY['Admin'::character varying, 'ADMIN'::character varying])::text[]))))))
with check (true);



  create policy "Users update own profile"
  on "public"."profiles"
  as permissive
  for update
  to public
using (((auth.uid() = id) OR (EXISTS ( SELECT 1
   FROM public.profiles admin_profile
  WHERE ((admin_profile.id = auth.uid()) AND ((admin_profile.role)::text = ANY ((ARRAY['Admin'::character varying, 'ADMIN'::character varying])::text[])))))))
with check (((auth.uid() = id) OR (EXISTS ( SELECT 1
   FROM public.profiles admin_profile
  WHERE ((admin_profile.id = auth.uid()) AND ((admin_profile.role)::text = ANY ((ARRAY['Admin'::character varying, 'ADMIN'::character varying])::text[])))))));



  create policy "Users view own profile"
  on "public"."profiles"
  as permissive
  for select
  to public
using (((auth.uid() = id) OR (EXISTS ( SELECT 1
   FROM public.profiles admin_profile
  WHERE ((admin_profile.id = auth.uid()) AND ((admin_profile.role)::text = ANY ((ARRAY['Admin'::character varying, 'ADMIN'::character varying])::text[])))))));



  create policy "Authorized users can delete documents"
  on "public"."project_documents"
  as permissive
  for delete
  to authenticated
using ((EXISTS ( SELECT 1
   FROM public.profiles
  WHERE ((profiles.id = auth.uid()) AND ((profiles.role)::text = ANY ((ARRAY['ADMIN'::character varying, 'PROJECT MANAGER'::character varying, 'MANAGER'::character varying, 'PROJECT_MANAGER'::character varying])::text[]))))));



  create policy "Authorized users can update documents"
  on "public"."project_documents"
  as permissive
  for update
  to authenticated
using ((EXISTS ( SELECT 1
   FROM public.profiles
  WHERE ((profiles.id = auth.uid()) AND ((profiles.role)::text = ANY ((ARRAY['ADMIN'::character varying, 'PROJECT MANAGER'::character varying, 'MANAGER'::character varying, 'PROJECT_MANAGER'::character varying])::text[]))))));



  create policy "Owners or admins can delete projects"
  on "public"."projects"
  as permissive
  for delete
  to authenticated
using (((owner_id = auth.uid()) OR (EXISTS ( SELECT 1
   FROM public.profiles
  WHERE ((profiles.id = auth.uid()) AND (lower((profiles.role)::text) = 'admin'::text))))));



  create policy "Owners or admins can update projects"
  on "public"."projects"
  as permissive
  for update
  to authenticated
using (((owner_id = auth.uid()) OR (EXISTS ( SELECT 1
   FROM public.profiles
  WHERE ((profiles.id = auth.uid()) AND (lower((profiles.role)::text) = 'admin'::text))))));



