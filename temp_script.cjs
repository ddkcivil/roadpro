const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.resolve(process.cwd(), '.env') });
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });
dotenv.config({ path: path.resolve(process.cwd(), '.env.vercel') });

const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceKey) {
  console.error('❌ ERROR: Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in environment or .env files');
  process.exit(1);
}

const supabaseAdmin = createClient(supabaseUrl, serviceKey, {
  auth: { autoRefreshToken: false, persistSession: false }
});

async function createOrUpdateAdmin() {
  const ADMIN_EMAIL = 'dharmadkunwar20@gmail.com';
  const ADMIN_PASSWORD = 'ddK152207';
  const ADMIN_NAME = 'Admin User';

  console.log('🚀 Attempting to create or update Admin User: ' + ADMIN_EMAIL + '...');

  let userId = null;

  try {
    // --- Step 1: Check if user already exists ---
    const { data, error: listError } = await supabaseAdmin.auth.admin.listUsers();
    if (listError) {
        throw new Error('Error listing users: ' + listError.message);
    }

    const users = data?.users || [];
    const existingUser = users.find((user) => user && user.email === ADMIN_EMAIL);

    if (existingUser && existingUser.id) {
      userId = existingUser.id;
      console.log('ℹ️ User ' + ADMIN_EMAIL + ' already exists with ID: ' + userId + '.');
    } else {
      // --- Step 2: Create user if not exists ---
      console.log('Attempting to create Auth user...');
      const { data: newUser, error: newUserError } = await supabaseAdmin.auth.admin.createUser({
        email: ADMIN_EMAIL,
        password: ADMIN_PASSWORD,
        email_confirm: true,
        user_metadata: { role: 'Admin' } // Pass role in metadata
      });
      if (newUserError) {
        console.error('Supabase createUser error:', JSON.stringify(newUserError, null, 2)); // Log detailed error
        throw new Error('Auth user creation failed: ' + newUserError.message);
      }
      userId = newUser.user?.id;
      console.log('✅ Auth user created successfully. ID: ' + userId);
    }

    // --- Step 3: Create or Update profile in 'profiles' table ---
    console.log('Attempting to upsert profile for user ID: ' + userId);
    const { error: profileError } = await supabaseAdmin
      .from('profiles')
      .upsert({
        id: userId, // Use the obtained userId
        full_name: ADMIN_NAME,
        // avatar_url: `https://ui-avatars.com/api/?name=${encodeURIComponent(ADMIN_NAME)}&background=6366f1`, // Temporarily commented out for debugging
        role: 'Admin', // Pass role to profiles table
        last_seen: new Date().toISOString()
      });

    if (profileError) {
      console.error('Supabase upsert error:', JSON.stringify(profileError, null, 2)); // Log detailed error
      throw new Error('Profile upsert failed: ' + profileError.message);
    }

    console.log('✅ Admin profile linked and updated in public.profiles.');
    console.log('🔑 LOGIN DETAILS:');
    console.log('   Email: ' + ADMIN_EMAIL);
    console.log('   Password: ' + ADMIN_PASSWORD);
    console.log('📝 NOTE: Use these credentials to sign in.');

  } catch (error) {
    console.error('❌ Admin creation or update failed:', error.message);
    process.exit(1);
  }
}

createOrUpdateAdmin();
