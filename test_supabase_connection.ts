
import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

console.log('URL:', supabaseUrl);
console.log('Key length:', supabaseAnonKey?.length);

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Missing env vars');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

console.log('Supabase client created');
console.log('Auth available:', !!supabase.auth);

async function test() {
  try {
    const { data, error } = await supabase.from('profiles').select('count', { count: 'exact', head: true });
    if (error) {
      console.error('Query error:', error.message);
    } else {
      console.log('Profiles count:', data, 'Success');
    }
  } catch (e) {
    console.error('Fetch failed:', e);
  }
}

test();
