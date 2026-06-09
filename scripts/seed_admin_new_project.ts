/**
 * Script to seed the admin user in the new Supabase project
 * Run: npx tsx scripts/seed_admin_new_project.ts
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
  console.log('Loaded .env.local');
} catch (e) {
  console.log('No .env.local found, using process.env');
}

const ADMIN_EMAIL = 'dharmadkunwar20@gmail.com';
const ADMIN_PASSWORD = 'ddK@152207';

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY;

console.log('\n=== Seeding Admin Profile ===\n');
console.log('Project:', supabaseUrl);

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Missing Supabase configuration!');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function seedAdmin() {
  console.log('\n1. Creating admin user...');
  
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
    if (signUpError.message.includes('already been registered')) {
      console.log('User already exists, signing in...');
      
      const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
        email: ADMIN_EMAIL,
        password: ADMIN_PASSWORD
      });
      
      if (signInError) {
        console.error('Sign in error:', signInError.message);
        process.exit(1);
      }
      
      console.log('Admin User ID:', signInData.user.id);
      
      // Create profile
      const { error: profileError } = await supabase
        .from('profiles')
        .upsert({
          id: signInData.user.id,
          full_name: 'Admin User',
          role: 'admin',
          status: 'active',
          email: ADMIN_EMAIL
        }, { onConflict: 'id' });
      
      if (profileError) {
        console.error('Profile error:', profileError.message);
      } else {
        console.log('✓ Admin profile seeded successfully!');
      }
      
      // Verify
      const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', signInData.user.id)
        .single();
        
      console.log('\nProfile Record:');
      console.log(JSON.stringify(profile, null, 2));
      
    } else {
      console.error('Signup error:', signUpError.message);
      process.exit(1);
    }
  } else {
    const userId = signUpData.user?.id;
    console.log('Created new user with ID:', userId);
    
    // Create profile
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
      console.error('Profile error:', profileError.message);
    } else {
      console.log('✓ Admin profile seeded successfully!');
    }
    
    // Verify
    const { data: profile } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();
      
    console.log('\nProfile Record:');
    console.log(JSON.stringify(profile, null, 2));
  }
  
  console.log('\n=== Seeding Complete ===\n');
  
  console.log('Admin credentials:');
  console.log(`  Email: ${ADMIN_EMAIL}`);
  console.log(`  Password: ${ADMIN_PASSWORD}`);
  console.log(`  Role: admin`);
}

seedAdmin().catch(console.error);
