import { createClient } from '@supabase/supabase-js';

const serviceRoleKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFnamplcWFzaW9ha3Foa29vcmNqIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NTgwNjQ3NywiZXhwIjoyMDkxMzgyNDc3fQ.mml6y2bwalFBxuJBvbXA5bBLMf3N7mZImTLGHcUmHHI';
const supabaseUrl = 'https://qgjjeqasioakqhkoorcj.supabase.co';
const supabase = createClient(supabaseUrl, serviceRoleKey);

async function checkProjectsMigration() {
  console.log('=== Checking projects table migration ===');
  
  // 1. Check table exists
  const { data: tableCheck, error: tableError } = await supabase
    .from('projects')
    .select('id', { count: 'exact', head: true });
  if (tableError) {
    console.log('❌ Table public.projects does not exist or inaccessible');
    return;
  }
  console.log('✅ Table public.projects exists');

  // 2. Check columns (exact match to migration)
  const expectedColumns = ['id', 'name', 'client', 'ownerid', 'contractno', 'createdat', 'updatedat'];
  console.log('\nChecking columns:');
  let allColumnsMatch = true;
  for (const col of expectedColumns) {
    const { error } = await supabase.from('projects').select(col).limit(1);
    if (error) {
      console.log(`❌ ${col}: ${error.message}`);
      allColumnsMatch = false;
    } else {
      console.log(`✅ ${col} exists`);
    }
  }

  // 3. Check indexes
  const { data: indexes } = await supabase.rpc('get_indexes', { table_name: 'projects' });
  const expectedIndexes = ['idx_projects_ownerid', 'idx_projects_createdat', 'idx_projects_name'];
  console.log('\nChecking indexes:');
  const indexNames = indexes?.map((i: any) => i.indexname) || [];
  for (const idx of expectedIndexes) {
    if (indexNames.includes(idx)) {
      console.log(`✅ ${idx}`);
    } else {
      console.log(`❌ Missing ${idx}`);
    }
  }

  // 4. Check RLS enabled
  const { data: rlsCheck } = await supabase.from('pg_tables').select('rowsecurity').eq('tablename', 'projects').single();
  console.log('\nRLS:', rlsCheck?.rowsecurity === true ? '✅ ENABLED' : '❌ DISABLED');

  // 5. Check policies count (should be 4)
  const { count: policyCount } = await supabase.from('pg_policies').select('*', { count: 'exact', head: true }).eq('tablename', 'projects');
  console.log('Policies count:', policyCount === 4 ? `✅ 4 policies` : `❌ Expected 4, got ${policyCount}`);

  // 6. Check seed data
  const { data: generalProject } = await supabase.from('projects').select('name').eq('id', 'general').single();
  console.log('General project seed:', generalProject ? '✅ Exists' : '❌ Missing');

  console.log('\n=== SUMMARY ===');
  console.log(allColumnsMatch ? '✅ Columns match migration' : '❌ Some columns missing');
}

checkProjectsMigration().catch(console.error);
