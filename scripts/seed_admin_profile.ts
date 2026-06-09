/**
 * Script to seed the admin user profile
 * Run: npx tsx scripts/seed_admin_profile.ts
 */

import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const ADMIN_EMAIL = 'dharmadkunwar20@gmail.com';
const ADMIN_PASSWORD = 'ddK@152207';

console.log('\n=== Seeding Admin Profile ===\n');

if (!supabaseUrl || !supabaseAnonKey || !supabaseServiceKey) {
  console.error('Missing Supabase configuration!');
  console.error('Need SUPABASE_SERVICE_ROLE_KEY in environment');
  process.exit(1);
}

// Use service role key for admin operations
const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: { persistSession: false }
});

async function seedAdminProfile() {
  console.log('Step 1: Adding missing columns to profiles table...');
  
  // Add all required columns
  const columnsToAdd = [
    'full_name varchar(255)',
    'avatar_url text',
    'role varchar(50) DEFAULT user',
    'status varchar(20) DEFAULT pending',
    'last_seen timestamptz',
    'created_at timestamptz DEFAULT now()',
    'updated_at timestamptz DEFAULT now()',
    'phone text',
    'email text'
  ];
  
  for (const colDef of columnsToAdd) {
    const colName = colDef.split(' ')[0];
    try {
      await supabase.rpc('exec_sql', { 
        sql: `ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS ${colDef}` 
      }).catch(() => {
        // Ignore errors if column already exists
      });
    } catch (e) {
      // Continue even if RPC fails
    }
  }
  
  console.log('Step 2: Creating/Deleting existing admin if exists...');
  
  // Try to get or create the admin user via auth
  // First check if user exists by trying to sign in
  const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
    email: ADMIN_EMAIL,
    password: ADMIN_PASSWORD
  });
  
  let userId: string;
  
  if (signInError) {
    console.log('User does not exist, creating new user...');
    
    // Create the user
    const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
      email: ADMIN_EMAIL,
      password: ADMIN_PASSWORD,
      options: {
        data: {
          full_name: 'Admin User',
          role: 'admin'
        }
      }
    });
    
    if (signUpError) {
      console.error('Error creating user:', signUpError.message);
      process.exit(1);
    }
    
    userId = signUpData.user?.id;
    console.log('Created new user with ID:', userId);
  } else {
    userId = signInData.user.id;
    console.log('Existing user signed in, ID:', userId);
  }
  
  if (!userId) {
    console.error('Could not get user ID');
    process.exit(1);
  }
  
  console.log('Step 3: Creating admin profile...');
  
  // Create or update the profile
  const { error: profileError } = await supabase
    .from('profiles')
    .upsert({
      id: userId,
      full_name: 'Admin User',
      role: 'admin',
      status: 'active',
      email: ADMIN_EMAIL,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }, { onConflict: 'id' });
  
  if (profileError) {
    console.error('Error creating profile:', profileError.message);
    process.exit(1);
  }
  
  console.log('✓ Admin profile created successfully!');
  console.log('\nAdmin User Details:');
  console.log(`  Email: ${ADMIN_EMAIL}`);
  console.log(`  User ID: ${userId}`);
  console.log(`  Role: admin`);
  console.log(`  Status: active`);
  
  console.log('\n=== Seeding Complete ===\n');
  
  // Verify by fetching the profile
  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .single();
    
  console.log('Profile record:', JSON.stringify(profile, null, 2));
}

seedAdminProfile().catch(console.error);
