/**
 * Script to seed the admin user - handle email confirmation
 * Run: npx tsx scripts/seed_admin_fix.ts
 */

import 'dotenv/config';
import { readFileSync } from 'fs';
import { createClient } from '@supabase/supabase-js';

// Load .env.local manually
try {
  const envContent = readFileSync('./.env.local', 'utf-8');
  envContent.split('\n').forEach(line => {
    const [key, ...valueParts] = line.split('=');
    if (key && valueParts.length > 0) {
      process.env[key] = valueParts.join('=').trim();
    }
  });
} catch (e) {}

const ADMIN_EMAIL = 'dharmadkunwar20@gmail.com';
const ADMIN_PASSWORD = 'ddK@152207';

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY;

console.log('\n=== Admin Seed Fix ===\n');

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Missing Supabase configuration!');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function seedAdmin() {
  // First, try to sign in - this will tell us if user exists
  console.log('1. Checking if user exists...');
  
  const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
    email: ADMIN_EMAIL,
    password: ADMIN_PASSWORD
  });
  
  if (signInError) {
    if (signInError.message.includes('Invalid login credentials')) {
      console.log('User does not exist. Need to create.');
      console.log('\n⚠️ Cannot create user without service role key.');
      console.log('\n=== SQL to run in Supabase Dashboard ===');
      console.log('https://supabase.com/dashboard/project/hrampejpzsanbkrpzbod/sql\n');
      console.log(`-- Create auth user (run in Authentication > Users > Create user)
-- Or use this to insert into profiles directly with a UUID:`);
      console.log('');
      console.log('-- First, update RLS to allow inserts:');
      console.log(`ALTER TABLE public.profiles DISABLE ROW LEVEL SECURITY;`);
      console.log('');
      console.log('-- Then insert admin profile:');
      console.log(`INSERT INTO public.profiles (id, full_name, role, status, email)
VALUES ('88eb81dd-a894-4a8a-b007-d906abca1c86', 'Admin User', 'admin', 'active', 'dharmadkunwar20@gmail.com')
ON CONFLICT (id) DO UPDATE SET role = 'admin', status = 'active';`);
      console.log('');
      console.log('-- Re-enable RLS:');
      console.log(`ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;`);
      console.log('');
      console.log('-- Create policies:');
      console.log(`CREATE POLICY "profiles_insert_auth" ON profiles FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "profiles_select_auth" ON profiles FOR SELECT TO authenticated USING (true);
CREATE POLICY "profiles_update_auth" ON profiles FOR UPDATE TO authenticated USING (true) WITH CHECK (true);`);
    }
    process.exit(1);
  }
  
  const userId = signInData.user.id;
  console.log('✓ User found:', userId);
  
  // Disable RLS temporarily to insert
  console.log('\n2. Temporarily disabling RLS to insert profile...');
  
  // Try to insert with RLS disabled (won't work without service role)
  console.log('\n3. Attempting profile insert...');
  
  const { error: profileError } = await supabase
    .from('profiles')
    .upsert({
      id: userId,
      full_name: 'Admin User',
      role: 'admin',
      status: 'active',
      email: ADMIN_EMAIL
    }, { onConflict: 'id' });
  
  if (profileError) {
    console.log('Error:', profileError.message);
    console.log('\n⚠️  RLS is blocking the insert.');
    console.log('\n=== Solution: Run SQL in Supabase Dashboard ===');
    console.log('Go to: https://supabase.com/dashboard/project/hrampejpzsanbkrpzbod/sql');
    console.log('\nRun:\n');
    console.log(`-- Step 1: Grant anonymous role insert permission
GRANT INSERT ON TABLE public.profiles TO anon;
GRANT UPDATE ON TABLE public.profiles TO anon;
GRANT SELECT ON TABLE public.profiles TO anon;
GRANT INSERT ON TABLE public.profiles TO authenticated;
GRANT UPDATE ON TABLE public.profiles TO authenticated;
GRANT SELECT ON TABLE public.profiles TO authenticated;`);
    console.log('\n-- Step 2: Update RLS policies');
    console.log(`DROP POLICY IF EXISTS "profiles_insert_own" ON profiles;
CREATE POLICY "profiles_insert_any" ON profiles FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "profiles_select_any" ON profiles FOR SELECT TO authenticated USING (true);
CREATE POLICY "profiles_update_any" ON profiles FOR UPDATE TO authenticated USING (true) WITH CHECK (true);`);
    console.log('\n-- Step 3: Then rerun this script');
    process.exit(1);
  }
  
  console.log('✓ Profile created!');
  
  // Verify
  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .single();
    
  console.log('\nProfile:', JSON.stringify(profile, null, 2));
}

seedAdmin().catch(console.error);
