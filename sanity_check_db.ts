
import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';

// Load variables exactly like api/_utils/supabaseClient.ts
const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

console.log('--- SUPABASE SANITY CHECK ---');
console.log('URL:', supabaseUrl ? `${supabaseUrl.substring(0, 30)}...` : 'MISSING');
console.log('Service Key:', supabaseServiceKey ? 'PRESENT' : 'MISSING (Using Anon Key)');

const client = createClient(supabaseUrl!, supabaseServiceKey || supabaseAnonKey!);

async function runCheck() {
  const tables = ['profiles', 'messages', 'projects', 'staff_locations', 'test_table'];
  
  for (const table of tables) {
    console.log(`\n🔍 Checking table: ${table}`);
    
    // 1. Check existence and count
    const { count, error, data } = await client
      .from(table)
      .select('*', { count: 'exact', head: false })
      .limit(1);
      
    if (error) {
      console.log(`❌ Table "${table}" error: ${error.message}`);
      if (error.details) console.log(`   Details: ${error.details}`);
      if (error.hint) console.log(`   Hint: ${error.hint}`);
    } else {
      console.log(`✅ Table "${table}" found. Row count: ${count}`);
      if (data && data.length > 0) {
        console.log(`   Columns detected: ${Object.keys(data[0]).join(', ')}`);
      } else {
        console.log('   Table is empty, trying to detect columns via RPC or empty select...');
      }
    }
  }

  // Test an insert into projects to see if it fails due to schema mismatch
  console.log('\n🧪 Testing Project Insert (Dry Run)...');
  const dummyProject = {
    id: `test-${Date.now()}`,
    name: 'Sanity Test Project',
    client: 'Test Employer',
    status: 'ACTIVE',
    created_at: new Date().toISOString()
  };

  const { error: insertError } = await client
    .from('projects')
    .insert(dummyProject);

  if (insertError) {
    console.log(`❌ Project Insert Failed: ${insertError.message}`);
    console.log(`   Details: ${insertError.details}`);
  } else {
    console.log('✅ Project Insert Success! Deleting test record...');
    await client.from('projects').delete().eq('id', dummyProject.id);
  }
}

runCheck().catch(err => console.error('Sanity check crashed:', err));
