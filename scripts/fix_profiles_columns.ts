/**
 * Script to fix profiles table by adding all missing columns
 * Run: npx tsx scripts/fix_profiles_columns.ts
 */

import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY;

console.log('\n=== Fixing Profiles Table ===\n');

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Missing Supabase configuration!');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: { persistSession: false }
});

async function fixProfilesTable() {
  // Try to add columns one by one using INSERT to probe what works
  console.log('Testing which columns exist and need to be added...\n');
  
  // Test insert with minimal data first
  const minimalData = {
    id: '00000000-0000-0000-0000-000000000001',
    role: 'admin'
  };
  
  // Test what columns fail - just don't include full_name yet
  const { error: minimalError } = await supabase
    .from('profiles')
    .upsert(minimalData, { onConflict: 'id' });
  
  if (minimalError) {
    console.log('Minimal insert error:', minimalError.message);
  } else {
    console.log('✓ Minimal insert worked (id, role columns exist)');
  }
  
  // Try adding only the columns that are documented in the error
  // We need to get the admin user ID first
  console.log('\n=== Getting Admin User ===\n');
  
  const { data: userData, error: userError } = await supabase.auth.signInWithPassword({
    email: 'dharmadkunwar20@gmail.com',
    password: 'ddK@152207'
  });
  
  if (userError) {
    console.error('Cannot sign in:', userError.message);
    process.exit(1);
  }
  
  const userId = userData.user.id;
  console.log('Admin User ID:', userId);
  
  // Now check what columns the table actually has - try simple insert
  console.log('\n=== Creating Profile with Known Fields ===\n');
  
  // Try just the basic fields first - id and role should work
  const profileData = {
    id: userId,
    role: 'admin',
    status: 'active'
  };
  
  const { error: profileError } = await supabase
    .from('profiles')
    .upsert(profileData, { onConflict: 'id' });
  
  if (profileError) {
    console.log('Profile insert error:', profileError.message);
    
    // Check exact error
    if (profileError.message.includes('full_name') || profileError.message.includes('column') && profileError.message.includes('does not exist')) {
      console.log('\n⚠️  Need to add columns via SQL Editor in Supabase Dashboard');
      console.log('\n=== SQL to Run in Dashboard ===\n');
      console.log(`Open: https://supabase.com/dashboard/project/qgjjeqasioakqhkoorcj/sql`);
      console.log('\nRun this SQL:\n');
      console.log(`-- Add missing columns
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS full_name varchar(255);
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS status varchar(20) DEFAULT 'pending';
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS email text;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS created_at timestamptz DEFAULT now();
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT now();`);
      console.log('\n-- Then retry the app');
    }
  } else {
    console.log('✓ Profile created successfully!');
  }
  
  // Try with full data
  console.log('\n=== Adding Full Profile Data ===\n');
  
  const fullProfile = {
    id: userId,
    full_name: 'Admin User',
    role: 'admin',
    status: 'active',
    email: 'dharmadkunwar20@gmail.com'
  };
  
  const { error: fullError } = await supabase
    .from('profiles')
    .upsert(fullProfile, { onConflict: 'id' });
  
  if (fullError) {
    console.log('Full profile error:', fullError.message);
  } else {
    console.log('✓ Full profile created!');
    
    // Verify
    const { data: profile } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();
      
    console.log('\nProfile Record:');
    console.log(JSON.stringify(profile, null, 2));
  }
}

fixProfilesTable().catch(console.error);
