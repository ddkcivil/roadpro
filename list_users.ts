
import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Missing env vars');
  process.exit(1);
}

// Use service role key to list users if available
const supabase = createClient(supabaseUrl, supabaseServiceKey || supabaseAnonKey);

async function listUsers() {
  console.log('--- Auth Users ---');
  try {
    const { data: { users }, error } = await supabase.auth.admin.listUsers();
    if (error) {
      console.error('Error listing users:', error.message);
      console.log('Trying to fetch from profiles table instead...');
      const { data: profiles, error: pError } = await supabase.from('profiles').select('email, role');
      if (pError) {
        console.error('Error fetching profiles:', pError.message);
      } else {
        profiles.forEach(p => console.log(`Profile: ${p.email} (Role: ${p.role})`));
      }
    } else {
      users.forEach(u => console.log(`User: ${u.email} (ID: ${u.id})`));
    }
    
    console.log('\n--- Profiles ---');
    const { data: profiles, error: pError } = await supabase.from('profiles').select('*');
    if (pError) {
      console.error('Error fetching profiles:', pError.message);
    } else {
      console.log(JSON.stringify(profiles, null, 2));
    }
  } catch (e: any) {
    console.error('Failed to list users:', e.message);
  }
}

listUsers();
