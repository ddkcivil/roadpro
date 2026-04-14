-- Migration to fix CamelCase schema and rename columns for consistency with API
BEGIN;

-- 1. PROFILES Table - Rename snake_case to CamelCase
DO $$ 
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'last_seen') THEN
    ALTER TABLE public.profiles RENAME COLUMN last_seen TO "lastSeen";
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'updated_at') THEN
    ALTER TABLE public.profiles RENAME COLUMN updated_at TO "updatedAt";
  END IF;
END $$;

-- 2. MESSAGES Table - Rename snake_case and add quotes to CamelCase
DO $$ 
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'messages' AND column_name = 'projectid') THEN
    ALTER TABLE public.messages RENAME COLUMN projectid TO "projectId";
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'messages' AND column_name = 'senderid') THEN
    ALTER TABLE public.messages RENAME COLUMN senderid TO "senderId";
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'messages' AND column_name = 'receiverid') THEN
    ALTER TABLE public.messages RENAME COLUMN receiverid TO "receiverId";
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'messages' AND column_name = 'read_at') THEN
    ALTER TABLE public.messages RENAME COLUMN read_at TO "readAt";
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'messages' AND column_name = 'attachmenturl') THEN
    ALTER TABLE public.messages RENAME COLUMN attachmenturl TO "attachmentUrl";
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'messages' AND column_name = 'attachmentname') THEN
    ALTER TABLE public.messages RENAME COLUMN attachmentname TO "attachmentName";
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'messages' AND column_name = 'attachmenttype') THEN
    ALTER TABLE public.messages RENAME COLUMN attachmenttype TO "attachmentType";
  END IF;
END $$;

-- 3. PROJECTS Table - Ensure CamelCase columns are quoted (Rename lowercase to CamelCase)
DO $$ 
BEGIN
  -- Projects column renames (add more as needed based on migration)
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'projects' AND column_name = 'createdat') THEN
    ALTER TABLE public.projects RENAME COLUMN createdat TO "createdAt";
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'projects' AND column_name = 'updatedat') THEN
    ALTER TABLE public.projects RENAME COLUMN updatedat TO "updatedAt";
  END IF;
END $$;

-- 3.5. STAFF LOCATIONS Table
CREATE TABLE IF NOT EXISTS public."staffLocations" (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    "projectId" TEXT REFERENCES public.projects(id) ON DELETE CASCADE,
    "userId" uuid REFERENCES auth.users(id) ON DELETE CASCADE,
    latitude DOUBLE PRECISION NOT NULL,
    longitude DOUBLE PRECISION NOT NULL,
    "timestamp" TIMESTAMPTZ DEFAULT NOW(),
    status TEXT DEFAULT 'Active',
    "userName" TEXT,
    "userRole" TEXT,
    UNIQUE("projectId", "userId")
);

ALTER TABLE public."staffLocations" ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Staff can update own location" ON public."staffLocations";
CREATE POLICY "Staff can update own location" ON public."staffLocations" FOR ALL USING (auth.uid() = "userId");
DROP POLICY IF EXISTS "Admins can view all locations" ON public."staffLocations";
CREATE POLICY "Admins can view all locations" ON public."staffLocations" FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND (role = 'Admin' OR role = 'ADMIN' OR role = 'Project Manager'))
);

-- 4. REGISTRATIONS Table - Rename to CamelCase
DO $$ 
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'registrations' AND column_name = 'password_hash') THEN
    ALTER TABLE public.registrations RENAME COLUMN password_hash TO "passwordHash";
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'registrations' AND column_name = 'requested_role') THEN
    ALTER TABLE public.registrations RENAME COLUMN requested_role TO "requestedRole";
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'registrations' AND column_name = 'created_at') THEN
    ALTER TABLE public.registrations RENAME COLUMN created_at TO "createdAt";
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'registrations' AND column_name = 'updated_at') THEN
    ALTER TABLE public.registrations RENAME COLUMN updated_at TO "updatedAt";
  END IF;
END $$;

COMMIT;
