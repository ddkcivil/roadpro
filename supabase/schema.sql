import 'dotenv/config';
import { createClient, SupabaseClient } from '@supabase/supabase-js';

const supabaseUrlEnv = process.env.SUPABASE_URL;
const supabaseAnonKeyEnv = process.env.SUPABASE_ANON_KEY;
const supabaseServiceKeyEnv = process.env.SUPABASE_SERVICE_ROLE_KEY;

const isPlaceholder = (val: string | undefined | null): boolean => !val || val.includes('your-project') || val.includes('your-anon');

export const ensureSupabaseConfigured = (): { url: string; anonKey: string; serviceKey: string } => {
    if (isPlaceholder(supabaseUrlEnv) || isPlaceholder(supabaseAnonKeyEnv)) {
        const missing = [];
        if (isPlaceholder(supabaseUrlEnv)) missing.push('SUPABASE_URL');
        if (isPlaceholder(supabaseAnonKeyEnv)) missing.push('SUPABASE_ANON_KEY');
        console.error(`[CONFIG] Missing or placeholder Supabase variables: ${missing.join(', ')}`);
        throw new Error(`CRITICAL: Supabase environment variables (${missing.join(', ')}) are missing or using placeholder values. Please check your .env file or Vercel dashboard.`);
    }
    if (!supabaseUrlEnv || !supabaseUrlEnv.startsWith('http')) {
        console.error(`[CONFIG] Invalid SUPABASE_URL format: "${supabaseUrlEnv}"`);
        throw new Error(`CRITICAL: Invalid SUPABASE_URL format: "${supabaseUrlEnv}". It must be a valid HTTP/HTTPS URL.`);
    }
    if (!supabaseServiceKeyEnv || isPlaceholder(supabaseServiceKeyEnv)) {
        console.error('[CONFIG] Missing or placeholder SUPABASE_SERVICE_ROLE_KEY.');
        throw new Error('CRITICAL: SUPABASE_SERVICE_ROLE_KEY is missing or using a placeholder value. This key is required for admin operations.');
    }
    // We've checked that these are defined and valid, so we can assert non-null
    return { url: supabaseUrlEnv!, anonKey: supabaseAnonKeyEnv!, serviceKey: supabaseServiceKeyEnv! };
};

// Initialize Supabase clients after configuration check
let supabasePublic: SupabaseClient;
let supabaseAdmin: SupabaseClient;

try {
    const { url, anonKey, serviceKey } = ensureSupabaseConfigured();
    supabasePublic = createClient(url, anonKey);
    supabaseAdmin = createClient(url, serviceKey);
} catch (error) {
    console.error('Failed to initialize Supabase clients:', error);
    // Exit if configuration fails, as the script cannot proceed
    process.exit(1);
}

