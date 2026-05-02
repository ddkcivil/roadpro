import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
  console.log("Checking if we can add phone column via SQL or just using metadata...");
  // We don't have direct SQL exec via REST API, so we can't alter table easily from the client.
  // Instead, let's test if there's a phone column by doing a select.
  const { data, error } = await supabase.from('profiles').select('phone').limit(1);
  if (error) {
    console.log("Phone column doesn't exist. Error:", error.message);
  } else {
    console.log("Phone column exists!");
  }
}

run();
