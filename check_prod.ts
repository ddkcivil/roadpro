import { createClient } from '@supabase/supabase-js';

const url = 'https://qgjjeqasioakqhkoorcj.supabase.co';
const anon = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFnamplcWFzaW9ha3Foa29vcmNqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzU4MDY0NzcsImV4cCI6MjA5MTM4MjQ3N30.89AJwDqV78KsEwwnJC2aqK0fHTpLOKD4jDbC3ATFOoQ';

const supabase = createClient(url, anon);

async function checkProduction() {
  console.log('Checking production Supabase (qgjjeqasioakqhkoorcj)...');
  const { data, error } = await supabase.from('profiles').select('id').limit(1);
  if (error) {
    console.log('Production query failed:', error.message);
  } else {
    console.log('Production query succeeded!');
    
    // Check messages table columns by trying to select receiver_id
    const { error: msgError } = await supabase.from('messages').select('receiver_id').limit(1);
    if (msgError) {
      console.log('Messages table check failed:', msgError.message);
    } else {
      console.log('Messages table has receiver_id!');
    }
  }
}

checkProduction();
