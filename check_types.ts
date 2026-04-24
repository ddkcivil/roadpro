import { createClient } from '@supabase/supabase-js';

const url = 'https://qgjjeqasioakqhkoorcj.supabase.co';
const anon = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFnamplcWFzaW9ha3Foa29vcmNqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzU4MDY0NzcsImV4cCI6MjA5MTM4MjQ3N30.89AJwDqV78KsEwwnJC2aqK0fHTpLOKD4jDbC3ATFOoQ';

const supabase = createClient(url, anon);

async function checkTypes() {
  console.log('Checking projects.id type...');
  const { data, error } = await supabase.from('projects').select('id').limit(1);
  if (data && data.length > 0) {
    console.log('ID type:', typeof data[0].id);
    console.log('ID value:', data[0].id);
  } else {
    console.log('No projects found.');
  }
}

checkTypes();
