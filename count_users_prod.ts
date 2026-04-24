import { createClient } from '@supabase/supabase-js';

const url = 'https://qgjjeqasioakqhkoorcj.supabase.co';
const anon = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFnamplcWFzaW9ha3Foa29vcmNqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzU4MDY0NzcsImV4cCI6MjA5MTM4MjQ3N30.89AJwDqV78KsEwwnJC2aqK0fHTpLOKD4jDbC3ATFOoQ';

const supabase = createClient(url, anon);

async function countUsers() {
  console.log('Counting users in qgjjeqasioakqhkoorcj...');
  const { count, error } = await supabase.from('profiles').select('*', { count: 'exact', head: true });
  if (error) {
    console.log('Error:', error.message);
  } else {
    console.log('User count:', count);
  }
}

countUsers();
