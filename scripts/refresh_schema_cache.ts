/**
 * Script to refresh PostgREST schema cache
 * This fixes the "Could not find the 'lab_tests' column of 'projects' in the schema cache" error
 * 
 * Run: npx tsx scripts/refresh_schema_cache.ts
 * 
 * Note: This requires service_role key which shouldn't be exposed in frontend code.
 * Instead, run the SQL below directly in your Supabase SQL Editor.
 */

import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';

// This script attempts to refresh schema cache by making a query
// However, the proper fix requires running SQL in Supabase Dashboard

const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY;

// For schema reload, you'd need service_role key (not recommended to use here)
// Instead, run this in Supabase SQL Editor: https://supabase.com/dashboard/project/qgjjeqasioakqhkoorcj/sql

console.log('\n=== PostgREST Schema Cache Refresh ===\n');
console.log('To fix the schema cache error, run the following SQL in your Supabase SQL Editor:');
console.log('\nhttps://supabase.com/dashboard/project/qgjjeqasioakqhkoorcj/sql\n');
console.log('SQL Command:');
console.log('=============');
console.log("NOTIFY pgrst, 'reload schema';");
console.log('=============\n');
console.log('Then verify with:');
console.log("SELECT column_name FROM information_schema.columns WHERE table_name = 'projects' AND column_name = 'lab_tests';\n");

// Test if lab_tests is accessible
if (supabaseUrl && supabaseAnonKey) {
  const supabase = createClient(supabaseUrl, supabaseAnonKey, {
    auth: { persistSession: false }
  });

  console.log('Testing if lab_tests column is accessible...\n');

  // Query the projects table and check if the error occurs
  const { data, error } = await supabase
    .from('projects')
    .select('lab_tests')
    .limit(1);

  if (error) {
    console.log('❌ Error accessing lab_tests column:', error.message);
    console.log('\n⚠️  The schema cache needs to be refreshed.');
    console.log('Please run the SQL command above in Supabase SQL Editor.');
  } else {
    console.log('✓ lab_tests column is accessible!');
    console.log('Sample data:', data);
  }
}

console.log('\n=== Alternative: Check Current Schema ===\n');

// List what columns PostgREST knows about
if (supabaseUrl && supabaseAnonKey) {
  const supabase = createClient(supabaseUrl, supabaseAnonKey, {
    auth: { persistSession: false }
  });

  // Try to get one project with all fields
  const { data: project, error: projectError } = await supabase
    .from('projects')
    .select('*')
    .limit(1)
    .maybeSingle();

  if (projectError) {
    console.log('Error:', projectError.message);
  } else if (project) {
    console.log('Available fields:', Object.keys(project));
    console.log('\nHas lab_tests:', 'lab_tests' in project);
  }
}
