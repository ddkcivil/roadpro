import { createClient } from '@supabase/supabase-js';
const url = 'https://qgjjeqasioakqhkoorcj.supabase.co';
const serviceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFnamplcWFzaW9ha3Foa29vcmNqIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NTgwNjQ3NywiZXhwIjoyMDkxMzgyNDc3fQ.mml6y2bwalFBxuJBvbXA5bBLMf3N7mZImTLGHcUmHHI';
const supabase = createClient(url, serviceKey);

async function check() {
  // Try inserting a message with text project_id
  const { data, error } = await supabase.from('messages').insert({
    project_id: 'proj-test-123',
    sender_id: '00000000-0000-0000-0000-000000000000',
    receiver_id: '00000000-0000-0000-0000-000000000000',
    content: 'test',
    timestamp: new Date().toISOString(),
    read: false
  }).select();

  if (error) {
    console.log('Insert with text project_id failed:', error.message);
    console.log('Code:', error.code);
  } else {
    console.log('Insert succeeded! messages.project_id accepts text.');
    await supabase.from('messages').delete().eq('id', data[0].id);
  }
}

check();
