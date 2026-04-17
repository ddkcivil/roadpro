
import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl!, serviceKey!);

async function testInsert() {
  const testId = '00000000-0000-0000-0000-000000000000';
  
  console.log('Testing profiles insert with full_name...');
  const { error: pErr } = await supabase.from('profiles').upsert({
    id: testId,
    full_name: 'Test',
    role: 'admin'
  });
  if (pErr) console.error('profiles (full_name) failed:', pErr.message);
  else console.log('profiles (full_name) success');

  console.log('\nTesting projects insert with created_at...');
  const { error: prErr } = await supabase.from('projects').upsert({
    id: 'test-proj',
    name: 'Test Project',
    created_at: new Date().toISOString()
  });
  if (prErr) console.error('projects (created_at) failed:', prErr.message);
  else console.log('projects (created_at) success');
  
  // Clean up
  await supabase.from('profiles').delete().eq('id', testId);
  await supabase.from('projects').delete().eq('id', 'test-proj');
}

testInsert();
