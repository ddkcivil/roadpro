import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function testFetch() {
  const { data, error } = await supabase.from('projects').select('*').limit(2);
  if (error) {
    console.error("FETCH ERROR:", error);
  } else {
    console.log("FETCH SUCCESS. Found projects:", data.length);
  }
}

testFetch();
