
import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';

// Prioritize .env.local if present, or manually specify the key from your search
const supabaseUrl = "https://qgjjeqasioakqhkoorcj.supabase.co";
const serviceKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFnamplcWFzaW9ha3Foa29vcmNqIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NTgwNjQ3NywiZXhwIjoyMDkxMzgyNDc3fQ.mml6y2bwalFBxuJBvbXA5bBLMf3N7mZImTLGHcUmHHI";

console.log('Testing Service Role Key...');

const supabase = createClient(supabaseUrl, serviceKey);

async function check() {
  try {
    const { data, error } = await supabase.auth.admin.listUsers();
    if (error) {
      console.error('❌ Service Role Key is INVALID:', error.message);
    } else {
      console.log('✅ Service Role Key is VALID. Found', data.users.length, 'users.');
      data.users.forEach(u => console.log(` - ${u.email}`));
    }
  } catch (e: any) {
    console.error('❌ Error testing key:', e.message);
  }
}

check();
