-- Migration: Normalize registrations table columns
-- Created: 2026-05-19
-- Purpose: Match naming convention (snake_case) used in api/registrations.ts

ALTER TABLE public.registrations RENAME COLUMN passwordhash TO password_hash;
ALTER TABLE public.registrations RENAME COLUMN requestedrole TO requested_role;

-- Verify the change
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'registrations' 
AND column_name IN ('password_hash', 'requested_role');
