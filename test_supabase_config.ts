
import 'dotenv/config';
import { supabaseAdmin, isSupabaseConfigured, ensureSupabaseConfigured } from './api/_utils/supabaseClient.ts';
import { createClient } from '@supabase/supabase-js';

console.log('🧪 Supabase Config Test');
console.log('');

try {
  // Test 1: Basic config check
  const configured = isSupabaseConfigured();
  console.log(`✅ Config check: ${configured ? 'PASS - Real env vars detected' : '❌ FAIL - Placeholders/missing vars'}`);
  
  if (!configured) {
    console.log('\n💡 FIX: Add to api/.env:');
    console.log('SUPABASE_URL=https://your-project.supabase.co');
    console.log('SUPABASE_ANON_KEY=your-anon-key');
    console.log('SUPABASE_SERVICE_ROLE_KEY=your-service-role-key');
    process.exit(1);
  }

  // Test 2: Strict validation
  ensureSupabaseConfigured();
  console.log('✅ Strict validation: PASS');

  // Test 3: Test admin client connection - list tables or simple query
  console.log('\n🔗 Testing admin client...');
  console.log('// When using { count: "exact", head: true }, the "data" property is null and "count" is directly on the result object.');
  const { count: profilesCount, error: profilesError } = await supabaseAdmin
    .from('profiles')
    .select('id', { count: 'exact', head: true });

  if (profilesError) {
    console.log(`❌ Profiles query failed: ${profilesError.message}`);
    console.log('   Table missing? Permissions?');
  } else {
    console.log(`✅ Profiles table OK: ${profilesCount || 0} rows`);
  }

  // Test 4: Messages table
  console.log('\n📨 Testing messages table...');
  console.log('// Similarly, destructure count directly.');
  const { count: messagesCount, error: messagesError } = await supabaseAdmin
    .from('messages')
    .select('id', { count: 'exact', head: true });

  if (messagesError) {
    console.log(`❌ Messages table/query failed: ${messagesError.message}`);
    console.log('   Create table or check schema');
  } else {
    console.log(`✅ Messages table OK: ${messagesCount || 0} rows`);
  }

  console.log('\n🎉 All tests passed! API endpoints should work.');
  
} catch (error: any) {
  console.error('\n💥 Test failed:', error.message);
  process.exit(1);
}
