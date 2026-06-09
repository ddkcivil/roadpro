/**
 * Script to verify Supabase environment configuration
 * Run: npx tsx scripts/verify_supabase_env.ts
 */

import 'dotenv/config';
import { readFileSync } from 'fs';

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
  // File may not exist
}
import { createClient } from '@supabase/supabase-js';

// Check environment variables
const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY;

console.log('\n=== Supabase Environment Verification ===\n');

console.log('Environment Variables:');
console.log(`  VITE_SUPABASE_URL: ${process.env.VITE_SUPABASE_URL ? '✓ Set (' + process.env.VITE_SUPABASE_URL.substring(0, 30) + '...)' : '✗ Not set'}`);
console.log(`  NEXT_PUBLIC_SUPABASE_URL: ${process.env.NEXT_PUBLIC_SUPABASE_URL ? '✓ Set (' + process.env.NEXT_PUBLIC_SUPABASE_URL.substring(0, 30) + '...)' : '✗ Not set'}`);
console.log(`  SUPABASE_URL: ${process.env.SUPABASE_URL ? '✓ Set (' + process.env.SUPABASE_URL.substring(0, 30) + '...)' : '✗ Not set'}`);

console.log(`\n  SUPABASE_ANON_KEY: ${supabaseAnonKey ? '✓ Set (' + supabaseAnonKey.substring(0, 20) + '...)' : '✗ Not set'}`);

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('\n❌ ERROR: Missing Supabase configuration!');
  console.error('Please ensure these environment variables are set in your .env file:');
  console.error('  VITE_SUPABASE_URL=https://your-project.supabase.co');
  console.error('  VITE_SUPABASE_ANON_KEY=your-anon-key');
  process.exit(1);
}

// Extract project ref from URL
const urlMatch = supabaseUrl.match(/https:\/\/([a-z]+)\.supabase\.co/);
const projectRef = urlMatch ? urlMatch[1] : 'unknown';

console.log('\nProject Configuration:');
console.log(`  URL: ${supabaseUrl}`);
console.log(`  Project Ref: ${projectRef}`);

// Test the connection
console.log('\n=== Testing API Connection ===\n');

try {
  const supabase = createClient(supabaseUrl, supabaseAnonKey);
  
  // Test query - try to fetch from profiles table
  console.log('Testing profiles table connection...');
  
  const { data, error } = await supabase
    .from('profiles')
    .select('id, full_name, role')
    .limit(1);
  
  if (error) {
    console.error('\n❌ ERROR: Cannot access profiles table!');
    console.error('  Error:', error.message);
    console.error('  Details:', JSON.stringify(error, null, 2));
    
    // Check if it's a table not found error
    if (error.message.includes('relation') && error.message.includes('does not exist')) {
      console.error('\n⚠️  The profiles table does NOT exist in your Supabase database!');
      console.error('\nTo fix this:');
      console.error('  1. Go to https://supabase.com/dashboard/project/' + projectRef + '/sql');
      console.error('  2. Run the SQL to create the profiles table');
    }
    process.exit(1);
  }
  
  console.log('✓ Successfully connected to profiles table!');
  console.log('  Data:', data);
  
} catch (err: any) {
  console.error('\n❌ Connection failed:', err.message);
  process.exit(1);
}

console.log('\n=== Verification Complete ===\n');