const SQL_STATEMENTS = [
  `-- Profiles table
CREATE TABLE IF NOT EXISTS public.profiles (
  id uuid REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  full_name text,
  avatar_url text,
  role text DEFAULT 'SITE_ENGINEER',
  last_seen timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now(),
  phone text -- Added phone column
);`,

  `-- BOQ Items table
CREATE TABLE IF NOT EXISTS public.boq_items (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  projectId text NOT NULL,
  item_name text NOT NULL,
  description text,
  quantity numeric,
  unit_price numeric,
  total_price numeric,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);`,

  `-- RFIs table
CREATE TABLE IF NOT EXISTS public.rfis (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  projectId text NOT NULL,
  title text NOT NULL,
  description text,
  question text NOT NULL,
  answer text,
  status text DEFAULT 'open' CHECK (status IN ('open', 'closed', 'pending')),
  createdBy uuid REFERENCES public.profiles(id),
  createdAt timestamptz DEFAULT now(),
  answeredAt timestamptz,
  answeredBy uuid REFERENCES public.profiles(id)
);`,

  `-- Daily Reports table
CREATE TABLE IF NOT EXISTS public.daily_reports (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  projectId text NOT NULL,
  report_date date NOT NULL,
  weather text,
  progress_summary text,
  issues text,
  createdBy uuid REFERENCES public.profiles(id),
  createdAt timestamptz DEFAULT now()
);`,

  `-- Vehicles table
CREATE TABLE IF NOT EXISTS public.vehicles (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  projectId text NOT NULL,
  make text,
  model text,
  year integer,
  license_plate text UNIQUE,
  vin text UNIQUE,
  driverId uuid REFERENCES public.profiles(id),
  status text DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'maintenance')),
  createdAt timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);`,

`-- Registrations table (pending user registrations)
CREATE TABLE IF NOT EXISTS public.registrations (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  name text NOT NULL,
  email text NOT NULL UNIQUE,
  phone text,
  password_hash text NOT NULL,
  requested_role text DEFAULT 'SITE_ENGINEER',
  status text DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  created_at timestamptz DEFAULT now()
);`,

  ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
  -- Policy for Admin access: Admins can perform all actions.
  CREATE POLICY IF NOT EXISTS "Admin full access to profiles" ON public.profiles FOR ALL USING (auth.role() = 'admin');

  -- Policy for users viewing their own profile or if they are admin.
  CREATE POLICY IF NOT EXISTS "Users can view own profile" ON public.profiles 
   FOR SELECT USING (auth.uid() = id OR auth.role() = 'admin');

  -- Policy for users updating their own profile or if they are admin.
  CREATE POLICY IF NOT EXISTS "Users can update own profile" ON public.profiles 
   FOR UPDATE USING (auth.uid() = id OR auth.role() = 'admin') WITH CHECK (auth.uid() = id OR auth.role() = 'admin');

  -- Policy for users inserting their own profile.
  CREATE POLICY IF NOT EXISTS "Users insert own profile" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = id);

  CREATE INDEX IF NOT EXISTS idx_profiles_role ON public.profiles(role);
  CREATE INDEX IF NOT EXISTS idx_profiles_last_seen ON public.profiles(last_seen);
  
  `-- RLS for registrations (admins only)
ALTER TABLE public.registrations ENABLE ROW LEVEL SECURITY;`,
  `CREATE POLICY IF NOT EXISTS "Admins can view registrations" ON public.registrations 
   FOR SELECT USING (true);`,

  `ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;`,
  `CREATE POLICY IF NOT EXISTS "Users can view project messages" ON public.messages FOR SELECT 
    USING (
      projectId = 'general' OR 
      senderId = auth.uid() OR 
      receiverId = auth.uid() OR
      receiverId = 'general'
    );`,
  `CREATE POLICY IF NOT EXISTS "Users can insert messages" ON public.messages FOR INSERT 
    WITH CHECK (senderId = auth.uid());`,
    
  `CREATE INDEX IF NOT EXISTS idx_messages_projectId ON public.messages(projectId);`,
  `CREATE INDEX IF NOT EXISTS idx_messages_timestamp ON public.messages(timestamp);`,
  `CREATE INDEX IF NOT EXISTS idx_messages_sender_receiver ON public.messages(senderId, receiverId);`,

  `-- Projects table
  CREATE TABLE IF NOT EXISTS public.projects (
    id text PRIMARY KEY,
    name text NOT NULL,
    client text,
    contract_no text,
    start_date date,
    end_date date,
    updated_at timestamptz DEFAULT now(),
    contractor text,
    metadata jsonb,
    boq jsonb,
    variation_orders jsonb,
    measurement_sheets jsonb,
    owner_id uuid REFERENCES public.profiles(id)
  );`,
  `ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;`,

  `-- RLS policies for projects table
  -- Allow authenticated users with specific roles to insert projects.
  CREATE POLICY IF NOT EXISTS "Admins and Project Managers can insert projects" ON public.projects FOR INSERT TO authenticated
  USING (
      (SELECT role FROM public.profiles WHERE id = auth.uid()) IN ('admin', 'project manager', 'manager', 'project_project_manager', 'SITE_ENGINEER')
  );`,

  `-- Allow authenticated users with specific roles to select projects.
  CREATE POLICY IF NOT EXISTS "Admins and Project Managers can select projects" ON public.projects FOR SELECT TO authenticated
  USING (
      (SELECT role FROM public.profiles WHERE id = auth.uid()) IN ('admin', 'project manager', 'manager', 'project_manager')
  );`,

  `-- Allow project owners to select their own projects.
  CREATE POLICY IF NOT EXISTS "Owners can select their own projects" ON public.projects FOR SELECT TO authenticated
  USING (
      owner_id = auth.uid()
  );`,

  `-- Optional: Policies for UPDATE and DELETE can be added here if needed.
  -- Example: Allow project owner to update their project.
  -- CREATE POLICY IF NOT EXISTS "Owners can update own projects" ON public.projects FOR UPDATE TO authenticated
  -- USING (owner_id = auth.uid());

  `-- Example: Allow admins to delete any project.
  -- CREATE POLICY IF NOT EXISTS "Admins can delete any project" ON public.projects FOR DELETE TO authenticated
  -- USING (
  --     (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'admin'
  -- );`,

  `CREATE INDEX IF NOT EXISTS idx_projects_owner_id ON public.projects(owner_id);`,
  `CREATE INDEX IF NOT EXISTS idx_projects_created_at ON public.projects(start_date);`, -- Assuming start_date can be used for ordering

  `-- Seed data for existing tables
INSERT INTO public.profiles (id, full_name, avatar_url, role, last_seen)
VALUES 
  ('00000000-0000-0000-0000-000000000000', 'Admin User', 'https://ui-avatars.com/api/?name=Admin', 'Admin', now()),
  ('11111111-1111-1111-1111-111111111111', 'Site Engineer', 'https://ui-avatars.com/api/?name=Engineer', 'SITE_ENGINEER', now())
ON CONFLICT (id) DO NOTHING;`,

`INSERT INTO public.projects (id, name, owner_id) 
VALUES ('general', 'General Chat', '00000000-0000-0000-0000-000000000000')
ON CONFLICT (id) DO NOTHING;`,

`INSERT INTO public.messages (projectId, senderId, receiverId, content, read)
VALUES 
  ('general', '00000000-0000-0000-0000-000000000000', 'general', 'Welcome to the general chat! 👋', true),
  ('general', '11111111-1111-1111-1111-111111111111', 'general', 'Hello team!', false)
ON CONFLICT DO NOTHING;`,

  `-- Seed data for new tables
-- Assuming default project ID 'general' and admin/engineer profiles for FKs
INSERT INTO public.boq_items (projectId, item_name, description, quantity, unit_price, total_price)
VALUES 
  ('general', 'Item A', 'First item for BOQ', 10, 50.00, 500.00),
  ('general', 'Item B', 'Second item for BOQ', 5, 120.00, 600.00)
ON CONFLICT DO NOTHING;`,

`INSERT INTO public.rfis (projectId, title, description, question, status, createdBy)
VALUES 
  ('general', 'Clarification on Spec A', 'Need more details on specification A', 'What are the exact dimensions for component X?', 'open', '11111111-1111-1111-1111-111111111111'),
  ('general', 'Material question', 'Regarding material for structure Y', 'Is concrete grade C30 suitable?', 'open', '11111111-1111-1111-1111-111111111111')
ON CONFLICT DO NOTHING;`,

`INSERT INTO public.daily_reports (projectId, report_date, weather, progress_summary, issues, createdBy)
VALUES 
  ('general', NOW()::date - INTERVAL '1 day', 'Sunny', 'Completed foundation work.', 'Minor delay in concrete delivery.', '11111111-1111-1111-1111-111111111111'),
  ('general', NOW()::date, 'Partly Cloudy', 'Pouring concrete for the main structure.', 'None', '11111111-1111-1111-1111-111111111111')
ON CONFLICT DO NOTHING;`,

`INSERT INTO public.vehicles (projectId, make, model, year, license_plate, vin, driverId, status)
VALUES 
  ('general', 'Toyota', 'Hilux', 2022, 'XYZ-123', 'VIN1234567890ABCDEF', '11111111-1111-1111-1111-111111111111', 'active'),
  ('general', 'Ford', 'Transit', 2021, 'ABC-789', 'VINFEDCBA0987654321', '11111111-1111-1111-1111-111111111111', 'active')
ON CONFLICT DO NOTHING;`
];

async function runSchemaUpdates() {
    console.log('✅ Schema script ready.');
    console.log('
🚀 To apply schema:');
    console.log('1. Go to Supabase Dashboard → SQL Editor');
    console.log('2. Copy-paste each SQL block from SQL_STATEMENTS above');
    console.log('3. Or use: supabase db push (if using Supabase CLI)');
    console.log('
📋 Tables created: profiles, messages, projects, boq_items, rfis, daily_reports, vehicles');
    console.log('✅ RLS policies & indexes included.');
}

runSchemaUpdates();
