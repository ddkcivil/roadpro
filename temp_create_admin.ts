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
  // Create both admin emails
  const admins = [
    { email: 'dharmadkunwar20@gmail.com', password: 'ddK152207', name: 'Dharma Admin' },
    { email: 'admin@myroad.app', password: 'Admin123!ChangeMe', name: 'MyRoad Admin' }
  ];

  for (const admin of admins) {
    console.log('\n🚀 Processing: ' + admin.email + '...');
    let userId = null;

    try {
      // Check if user already exists
      const { data: listData, error: listError } = await supabaseAdmin.auth.admin.listUsers();
      if (listError) {
          throw new Error('Error listing users: ' + listError.message);
      }

      const users = listData?.users || [];
      const existingUser = users.find((user: any) => user.email === admin.email);

      if (existingUser && existingUser.id) {
        userId = existingUser.id;
        console.log('ℹ️ User ' + admin.email + ' already exists with ID: ' + userId);
      } else {
        // Create user
        const { data: newUser, error: newUserError } = await supabaseAdmin.auth.admin.createUser({
          email: admin.email,
          password: admin.password,
          email_confirm: true,
          user_metadata: { full_name: admin.name }
        });
        if (newUserError) {
          console.warn('⚠️ Could not create ' + admin.email + ': ' + newUserError.message);
          continue;
        }
        userId = newUser.user?.id;
        console.log('✅ Auth user created: ' + userId);
      }

      if (userId) {
        // Create profile
        const { error: profileError } = await supabaseAdmin
          .from('profiles')
          .upsert({
            id: userId,
            full_name: admin.name,
            avatar_url: `https://ui-avatars.com/api/?name=${encodeURIComponent(admin.name)}&background=6366f1`,
            role: 'Admin',
            last_seen: new Date().toISOString()
          });

        if (profileError) {
          console.error('Profile error:', profileError);
        } else {
          console.log('✅ Profile created for ' + admin.email);
        }
      }
    } catch (error: any) {
      console.error('❌ Error with ' + admin.email + ':', error.message);
    }
  }

  console.log('\n🎉 Admin setup complete!');
}

createOrUpdateAdmin();
