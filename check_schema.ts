
import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Missing env vars');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function checkSchema() {
  console.log('--- Table: profiles ---');
  // We can't easily query the schema directly via REST API in Supabase, 
  // but we can try to select one row and see the keys.
  try {
    const { data, error } = await supabase.from('profiles').select('*').limit(1);
    if (error) {
      console.error('Error fetching profile:', error.message);
    } else if (data && data.length > 0) {
      console.log('Available columns in profiles:', Object.keys(data[0]));
    } else {
      console.log('Profiles table is empty. Trying to find any metadata...');
      // Try to insert a dummy row then delete it to see which columns are required? 
      // No, let's just try to select from information_schema if possible (usually not via REST)
      console.log('Seed.sql says: id, full_name, avatar_url, role, last_seen');
    }

    console.log('\n--- Table: projects ---');
    const { data: projData, error: projError } = await supabase.from('projects').select('*').limit(1);
    if (projError) {
       console.error('Error fetching project:', projError.message);
    } else if (projData && projData.length > 0) {
       console.log('Available columns in projects:', Object.keys(projData[0]));
    }
  } catch (e: any) {
    console.error('Failed:', e.message);
  }
}

checkSchema();
