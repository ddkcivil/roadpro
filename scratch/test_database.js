import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function fullDatabaseAudit() {
  console.log("═══════════════════════════════════════════════");
  console.log("  FULL DATABASE HEALTH CHECK");
  console.log("═══════════════════════════════════════════════\n");

  const tables = [
    'profiles',
    'projects', 
    'messages',
    'registrations',
    'roads',
    'audit_logs'
  ];

  let allHealthy = true;

  // 1. Table existence & row counts
  console.log("📋 TABLE STATUS:");
  console.log("─────────────────────────────────────────");
  for (const table of tables) {
    const { count, error } = await supabase.from(table).select('*', { count: 'exact', head: true });
    if (error) {
      console.log(`  ❌ ${table.padEnd(16)} -> ERROR: ${error.message}`);
      allHealthy = false;
    } else {
      console.log(`  ✅ ${table.padEnd(16)} -> OK (${count} rows)`);
    }
  }

  // 2. Profiles schema check
  console.log("\n📋 PROFILES SCHEMA CHECK:");
  console.log("─────────────────────────────────────────");
  const { data: profile, error: profileErr } = await supabase.from('profiles').select('*').limit(1).single();
  if (profileErr && profileErr.code !== 'PGRST116') {
    console.log(`  ❌ Cannot read profiles: ${profileErr.message}`);
  } else if (profile) {
    const expectedCols = ['id', 'full_name', 'avatar_url', 'role', 'last_seen', 'created_at'];
    for (const col of expectedCols) {
      const has = col in profile;
      console.log(`  ${has ? '✅' : '❌'} Column '${col}' ${has ? 'exists' : 'MISSING'}`);
      if (!has) allHealthy = false;
    }
  } else {
    console.log("  ⚠️  No profiles found (empty table)");
  }

  // 3. Projects schema check
  console.log("\n📋 PROJECTS SCHEMA CHECK:");
  console.log("─────────────────────────────────────────");
  const { data: project, error: projErr } = await supabase.from('projects').select('*').limit(1).single();
  if (projErr && projErr.code !== 'PGRST116') {
    console.log(`  ❌ Cannot read projects: ${projErr.message}`);
  } else if (project) {
    const expectedCols = ['id', 'name', 'status', 'owner_id', 'metadata', 'created_at'];
    for (const col of expectedCols) {
      const has = col in project;
      console.log(`  ${has ? '✅' : '❌'} Column '${col}' ${has ? 'exists' : 'MISSING'}`);
      if (!has) allHealthy = false;
    }
  } else {
    console.log("  ⚠️  No projects found (empty table)");
  }

  // 4. Messages schema check
  console.log("\n📋 MESSAGES SCHEMA CHECK:");
  console.log("─────────────────────────────────────────");
  const { data: msg, error: msgErr } = await supabase.from('messages').select('*').limit(1).single();
  if (msgErr && msgErr.code !== 'PGRST116') {
    console.log(`  ❌ Cannot read messages: ${msgErr.message}`);
  } else if (msg) {
    const expectedCols = ['id', 'content', 'senderId', 'receiverId', 'projectId', 'timestamp'];
    for (const col of expectedCols) {
      const has = col in msg;
      console.log(`  ${has ? '✅' : '❌'} Column '${col}' ${has ? 'exists' : 'MISSING'}`);
      if (!has) allHealthy = false;
    }
  } else {
    console.log("  ⚠️  No messages found (empty table)");
  }

  // 5. RLS check
  console.log("\n📋 RLS / PERMISSIONS CHECK:");
  console.log("─────────────────────────────────────────");
  for (const table of tables) {
    const { error: insertErr } = await supabase.from(table).insert({}).select().single();
    // We expect this to fail with a validation error, NOT a permission error
    if (insertErr) {
      const isPermission = insertErr.message.includes('row-level security') || insertErr.code === '42501';
      const isValidation = insertErr.message.includes('null value') || insertErr.message.includes('not-null') || insertErr.code === '23502' || insertErr.code === '23505';
      if (isPermission) {
        console.log(`  ⚠️  ${table.padEnd(16)} -> RLS active (blocks anonymous inserts - NORMAL with service key bypass)`);
      } else if (isValidation) {
        console.log(`  ✅ ${table.padEnd(16)} -> Writable (blocked by validation, not permissions)`);
      } else {
        console.log(`  ℹ️  ${table.padEnd(16)} -> ${insertErr.code}: ${insertErr.message.substring(0, 60)}`);
      }
    }
  }

  // Summary
  console.log("\n═══════════════════════════════════════════════");
  if (allHealthy) {
    console.log("  ✅ DATABASE IS FULLY HEALTHY");
  } else {
    console.log("  ⚠️  SOME ISSUES DETECTED - See above");
  }
  console.log("═══════════════════════════════════════════════\n");
}

fullDatabaseAudit();
