-- Profiles table (matches supabase/migrations schema)
CREATE TABLE IF NOT EXISTS public.profiles (
  id uuid PRIMARY KEY,
  full_name text,
  avatar_url text,
  role text DEFAULT 'USER',
  status text DEFAULT 'active',
  last_seen timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  phone text
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY IF NOT EXISTS "Users can view own profile" ON public.profiles 
 FOR SELECT USING (auth.uid() = id);
 
CREATE POLICY IF NOT EXISTS "Users can update own profile" ON public.profiles 
 FOR UPDATE USING (auth.uid() = id);

CREATE INDEX IF NOT EXISTS idx_profiles_role ON public.profiles(role);
CREATE INDEX IF NOT EXISTS idx_profiles_last_seen ON public.profiles(last_seen);

-- Messages table (matches supabase/migrations schema - snake_case)
CREATE TABLE IF NOT EXISTS public.messages (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id text NOT NULL,
  sender_id uuid REFERENCES public.profiles(id),
  receiver_id text,
  content text,
  created_at timestamptz DEFAULT now(),
  read_at timestamptz,
  read boolean DEFAULT false,
  attachment_url text,
  attachment_name text,
  attachment_type text
);

ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
CREATE POLICY IF NOT EXISTS "Users can view project messages" ON public.messages FOR SELECT 
  USING (
    project_id = 'general' OR 
    sender_id = auth.uid() OR 
    receiver_id = auth.uid() OR
    receiver_id = 'general'
  );
CREATE POLICY IF NOT EXISTS "Users can insert messages" ON public.messages FOR INSERT 
  WITH CHECK (sender_id = auth.uid());
  
CREATE INDEX IF NOT EXISTS idx_messages_project_id ON public.messages(project_id);
CREATE INDEX IF NOT EXISTS idx_messages_created_at ON public.messages(created_at);
CREATE INDEX IF NOT EXISTS idx_messages_sender_receiver ON public.messages(sender_id, receiver_id);

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
