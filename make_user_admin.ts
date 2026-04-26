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

const TARGET_USER_ID = 'b394b6c9-3718-438f-8dba-01416e3b0ec1';

async function makeUserAdmin() {
  console.log(`🚀 Making user ${TARGET_USER_ID} an admin...`);

  try {
    // 1. Check if user exists in auth.users
    const { data: { users }, error: listError } = await supabase.auth.admin.listUsers();
    if (listError) {
      console.error('❌ Auth list error:', listError.message);
      return;
    }
    
    console.log('TARGET_USER_ID:', TARGET_USER_ID);
    console.log('Fetched user IDs:', users?.map(u => u.id));

    const targetUser = users?.find(u => u.id === TARGET_USER_ID);
    if (!targetUser) {
      console.error(`❌ User ${TARGET_USER_ID} not found in auth.users`);
      return;
    }

    console.log('✅ Target user found:', targetUser.email || 'no email');

    // 2. Update auth.users user_metadata.role = 'admin'
    // Corrected syntax for user_metadata object
    const updatedMetadata = {
      ...(targetUser.user_metadata || {}), 
      role: 'admin' 
    };

    const { error: authUpdateError } = await supabase.auth.admin.updateUserById(
      TARGET_USER_ID,
      { user_metadata: updatedMetadata }
    );

    if (authUpdateError) {
      console.error('❌ Auth update error:', authUpdateError.message);
      return;
    }

    console.log('✅ Auth user_metadata.role set to admin');

    // 3. Update/link profiles entry
    const { error: profileError } = await supabase
      .from('profiles')
      .upsert({
        id: TARGET_USER_ID,
        role: 'admin',
        last_seen: new Date().toISOString()
      }, { onConflict: 'id' });

    if (profileError) {
      console.error('⚠️ Profile error (non-critical):', profileError.message);
    } else {
      console.log('✅ Profile role set to admin');
    }

    console.log(`
🎉 SUCCESS! User ${TARGET_USER_ID} is now Admin.`);
    console.log('Test in app: Check User Management or login as this user.');
    
  } catch (error: any) {
    console.error('💥 Unexpected error:', error.message);
  }
}

makeUserAdmin();