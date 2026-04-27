import { createClient } from '@supabase/supabase-js';

const url = 'https://qgjjeqasioakqhkoorcj.supabase.co';
const serviceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFnamplcWFzaW9ha3Foa29vcmNqIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NTgwNjQ3NywiZXhwIjoyMDkxMzgyNDc3fQ.mml6y2bwalFBxuJBvbXA5bBLMf3N7mZImTLGHcUmHHI';

const supabase = createClient(url, serviceKey);

async function check() {
  // Try inserting a text ID
  const { data, error } = await supabase.from('projects').insert({
    id: 'proj-test-123',
    name: 'Test Project',
    client: 'Test Client'
  }).select();

  if (error) {
    console.log('Insert with text ID failed:', error.message);
    console.log('Code:', error.code);
  } else {
    console.log('Insert succeeded! projects.id accepts text.');
    await supabase.from('projects').delete().eq('id', 'proj-test-123');
  }

  // Try inserting a UUID
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
