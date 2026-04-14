-- Migration to fix and standardize RLS policies for Projects and Profiles
BEGIN;

-- 1. PROFILES Policies
DROP POLICY IF EXISTS "Public profiles are viewable by everyone" ON public.profiles;
DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Admins can view all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Users can insert their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;

CREATE POLICY "Public profiles are viewable by everyone" ON public.profiles FOR SELECT USING (true);
CREATE POLICY "Users can insert their own profile" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = id);
CREATE POLICY "Users can update their own profile" ON public.profiles FOR UPDATE USING (auth.uid() = id);

-- 2. PROJECTS Policies
DROP POLICY IF EXISTS "Anyone can read projects" ON public.projects;
DROP POLICY IF EXISTS "Allow all authenticated users to read projects" ON public.projects;
DROP POLICY IF EXISTS "Allow admins and managers to insert projects" ON public.projects;
DROP POLICY IF EXISTS "Allow admins and managers to update projects" ON public.projects;
DROP POLICY IF EXISTS "Allow admins to delete projects" ON public.projects;
DROP POLICY IF EXISTS "Admins/Managers can modify projects" ON public.projects;

CREATE POLICY "Anyone can read projects" ON public.projects FOR SELECT USING (true);
CREATE POLICY "Admins/Managers can modify projects" ON public.projects FOR ALL USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND (role = 'Admin' OR role = 'ADMIN' OR role = 'Project Manager'))
);

COMMIT;
