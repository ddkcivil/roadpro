-- 20241202_create_profiles_table.sql
-- Create profiles table + seed BEFORE RLS

-- Create table
CREATE TABLE IF NOT EXISTS public.profiles (
  id uuid REFERENCES auth.users ON DELETE CASCADE PRIMARY KEY,
  full_name text,
  avatar_url text,
  role text DEFAULT 'User',
  last_seen timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS (moved here? No, separate)
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Function to handle new user
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, role)
  VALUES (new.id, new.raw_user_meta_data->>'full_name', 'User');
  RETURN new;
END;
$$ language plpgsql security definer;

-- Trigger
CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- Index
CREATE INDEX IF NOT EXISTS profiles_role_idx ON public.profiles(role);

COMMENT ON TABLE public.profiles IS 'User profiles with roles for RBAC';

SELECT 'Profiles table created successfully' as status;
