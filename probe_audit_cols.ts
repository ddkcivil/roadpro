import { createClient } from '@supabase/supabase-js';
const url = 'https://qgjjeqasioakqhkoorcj.supabase.co';
const anon = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFnamplcWFzaW9ha3Foa29vcmNqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzU4MDY0NzcsImV4cCI6MjA5MTM4MjQ3N30.89AJwDqV78KsEwwnJC2aqK0fHTpLOKD4jDbC3ATFOoQ';
const supabase = createClient(url, anon);

async function check() {
  const cols = ['user_id', 'user_name', 'action', 'entity_type', 'entity_id', 'entity_name', 'severity', 'metadata', 'timestamp', 'ip_address', 'user_agent'];
  console.log('--- audit_logs columns ---');
  for (const col of cols) {
    const { error } = await supabase.from('audit_logs').select(col).limit(1);
    console.log(error ? `❌ ${col}: ${error.message}` : `✅ ${col}`);
  }
}

check();
