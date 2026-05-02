-- Profiles table
CREATE TABLE IF NOT EXISTS public.profiles (
  id uuid REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  full_name text,
  avatar_url text,
  role text DEFAULT 'SITE_ENGINEER',
  last_seen timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY IF NOT EXISTS "Users can view own profile" ON public.profiles 
 FOR SELECT USING (auth.uid() = id);
 
CREATE POLICY IF NOT EXISTS "Users can update own profile" ON public.profiles 
 FOR UPDATE USING (auth.uid() = id);

CREATE INDEX IF NOT EXISTS idx_profiles_role ON public.profiles(role);
CREATE INDEX IF NOT EXISTS idx_profiles_last_seen ON public.profiles(last_seen);

-- Messages table
CREATE TABLE IF NOT EXISTS public.messages (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  projectId text NOT NULL,
  senderId uuid NOT NULL REFERENCES public.profiles(id),
  receiverId text NOT NULL,
  content text,
  timestamp timestamptz DEFAULT now(),
  read boolean DEFAULT false,
  readAt timestamptz,
  attachmentUrl text,
  attachmentName text,
  attachmentType text
);

ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
CREATE POLICY IF NOT EXISTS "Users can view project messages" ON public.messages FOR SELECT 
  USING (
    projectId = 'general' OR 
    senderId = auth.uid() OR 
    receiverId = auth.uid() OR
    receiverId = 'general'
  );
CREATE POLICY IF NOT EXISTS "Users can insert messages" ON public.messages FOR INSERT 
  WITH CHECK (senderId = auth.uid());
  
CREATE INDEX IF NOT EXISTS idx_messages_projectId ON public.messages(projectId);
CREATE INDEX IF NOT EXISTS idx_messages_timestamp ON public.messages(timestamp);
CREATE INDEX IF NOT EXISTS idx_messages_sender_receiver ON public.messages(senderId, receiverId);

-- Registrations table
CREATE TABLE IF NOT EXISTS public.registrations (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  name text NOT NULL,
  email text NOT NULL UNIQUE,
  phone text,
  password_hash text NOT NULL,
  requested_role text NOT NULL,
  status text DEFAULT 'pending',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE public.registrations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins can manage registrations" ON public.registrations
  FOR ALL USING (EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.id = auth.uid() AND profiles.role = 'ADMIN'
  ));
