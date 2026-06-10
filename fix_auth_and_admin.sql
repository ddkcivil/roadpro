-- Step 1: Create the profiles table
CREATE TABLE IF NOT EXISTS public.profiles (
    id uuid REFERENCES auth.users NOT NULL PRIMARY KEY,
    email text,
    full_name text,
    role text DEFAULT 'SITE_ENGINEER',
    status text DEFAULT 'active',
    created_at timestamptz DEFAULT now()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "profiles_select_all" ON public.profiles FOR SELECT TO authenticated USING (true);
CREATE POLICY "profiles_update_own" ON public.profiles FOR UPDATE TO authenticated USING (auth.uid() = id);

GRANT ALL ON TABLE public.profiles TO authenticated;

-- Step 2: Set your user as ADMIN
INSERT INTO public.profiles (id, role, status)
VALUES ('71970a49-18a5-4e5d-b35f-0ef9550d6df0', 'ADMIN', 'active')
ON CONFLICT (id) DO UPDATE 
SET role = 'ADMIN', status = 'active';
