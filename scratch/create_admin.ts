import dotenv from 'dotenv';
import fs from 'fs'; // Keep fs for potential future use, though not strictly needed for dotenv.config()
import path from 'path';
import { fileURLToPath } from 'url';
import { createClient } from '@supabase/supabase-js';

// Load environment variables from .env files
dotenv.config({ path: path.resolve(process.cwd(), '.env') });
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });
dotenv.config({ path: path.resolve(process.cwd(), '.env.vercel') });


const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);


const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceKey) {
  console.error('❌ ERROR: Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in environment or .env files');
  process.exit(1);
}

const supabaseAdmin = createClient(supabaseUrl, serviceKey, {
  auth: { autoRefreshToken: false, persistSession: false }
});

async function createAdmin() {
  try {
    const ADMIN_EMAIL = 'dharmadkunwar20@gmail.com';
    const ADMIN_PASSWORD = 'ddK152207';
    const ADMIN_NAME = 'Admin User'; // Changed from 'System Administrator'

    console.log(`
🚀 Creating Admin User: ${ADMIN_EMAIL}...`);

    // 1. Create auth user
    const { data: authUser, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email: ADMIN_EMAIL,
      password: ADMIN_PASSWORD,
      email_confirm: true,
      user_metadata: { role: 'Admin' }
    });

    if (authError) {
      if (authError.message.includes('already exists')) {
        console.log('ℹ️ Auth user already exists in Supabase Auth.');
      } else {
        throw new Error(`Auth creation failed: ${authError.message}`);
      }
    } else {
      console.log('✅ Auth user created successfully. ID:', authUser.user?.id);
    }

    // 2. Resolve ID (either from newly created user or existing one)
    let userId;
    if (authUser.user) {
        userId = authUser.user.id;
    } else {
        const { data: { users }, error: listError } = await supabaseAdmin.auth.admin.listUsers();
        if (listError) throw listError;
        const existingUser = users.find(u => u.email === ADMIN_EMAIL);
        if (!existingUser) throw new Error('Could not find existing user after "already exists" error');
        userId = existingUser.id;
    }

    // 3. Create or Update profile
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
      throw new Error(`Profile creation failed: ${profileError.message}`);
    }

    console.log('✅ Admin profile linked and updated in public.profiles');
    console.log(`
 🔑 LOGIN DETAILS:`);
    console.log(`   Email: ${ADMIN_EMAIL}`);
    console.log('   Password: ' + ADMIN_PASSWORD); // Changed from template literal
    console.log(`
📝 NOTE: Use these credentials to sign in.`);

  } catch (error: any) {
    console.error('❌ Admin creation failed:', error.message);
    process.exit(1);
  }
}

createAdmin();
