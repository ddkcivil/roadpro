import { createClient } from '@supabase/supabase-js';

const url = 'https://qgjjeqasioakqhkoorcj.supabase.co';
const anon = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFnamplcWFzaW9ha3Foa29vcmNqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzU4MDY0NzcsImV4cCI6MjA5MTM4MjQ3N30.89AJwDqV78KsEwwnJC2aqK0fHTpLOKD4jDbC3ATFOoQ';

const supabase = createClient(url, anon);

async function check() {
  // Try inserting a text ID (this will fail if id is uuid and no cast exists)
  const { data, error } = await supabase.from('projects').insert({
    id: 'proj-test-123',
    name: 'Test Project',
    client: 'Test Client'
  }).select();

  if (error) {
    console.log('Insert with text ID failed:', error.message);
    console.log('This suggests projects.id is UUID, which conflicts with app-generated string IDs.');
  } else {
    console.log('Insert succeeded! projects.id is likely TEXT or has implicit cast.');
    console.log('Row:', data);
    // Clean up
    await supabase.from('projects').delete().eq('id', 'proj-test-123');
  }

  // Also check if we can insert a UUID-style ID
  const { data: data2, error: err2 } = await supabase.from('projects').insert({
    id: '550e8400-e29b-41d4-a716-446655440000',
    name: 'Test Project UUID',
    client: 'Test Client'
  }).select();

  if (err2) {
    console.log('Insert with UUID failed:', err2.message);
  } else {
    console.log('UUID insert succeeded.');
    await supabase.from('projects').delete().eq('id', '550e8400-e29b-41d4-a716-446655440000');
  }
}

check();
