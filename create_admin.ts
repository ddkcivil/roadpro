import { config } from 'dotenv';
config({ override: true });
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  console.log('Add to .env:');
  console.log('SUPABASE_URL=http://127.0.0.1:54321');
  console.log('SUPABASE_SERVICE_ROLE_KEY=your-service-role-key');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function createAdmin() {
  console.log('🚀 Creating admin user: admin@myroad.app...');
  
  try {
    // 1. Create auth.users entry
    const { data: userData, error: authError } = await supabase.auth.admin.createUser({
      email: 'admin@myroad.app',
      password: 'admin123',
      email_confirm: true,
      user_metadata: { 
        role: 'admin', 
        full_name: 'Admin User' 
      }
    });

    if (authError) {
      console.error('❌ Auth error:', authError.message);
      return;
    }

    if (!userData.user) {
      console.error('❌ No user data returned');
      return;
    }

    console.log('✅ Admin user created:', userData.user.id);
    console.log('✅ Password: admin123');
    console.log('✅ Email confirmed: true');

    // 2. Create/link profiles entry
    const { error: profileError } = await supabase
      .from('profiles')
      .upsert({
        id: userData.user.id,
        full_name: 'Admin User',
        role: 'admin',
        avatar_url: 'https://ui-avatars.com/api/?name=Admin&background=6366f1',
        last_seen: new Date().toISOString()
      });

    if (profileError) {
      console.error('⚠️  Profile error (non-critical):', profileError.message);
    } else {
      console.log('✅ Profile created/linked');
    }

    console.log('\n🎉 SUCCESS! Run: npx tsx reset_admin.ts');
    console.log('Then test: Click "Admin Demo" in app');
    
  } catch (error: any) {
    console.error('💥 Unexpected error:', error.message);
  }
}

createAdmin();
