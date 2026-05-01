
import { createClient } from '@supabase/supabase-js';

const url = 'https://qgjjeqasioakqhkoorcj.supabase.co';
const shortKey = 'sb_publishable_HiGd44OabyzePTFeQ6R-rw_8ckIi3mr';
const longKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFnamplcWFzaW9ha3Foa29vcmNqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzU4MDY0NzcsImV4cCI6MjA5MTM4MjQ3N30.89AJwDqV78KsEwwnJC2aqK0fHTpLOKD4jDbC3ATFOoQ';

async function testKeys() {
  console.log('--- Testing Short Key (Vercel) ---');
  const client1 = createClient(url, shortKey);
  const { count: c1, error: e1 } = await client1.from('projects').select('*', { count: 'exact', head: true });
  if (e1) console.log('❌ Short key failed:', e1.message);
  else console.log('✅ Short key worked! Count:', c1);

  console.log('\n--- Testing Long Key (Local .env) ---');
  const client2 = createClient(url, longKey);
  const { count: c2, error: e2 } = await client2.from('projects').select('*', { count: 'exact', head: true });
  if (e2) console.log('❌ Long key failed:', e2.message);
  else console.log('✅ Long key worked! Count:', c2);
}

testKeys();
