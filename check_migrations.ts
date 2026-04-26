import { createClient } from '@supabase/supabase-js';

const serviceRoleKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFnamplcWFzaW9ha3Foa29vcmNqIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NTgwNjQ3NywiZXhwIjoyMDkxMzgyNDc3fQ.mml6y2bwalFBxuJBvbXA5bBLMf3N7mZImTLGHcUmHHI';
const supabaseUrl = 'https://qgjjeqasioakqhkoorcj.supabase.co';
const supabase = createClient(supabaseUrl, serviceRoleKey);
async function checkMigrations() {
  console.log('=== Checking Supabase Migrations ===');
  console.log('Remote DB:', supabaseUrl);
  
  // List local migrations
  const localMigrations = [
    '20241202_create_profiles_table.sql',
    '20241203_admin_rls_profiles.sql',
    '20260415040423_remote_schema.sql',
    '20260415041116_new-migration.sql',
    '20260415100000_create_road_schema.sql',
    '20260415100500_create_other_tables.sql',
    '20260415100600_fix_missing_schema.sql',
    '20260415100700_fix_projects_schema.sql',
    '20260415101000_update_profiles_for_auth.sql',
    '20260422100000_add_missing_columns.sql'
  ];
  const localVersions = localMigrations.map(name => name.split('_')[0]).sort();
  console.log('\\nLocal migrations (versions):', localVersions);
  
  // Query remote applied migrations
  const { data: remoteMigrations, error } = await supabase
    .from('schema_migrations')
    .select('version, name')
    .order('version', { ascending: true });
  
  if (error) {
    console.error('ERROR querying supabase_migrations:', error.message);
    console.log('Note: Table might not exist or RLS blocking anon access. Try service_role key.');
    return;
  }
  
  const remoteVersions = remoteMigrations?.map((m: any) => m.version) || [];
  console.log('\\nRemote applied migrations (', remoteVersions.length, '):', remoteVersions);
  
  // Compare
  const allLocalVersions = new Set(localVersions);
  const missingRemote = localVersions.filter(v => !remoteVersions.includes(v));
  const extraRemote = remoteVersions.filter(v => !allLocalVersions.has(v));
  
  console.log('\\n=== STATUS ===');
  if (missingRemote.length === 0 && extraRemote.length === 0) {
    console.log('✅ ALL local migrations are applied in remote DB (exact match)');
  } else {
    if (missingRemote.length > 0) {
      console.log('❌ Missing in remote:', missingRemote);
    }
    if (extraRemote.length > 0) {
      console.log('ℹ️ Extra in remote:', extraRemote);
    }
  }
  
  // Also check if tables exist (basic sanity)
  const { data: profilesCheck } = await supabase.from('profiles').select('count', { count: 'exact', head: true });
  console.log('\\nSanity: profiles table exists:', !!profilesCheck?.[0]?.count);
}

checkMigrations().catch(console.error);
