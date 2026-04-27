import { createClient } from '@supabase/supabase-js';
const url = 'https://qgjjeqasioakqhkoorcj.supabase.co';
const serviceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFnamplcWFzaW9ha3Foa29vcmNqIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NTgwNjQ3NywiZXhwIjoyMDkxMzgyNDc3fQ.mml6y2bwalFBxuJBvbXA5bBLMf3N7mZImTLGHcUmHHI';
const supabase = createClient(url, serviceKey);

async function check() {
  const { data, error } = await supabase.rpc('get_policies', { table_name: 'projects' });
  if (error) {
    console.log('RPC error:', error.message);
    // Try direct query
    const { data: d2, error: e2 } = await supabase.from('pg_policies').select('*').eq('tablename', 'projects');
    if (e2) {
      console.log('Direct query error:', e2.message);
    } else {
      console.log('Policies:', d2);
    }
  } else {
    console.log('Policies via RPC:', data);
  }
}

check();
