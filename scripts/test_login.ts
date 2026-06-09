/**
 * Test login with credentials
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

const supabaseUrl = process.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY || '';

console.log('\n=== Testing Login ===\n');
console.log('Using:', supabaseUrl);
console.log('Email:', ADMIN_EMAIL);

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function testLogin() {
  const { data, error } = await supabase.auth.signInWithPassword({
    email: ADMIN_EMAIL,
    password: ADMIN_PASSWORD
  });
  
  if (error) {
    console.error('Login Error:', error.message);
    process.exit(1);
  }
  
  console.log('Login successful!');
  console.log('User ID:', data.user.id);
  console.log('Session:', data.session ? 'Active' : 'None');
  
  // Check profile
  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', data.user.id)
    .single();
    
  console.log('\nProfile:', JSON.stringify(profile, null, 2));
}

testLogin().catch(console.error);
