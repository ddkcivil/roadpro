-- Migration: Allow public/anon inserts to audit_logs table
-- This fixes the 500 error when POST /api/audit is called during logout
-- when no user session exists (fire-and-forget audit logging)
--
-- Run this migration via Supabase dashboard or CLI:
-- supabase db push

-- Drop the existing policy that requires authentication
DROP POLICY IF EXISTS "Authenticated users can insert audit logs" ON "public"."audit_logs";

-- Create new policy that allows ANYONE (authenticated or not) to insert audit logs
-- This is intentional for fire-and-forget logging during logout
CREATE POLICY "Public can insert audit logs" ON "public"."audit_logs" 
FOR INSERT TO "anon" 
WITH CHECK (true);

-- Also allow authenticated users (they'll use this policy instead)
CREATE POLICY "Authenticated users can insert audit logs" ON "public"."audit_logs" 
FOR INSERT TO "authenticated" 
WITH CHECK (true);

-- Grant insert permission to anon role
GRANT INSERT ON TABLE "public"."audit_logs" TO "anon";
