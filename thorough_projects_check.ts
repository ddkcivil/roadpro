import { createClient } from '@supabase/supabase-js';

const serviceRoleKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFnamplcWFzaW9ha3Foa29vcmNqIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NTgwNjQ3NywiZXhwIjoyMDkxMzgyNDc3fQ.mml6y2bwalFBxuJBvbXA5bBLMf3N7mZImTLGHcUmHHI';
const supabaseUrl = 'https://qgjjeqasioakqhkoorcj.supabase.co';
const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false }
});

async function thoroughCheck() {
  console.log('=== THOROUGH Projects Migration Check ===');

  // 1. Table & row count
  const { count } = await supabase.from('projects').select('*', { count: 'exact', head: true });
  console.log(`✅ Table exists, rows: ${count || 0}`);

  // 2. Profiles dependency
  const { count: profilesCount } = await supabase.from('profiles').select('*', { count: 'exact', head: true });
  console.log(`Profiles table: ${profilesCount !== null ? '✅ exists' : '❌ missing'}`);

  // 3. Column details via information_schema
  const { data: columns } = await supabase.rpc('get_columns', { table_name: 'projects' });
  const expected = {
    id: { type: 'text', is_nullable: 'NO', column_default: null },
    name: { type: 'text', is_nullable: 'NO' },
    client: { type: 'text', is_nullable: 'NO' },
    ownerid: { type: 'uuid', is_nullable: 'YES' },
    contractno: { type: 'text', is_nullable: 'YES' },
    createdat: { type: 'timestamptz', column_default: 'now()' },
    updatedat: { type: 'timestamptz', column_default: 'now()' }
  };
  console.log('\nColumns:');
  let colsOK = true;
  columns?.forEach((col: any) => {
    if (!col?.column_name) {
      console.log('❌ Invalid column (missing name)');
      colsOK = false;
      return;
    }
    const exp = expected[col.column_name as keyof typeof expected];
    const actualNullable = (col as any)['is_nullable'] ?? 'YES';
    const actualDefault = (col as any)['column_default'] ?? null;
    const match = exp && 
      col.data_type === exp.type && 
      actualNullable === exp.is_nullable &&
      (exp.column_default === undefined || actualDefault === exp.column_default);
    const status = match ? '✅' : '❌';
    console.log(`${status} ${col.column_name}: ${col.data_type} (${actualNullable})${exp?.column_default !== undefined ? ` [default: ${actualDefault ?? 'none'}]` : ''}`);
    if (!match && exp) {
      console.log(`   Expected: ${exp.type} (${exp.is_nullable})${exp.column_default !== undefined ? ` [default: ${exp.column_default}]` : ''}`);
      colsOK = false;
    }
  });
  console.log(`\nColumn check: ${colsOK ? '✅ All columns match expected schema' : '❌ Some columns do not match'}`);
}

thoroughCheck().catch(console.error);
