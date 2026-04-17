
import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl!, serviceKey!);

async function bruteForceColumns() {
  const testId = '00000000-0000-0000-0000-000000000001';
  
  const profileColumns = ['full_name', 'name', 'avatar_url', 'avatar', 'last_seen', 'lastSeen'];
  console.log('--- Testing Profiles Columns ---');
  for (const col of profileColumns) {
    const { error } = await supabase.from('profiles').upsert({ id: testId, [col]: 'test' });
    if (error) console.log(`❌ ${col}: ${error.message}`);
    else console.log(`✅ ${col}: Success`);
  }

  const projectColumns = ['created_at', 'createdAt', 'updated_at', 'updatedAt'];
  console.log('\n--- Testing Projects Columns ---');
  for (const col of projectColumns) {
    const { error } = await supabase.from('projects').upsert({ id: 'test-c', name: 'test', client: 'test', [col]: new Date().toISOString() });
    if (error) console.log(`❌ ${col}: ${error.message}`);
    else console.log(`✅ ${col}: Success`);
  }
}

bruteForceColumns();
