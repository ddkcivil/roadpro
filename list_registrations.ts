import { config } from 'dotenv';
config({ override: true });
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function listRegistrations() {
  console.log('--- Registrations ---');
  const { data, error } = await supabase
    .from('registrations')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error:', error.message);
    return;
  }

  console.log(JSON.stringify(data, null, 2));

  // Check for target ID
  const target = data?.find(r => r.id === 'b394b6c9-3718-438f-8dba-01416e3b0ec1');
  if (target) {
    console.log('\n🎯 TARGET FOUND IN REGISTRATIONS:', target);
  } else {
    console.log('\n❌ Target ID not in registrations');
  }
}

listRegistrations();
