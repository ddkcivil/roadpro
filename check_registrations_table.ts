
import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl!, serviceKey!);

async function checkTable() {
  const { error } = await supabase.from('registrations').select('count', { count: 'exact', head: true });
  if (error) {
    console.log('❌ registrations table error:', error.message);
  } else {
    console.log('✅ registrations table exists.');
  }
}

checkTable();
