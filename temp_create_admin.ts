// Temporary script: temp_create_admin.ts
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

// Load environment variables from .env files
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
    // Check if user already exists by listing users and filtering
    const { data: users, error: listError } = await supabaseAdmin.auth.admin.listUsers();
    if (listError) {
        throw new Error('Error listing users: ' + listError.message);
    }

    const existingUser = users.find((user: any) => user.email === ADMIN_EMAIL); // Explicitly typed 'user' as any

    if (existingUser && existingUser.id) {
      userId = existingUser.id;
      console.log('ℹ️ User ' + ADMIN_EMAIL + ' already exists with ID: ' + userId + '. Updating profile.');
    } else {
      // Create user if not exists
      const { data: newUser, error: newUserError } = await supabaseAdmin.auth.admin.createUser({
        email: ADMIN_EMAIL,
        password: ADMIN_PASSWORD,
        email_confirm: true,
        user_metadata: { role: 'Admin' }
      });
      if (newUserError) {
        throw new Error('Auth user creation failed: ' + newUserError.message);
      }
      userId = newUser.user?.id;
      console.log('✅ Auth user created successfully. ID: ' + userId);
    }

    // Create or Update profile in 'profiles' table
    const { error: profileError } = await supabaseAdmin
      .from('profiles')
      .upsert({
        id: userId,
        full_name: ADMIN_NAME,
        avatar_url: `https://ui-avatars.com/api/?name=${encodeURIComponent(ADMIN_NAME)}&background=6366f1`,
        role: 'Admin',
        last_seen: new Date().toISOString()
      });

    if (profileError) {
      throw new Error('Profile upsert failed: ' + profileError.message);
    }

    console.log('✅ Admin profile linked and updated in public.profiles.');
    console.log('🔑 LOGIN DETAILS:');
    console.log('   Email: ' + ADMIN_EMAIL);
    console.log('   Password: ' + ADMIN_PASSWORD);
    console.log('📝 NOTE: Use these credentials to sign in.');

  } catch (error: any) {
    console.error('❌ Admin creation or update failed:', error.message);
    process.exit(1);
  }
}

createOrUpdateAdmin();
