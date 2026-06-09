import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.vercel' });

const supabaseUrl = process.env.SUPABASE_URL || '';
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY || '';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function testLogin() {
  const email = 'admin@myroad.app';
  const password = 'Admin123!ChangeMe';
  
  console.log(`Attempting login for: ${email}`);
  
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    console.error('Login failed:', error.message);
  } else {
    console.log('Login successful! Session:', data.session ? 'Yes' : 'No');
  }
}

testLogin();
