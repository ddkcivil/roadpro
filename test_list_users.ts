
import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY;

console.log('URL:', supabaseUrl);
console.log('Service Key starts with:', supabaseServiceKey?.substring(0, 10));

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing env vars');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function test() {
  try {
    const { data: { users }, error } = await supabase.auth.admin.listUsers();
    if (error) {
      console.error('List users error:', error.message);
      console.log('Full error:', JSON.stringify(error, null, 2));
    } else {
      console.log('Users found:', users.length);
      users.forEach(u => console.log(` - ${u.email} (ID: ${u.id})`));
    }
  } catch (e: any) {
    console.error('Fetch failed:', e.message);
  }
}

test();
