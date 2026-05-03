-- Migration: Add email to profiles table for easier frontend access
-- Run in Supabase Dashboard → SQL Editor

ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS email TEXT;
CREATE INDEX IF NOT EXISTS idx_profiles_email ON public.profiles(email);

-- Ensure phone column exists (it might already from api/create_tables.sql but let's be safe)
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS phone TEXT;

-- Verify
SELECT 'profiles_email_phone_added' as status;
