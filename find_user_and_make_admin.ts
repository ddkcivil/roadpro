import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  console.log('Ensure .env.test or another .env file is loaded with these values.');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

const TARGET_PROFILE_ID = 'b394b6c9-3718-438f-8dba-01416e3b0ec1';

async function findUserAndMakeAdmin() {
  console.log(`🔍 Searching for profile ${TARGET_PROFILE_ID}...`);

  // 1. Find profile by ID
  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', TARGET_PROFILE_ID)
    .single();

  if (profileError || !profile) {
    console.error('❌ Profile not found:', profileError?.message);
    return;
  }
  // ... rest of the original function ...
  console.log('✅ Profile found:', profile.full_name || profile.email, profile.role || 'no role');

  // 2. Try to find matching auth user (by ID first)
  const { data: { users }, error: listError } = await supabase.auth.admin.listUsers();
  if (listError) {
    console.error('❌ Auth list error:', listError.message);
    return;
  }

  const targetAuthUser = users?.find(u => u.id === TARGET_PROFILE_ID);
  if (!targetAuthUser) {
    console.error(`❌ No matching auth.user for ID ${TARGET_PROFILE_ID}`);
    console.log('Available auth users (first 5):', users?.slice(0,5).map(u => ({id: u.id, email: u.email})));
    return;
  }

  console.log('✅ Auth user found:', targetAuthUser.email);

  // 3. Update auth.user_metadata
  const { error: authUpdateError } = await supabase.auth.admin.updateUserById(
    TARGET_PROFILE_ID,
    { 
      user_metadata: { 
        ...targetAuthUser.user_metadata,
        role: 'admin' 
      } 
    }
  );

  if (authUpdateError) {
    console.error('❌ Auth update error:', authUpdateError.message);
    return;
  }

  console.log('✅ Auth metadata updated');

  // 4. Update profile
  const { error: profileUpdateError } = await supabase
    .from('profiles')
    .update({
      role: 'admin',
      last_seen: new Date().toISOString()
    })
    .eq('id', TARGET_PROFILE_ID);

  if (profileUpdateError) {
    console.error('⚠️ Profile update error:', profileUpdateError.message);
  } else {
    console.log('✅ Profile updated');
  }

  console.log(`\n🎉 SUCCESS! User ${TARGET_PROFILE_ID} is now Admin.`);
}

findUserAndMakeAdmin();
