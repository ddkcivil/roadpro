INSERT INTO public.profiles (id, role, status)
VALUES ('71970a49-18a5-4e5d-b35f-0ef9550d6df0', 'ADMIN', 'active')
ON CONFLICT (id) DO UPDATE 
SET role = 'ADMIN', status = 'active';
