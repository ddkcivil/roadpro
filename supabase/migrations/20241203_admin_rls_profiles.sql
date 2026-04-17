-- Admin RLS Policies for Profiles Table
-- Enable Row Level Security if not already enabled
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Admin: Full access to all profiles
CREATE POLICY "Admin full access to profiles" ON public.profiles
  FOR ALL
  USING (EXISTS (
    SELECT 1 FROM public.profiles admin_profile 
    WHERE admin_profile.id = auth.uid() 
    AND admin_profile.role IN ('Admin', 'ADMIN')
  ))
  WITH CHECK (true);

-- Users: View own profile + admin view all
CREATE POLICY "Users view own profile" ON public.profiles
  FOR SELECT
  USING (
    auth.uid() = id 
    OR EXISTS (
      SELECT 1 FROM public.profiles admin_profile 
      WHERE admin_profile.id = auth.uid() 
      AND admin_profile.role IN ('Admin', 'ADMIN')
    )
  );

-- Users: Update own profile (non-role fields) + admin update any
CREATE POLICY "Users update own profile" ON public.profiles
  FOR UPDATE
  USING (
    auth.uid() = id
    OR EXISTS (
      SELECT 1 FROM public.profiles admin_profile 
      WHERE admin_profile.id = auth.uid() 
      AND admin_profile.role IN ('Admin', 'ADMIN')
    )
  )
  WITH CHECK (
    (auth.uid() = id)
    OR EXISTS (
      SELECT 1 FROM public.profiles admin_profile 
      WHERE admin_profile.id = auth.uid() 
      AND admin_profile.role IN ('Admin', 'ADMIN')
    )
  );

-- Insert: New users can insert own profile
CREATE POLICY "Users insert own profile" ON public.profiles
  FOR INSERT
  WITH CHECK (auth.uid() = id);

COMMENT ON TABLE public.profiles IS 'User profiles with roles for RBAC. Admin role bypasses RLS.';

SELECT 'Admin RLS policies created successfully' as status;
