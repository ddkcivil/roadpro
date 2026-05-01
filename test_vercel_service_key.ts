
import { createClient } from '@supabase/supabase-js';

const url = 'https://qgjjeqasioakqhkoorcj.supabase.co';
const serviceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFnamplcWFzaW9ha3Foa29vcmNqIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NTgwNjQ3NywiZXhwIjoyMDkxMzgyNDc3fQ.mml6y2bwalFBxuJBvbXA5bBLMf3N7mZImTLGHcUmHHI';

async function testServiceKey() {
  console.log('--- Testing Vercel Service Role Key ---');
  const client = createClient(url, serviceKey);
  const { count, error, data } = await client.from('projects').select('*', { count: 'exact', head: false }).limit(1);
  
  if (error) {
    console.log('❌ Service key failed:', error.message);
    console.log('   Details:', error.details);
  } else {
    console.log('✅ Service key worked! Count:', count);
    if (data && data.length > 0) {
      console.log('   Sample row ID:', data[0].id);
    }
  }
}

testServiceKey();
