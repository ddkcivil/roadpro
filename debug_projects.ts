
import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl!, supabaseAnonKey!);

async function checkProjects() {
  console.log('Fetching projects to check columns...');
  const { data, error } = await supabase.from('projects').select('*').limit(1);
  if (error) {
    console.error('Error:', error.message);
  } else if (data && data.length > 0) {
    console.log('Columns in projects:', Object.keys(data[0]));
  } else {
    console.log('No projects found to inspect.');
  }
}

checkProjects();
