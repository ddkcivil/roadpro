drop extension if exists "pg_net";

drop policy "Users can create own projects" on "public"."projects";

drop policy "Anyone can submit registrations" on "public"."registrations";

alter table "public"."alignments" drop constraint "alignments_type_check";

alter table "public"."structures" drop constraint "structures_type_check";

alter table "public"."alignments" add constraint "alignments_type_check" CHECK (((type)::text = ANY ((ARRAY['Pavement'::character varying, 'Drainage'::character varying, 'Footpath'::character varying, 'Kerb'::character varying, 'service'::character varying])::text[]))) not valid;

alter table "public"."alignments" validate constraint "alignments_type_check";

alter table "public"."structures" add constraint "structures_type_check" CHECK (((type)::text = ANY ((ARRAY['Box Culvert'::character varying, 'Pipe Culvert'::character varying, 'Bridge'::character varying, 'Retaining Wall'::character varying, 'Abutment'::character varying, 'Pier'::character varying, 'Slab Culvert'::character varying, 'Minor Bridge'::character varying, 'Major Bridge'::character varying, 'Drainage (Lined)'::character varying, 'Drainage (Unlined)'::character varying, 'Breast Wall'::character varying, 'Pavement (Flexible)'::character varying, 'Pavement (Rigid)'::character varying, 'Footpath'::character varying, 'Utility Duct'::character varying, 'Street Light Base'::character varying, 'Road Signal'::character varying, 'Junction Box'::character varying, 'Median Barrier'::character varying, 'Pedestrian Guardrail'::character varying, 'Bus Shelter'::character varying, 'culvert'::character varying, 'box-culvert'::character varying, 'bridge'::character varying, 'underpass'::character varying])::text[]))) not valid;

alter table "public"."structures" validate constraint "structures_type_check";


  create policy "Users can create own projects"
  on "public"."projects"
  as permissive
  for insert
  to public
with check ((owner_id = auth.uid()));



  create policy "Anyone can submit registrations"
  on "public"."registrations"
  as permissive
  for insert
  to anon, authenticated
with check (true);



