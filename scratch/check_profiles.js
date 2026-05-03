import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
  const { data, error } = await supabase.from('profiles').select('*');
  if (error) {
    console.error("ERROR:", error.message);
    return;
  }

  console.log(`\n📋 PROFILES TABLE (${data.length} rows):\n`);
  
  data.forEach((p, i) => {
    console.log(`── User ${i + 1} ──────────────────────────────`);
    console.log(`  ID:         ${p.id}`);
    console.log(`  Name:       ${p.full_name || '(empty)'}`);
    console.log(`  Email:      ${p.email || '(not stored in profiles)'}`);
    console.log(`  Role:       ${p.role}`);
    console.log(`  Avatar:     ${p.avatar_url ? p.avatar_url.substring(0, 50) + '...' : '(none)'}`);
    console.log(`  Last Seen:  ${p.last_seen || '(never)'}`);
    console.log(`  Created:    ${p.created_at}`);
    console.log(`  Updated:    ${p.updated_at || '(never)'}`);
    console.log('');
  });
}

run();
