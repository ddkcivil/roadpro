-- FIX: RLS Recursion in profiles table
-- Run this in your Supabase SQL Editor

-- 1. Drop the recursive policy
DROP POLICY IF EXISTS "Admins can view all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Admins can view all audit logs" ON public.audit_logs;
DROP POLICY IF EXISTS "Admins can view and manage registrations" ON public.registrations;

-- 2. Create a SECURITY DEFINER function to check admin status safely
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() 
    AND (role = 'Admin' OR role = 'ADMIN')
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- 3. Re-create policies using the safe function
CREATE POLICY "Admins can view all profiles" ON public.profiles
    FOR SELECT USING (is_admin());

CREATE POLICY "Admins can view all audit logs" ON public.audit_logs
    FOR SELECT USING (is_admin());

CREATE POLICY "Admins can view and manage registrations" ON public.registrations
    FOR ALL USING (is_admin());
