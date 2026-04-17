import { supabaseAdmin } from './api/_utils/supabaseClient.ts';

async function diagnoseAuth() {
  console.log('--- Auth Diagnostics ---');

  // 1. List users
  try {
    const { data: { users }, error } = await supabaseAdmin.auth.admin.listUsers();
    if (error) {
      console.error('Error listing users:', error.message);
    } else {
      console.log('Users found in Supabase Auth:', users.length);
      users.forEach(u => console.log(` - ${u.email} (ID: ${u.id})`));
    }
  } catch (e) {
    console.error('List users failed:', e);
  }

  // 2. Check profiles
  try {
    const { data: profiles, error: pError } = await supabaseAdmin
      .from('profiles')
      .select('id, email, role');
    
    if (pError) {
      console.error('Error fetching profiles:', pError.message);
    } else {
      console.log('\nProfiles found in database:', profiles.length);
      profiles.forEach(p => console.log(` - ${p.email} (Role: ${p.role})`));
    }
  } catch (e) {
    console.error('Fetch profiles failed:', e);
  }

  console.log('\n--- Diagnostics Complete ---');
}

diagnoseAuth();
