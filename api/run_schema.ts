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
  created_at timestamptz DEFAULT now()
);`,

  `ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;`,
  
  `CREATE POLICY IF NOT EXISTS "Users can view own profile" ON public.profiles 
   FOR SELECT USING (auth.uid() = id);`,
   
  `CREATE POLICY IF NOT EXISTS "Users can update own profile" ON public.profiles 
   FOR UPDATE USING (auth.uid() = id);`,
  
  `CREATE INDEX IF NOT EXISTS idx_profiles_role ON public.profiles(role);`,
  `CREATE INDEX IF NOT EXISTS idx_profiles_last_seen ON public.profiles(last_seen);`,

  `-- Messages table
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
);`,

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

  `-- Seed data
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
ON CONFLICT DO NOTHING;`
];

async function runSchemaUpdates() {
    console.log('✅ Schema script ready.');
    console.log('\n🚀 To apply schema:');
    console.log('1. Go to Supabase Dashboard → SQL Editor');
    console.log('2. Copy-paste each SQL block from SQL_STATEMENTS above');
    console.log('3. Or use: supabase db push (if using Supabase CLI)');
    console.log('\n📋 Tables created: profiles, messages, projects');
    console.log('✅ RLS policies & indexes included.');
}

runSchemaUpdates();
