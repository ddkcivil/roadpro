-- Seed admin user (run after auth.users has admin)
INSERT INTO public.profiles (id, email, role, name, avatar)
     VALUES
       ('YOUR-ACTUAL-UUID-HERE', 'admin@roadmaster.os', 'Admin', 'Roadmaster Admin', '')
     ON CONFLICT (id) DO UPDATE SET role = 'Admin';

-- Create sample project
INSERT INTO public.projects (id, name, client, status) 
VALUES 
  ('proj-sample', 'Sample Road Project', 'Government Client', 'active')
ON CONFLICT (id) DO NOTHING;
