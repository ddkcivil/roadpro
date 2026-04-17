
import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl!, serviceKey!);

async function introspect() {
  console.log('Introspecting database structure...');
  
  // Try to use rpc if available, or just a direct query to information_schema if possible
  // Most Supabase setups allow this if you use the service role key
  try {
    const { data: profiles, error: pErr } = await supabase
      .from('profiles')
      .select('*')
      .limit(1);
    
    if (pErr) console.error('Profiles error:', pErr.message);
    else if (profiles && profiles.length > 0) console.log('Profiles columns:', Object.keys(profiles[0]));
    else console.log('Profiles table empty - cannot infer columns via select *');

    const { data: projects, error: prErr } = await supabase
      .from('projects')
      .select('*')
      .limit(1);
    
    if (prErr) console.error('Projects error:', prErr.message);
    else if (projects && projects.length > 0) console.log('Projects columns:', Object.keys(projects[0]));
    else console.log('Projects table empty');

    // Attempt to list columns from information_schema
    const { data: cols, error: cErr } = await supabase.rpc('get_columns', { table_name: 'projects' });
    if (cErr) {
       // If RPC doesn't exist, try a direct query (PostgREST doesn't usually allow this but let's see)
       console.log('RPC get_columns not found. Trying raw SQL via rest is not possible.');
    } else {
       console.log('Columns from RPC:', cols);
    }

  } catch (e: any) {
    console.error('Failed:', e.message);
  }
}

introspect();
