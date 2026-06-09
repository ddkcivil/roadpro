/**
 * Script to check actual profiles table structure
 * Run: npx tsx scripts/check_profiles_schema.ts
 */

import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY;

console.log('\n=== Analyzing profiles Table Structure ===\n');

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Missing Supabase configuration!');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Try to get table info via different methods
console.log('Checking table structure via public query...\n');

// Method 1: Try to fetch with no columns to see what exists
const { data, error } = await supabase
  .from('profiles')
  .select('*')
  .limit(1);

if (error) {
  console.error('Error querying profiles:', error.message);
  
  // If table doesn't exist at all
  if (error.message.includes('does not exist')) {
    console.log('\n❌ The profiles table does NOT exist in the database.');
  }
  process.exit(1);
}

// Show the actual columns if we got data
if (data && data.length > 0) {
  console.log('✓ profiles table EXISTS');
  console.log('Sample record:', JSON.stringify(data[0], null, 2));
  
  const columns = Object.keys(data[0]);
  console.log('\nColumns found in profiles table:');
  columns.forEach(col => console.log(`  - ${col}`));
} else {
  console.log('✓ profiles table EXISTS but is empty');
  
  // Try to infer structure via INSERT to see what fields are accepted
  console.log('\nTrying to infer schema by inserting test record...');
  
  const testProfile = {
    id: '00000000-0000-0000-0000-000000000000',
    full_name: 'Test User',
    role: 'test'
  };
  
  const { error: insertError } = await supabase
    .from('profiles')
    .upsert(testProfile, { onConflict: 'id' });
  
  if (insertError) {
    console.log('Insert error:', insertError.message);
    
    // Try to find what columns are accepted
    if (insertError.message.includes('full_name')) {
      console.log('\n⚠️  The profiles table is missing the full_name column!');
      console.log('\nThis is why: your local migration has full_name, but the remote database schema does not.');
    }
  }
}

console.log('\n=== Analysis Complete ===\n');
