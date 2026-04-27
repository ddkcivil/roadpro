import { createClient } from '@supabase/supabase-js';
const url = 'https://qgjjeqasioakqhkoorcj.supabase.co';
const anon = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFnamplcWFzaW9ha3Foa29vcmNqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzU4MDY0NzcsImV4cCI6MjA5MTM4MjQ3N30.89AJwDqV78KsEwwnJC2aqK0fHTpLOKD4jDbC3ATFOoQ';
const supabase = createClient(url, anon);

async function check() {
  const { data, error } = await supabase.from('projects').select('*').limit(1);
  if (error) {
    console.log('SELECT error:', error.message, error.code);
  } else {
    console.log('SELECT succeeded:', data);
  }
}
check();
