import { createClient } from '@supabase/supabase-js';

const url = 'https://qgjjeqasioakqhkoorcj.supabase.co';
const anon = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFnamplcWFzaW9ha3Foa29vcmNqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzU4MDY0NzcsImV4cCI6MjA5MTM4MjQ3N30.89AJwDqV78KsEwwnJC2aqK0fHTpLOKD4jDbC3ATFOoQ';

const supabase = createClient(url, anon);

async function checkReg() {
  const cols = ['id', 'name', 'full_name', 'email', 'phone', 'password_hash', 'passwordHash', 'requested_role', 'requestedRole', 'status'];
  console.log('Probing registrations table columns...');
  
  for (const col of cols) {
    const { error } = await supabase.from('registrations').select(col).limit(1);
    if (error) {
      console.log(`❌ ${col}: ${error.message}`);
    } else {
      console.log(`✅ ${col} EXISTS!`);
    }
  }
}

checkReg();
