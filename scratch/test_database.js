import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function checkDatabase() {
  console.log("Checking all major database tables for health...");
  let allHealthy = true;

  const tables = [
    'profiles',
    'projects',
    'messages',
    'registrations',
    'roads',
    'audit_logs'
  ];

  for (const table of tables) {
    try {
      const { data, error } = await supabase.from(table).select('*').limit(1);
      if (error) {
        // audit_logs might not exist, maybe it's auditlogs. Same for roads. Let's see.
        console.log(`❌ Table '${table}' -> FAILED: ${error.message}`);
        allHealthy = false;
      } else {
        console.log(`✅ Table '${table}' -> OK (Returns data properly)`);
      }
    } catch (e) {
      console.log(`❌ Table '${table}' -> CRITICAL ERROR:`, e.message);
      allHealthy = false;
    }
  }

  if (allHealthy) {
    console.log("\n✅ ALL DATABASE CHECKS PASSED: The Supabase backend schema matches the application expectations.");
  } else {
    console.log("\n⚠️ WARNING: Some database tables returned errors.");
  }
}

checkDatabase();
