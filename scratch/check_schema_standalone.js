import { createClient } from '@supabase/supabase-js';

// Get these from env
const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.log("Missing Supabase credentials in environment");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkSchema() {
  const { data, error } = await supabase
    .from('projects')
    .select('*')
    .limit(1);

  if (error) {
    console.error('Error fetching project:', error);
    return;
  }

  if (data && data.length > 0) {
    console.log('Project columns:', Object.keys(data[0]));
    console.log('Sample project:', JSON.stringify(data[0], null, 2));
  } else {
    console.log('No projects found to inspect schema.');
  }
}

checkSchema();
