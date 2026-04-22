-- Supabase Seed Data for Local Development
-- Run: supabase db reset

-- Enable RLS extensions if needed
-- CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Sample Profiles (users table likely auto-created by Supabase Auth)
INSERT INTO public.profiles (id, full_name, avatar_url, role, last_seen)
VALUES 
  ('00000000-0000-0000-0000-000000000000', 'Admin User', 'https://example.com/avatar.png', 'admin', NOW()),
  ('11111111-1111-1111-1111-111111111111', 'Project Manager', null, 'manager', NOW())
ON CONFLICT (id) DO NOTHING;

-- Sample Projects
INSERT INTO public.projects (id, name, description, owner_id, created_at)
VALUES 
  ('00000000-0000-0000-0000-000000000001', 'Highway N1 Rehabilitation', '50km asphalt resurfacing project', '00000000-0000-0000-0000-000000000000', NOW()),
  ('00000000-0000-0000-0000-000000000002', 'Rural Road Network', 'Gravel road construction phase 2', '11111111-1111-1111-1111-111111111111', NOW())
ON CONFLICT (id) DO NOTHING;

-- Sample Roads (simplified)
-- INSERT INTO public.roads (id, project_id, name, length_km, surface_type, created_at)
-- VALUES 
--   ('road-001', 'proj-001', 'N1 Section A', 25.5, 'asphalt', NOW()),
--   ('road-002', 'proj-002', 'Rural Link R123', 12.3, 'gravel', NOW())
-- ON CONFLICT (id) DO NOTHING;

-- Sample Road Types Reference
INSERT INTO public.road_types (id, type_name, description, standard_width)
VALUES 
  (1, 'National Highway', 'Primary arterial road', 7.3),
  (2, 'Provincial Road', 'Secondary road network', 6.0),
  (3, 'Rural Access', 'Local gravel/dirt roads', 4.5)
ON CONFLICT (id) DO NOTHING;

-- Sample Messages
-- INSERT INTO public.messages (id, project_id, sender_id, content, created_at, read_at)
-- VALUES 
--   ('msg-001', 'proj-001', '00000000-0000-0000-0000-000000000000', 'Project kickoff meeting scheduled for tomorrow', NOW(), NOW())
-- ON CONFLICT (id) DO NOTHING;

SELECT 'Seed data loaded successfully!' as status;
