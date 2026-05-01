
import { createClient } from '@supabase/supabase-js';

const url = 'https://qgjjeqasioakqhkoorcj.supabase.co';
const serviceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFnamplcWFzaW9ha3Foa29vcmNqIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NTgwNjQ3NywiZXhwIjoyMDkxMzgyNDc3fQ.mml6y2bwalFBxuJBvbXA5bBLMf3N7mZImTLGHcUmHHI';

async function testMessagesTable() {
  console.log('--- Testing "messages" table with Vercel Service Role Key ---');
  const client = createClient(url, serviceKey);
  const { count, error } = await client.from('messages').select('*', { count: 'exact', head: true });
  
  if (error) {
    console.log('❌ Messages table error:', error.message);
  } else {
    console.log('✅ Messages table OK! Count:', count);
  }
}

testMessagesTable();
