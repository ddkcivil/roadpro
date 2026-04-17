import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import path from 'path';

// Load .env.local
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Environment variables missing: SUPABASE_URL or SUPABASE_KEY');
  process.exit(1);
}

console.log(`Connecting to: ${supabaseUrl}`);
const supabase = createClient(supabaseUrl, supabaseKey);

async function runTests() {
  console.log('--- STARTING FUNCTIONAL TESTS ---');

  // Test 1: Connection & Read
  console.log('Test 1: Fetching count from profiles...');
  const { count, error: fetchError } = await supabase
    .from('profiles')
    .select('*', { count: 'exact', head: true });

  if (fetchError) {
    console.error('❌ Test 1 Failed:', fetchError.message);
  } else {
    console.log(`✅ Test 1 Success: Found ${count} profiles.`);
  }

  // Test 2: Write (using Service Role if possible)
  console.log('Test 2: Inserting into test_table...');
  const { data: insertData, error: insertError } = await supabase
    .from('test_table')
    .insert({ message: `Agent functional test at ${new Date().toISOString()}` })
    .select();

  if (insertError) {
    console.warn('❌ Test 2 Failed:', insertError.message);
    if (insertError.message.includes('permission denied')) {
        console.log('Note: This is expected if using the Anon Key without appropriate RLS policies.');
    }
  } else {
    console.log(`✅ Test 2 Success: Inserted row with ID ${insertData?.[0]?.id || 'unknown'}`);
    
    // Cleanup
    if (insertData?.[0]?.id) {
        const { error: deleteError } = await supabase
            .from('test_table')
            .delete()
            .eq('id', insertData[0].id);
        if (!deleteError) console.log('✅ Cleanup: Test row deleted.');
    }
  }

  console.log('--- TESTS COMPLETE ---');
}

runTests().catch(err => {
  console.error('Unhandled error during tests:', err);
  process.exit(1);
});
