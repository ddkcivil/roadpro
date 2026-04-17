#!/usr/bin/env ts-node
/**
 * Create Admin User for MyRoad
 * Usage: npx ts-node scratch/create_admin.ts
 * Requires SUPABASE_SERVICE_ROLE_KEY in .env
 */

import dotenv from 'dotenv';
dotenv.config();

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL!;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!supabaseUrl || !serviceKey) {
  console.error('❌ ERROR: Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env');
  process.exit(1);
}

const supabaseAdmin = createClient(supabaseUrl, serviceKey, {
  auth: { autoRefreshToken: false, persistSession: false }
});

async function createAdmin() {
  try {
    const ADMIN_EMAIL = 'admin@myroad.app';
    const ADMIN_PASSWORD = 'Admin123!ChangeMe';
    const ADMIN_NAME = 'System Administrator';

    // 1. Create auth user
    const { data: authUser, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email: ADMIN_EMAIL,
      password: ADMIN_PASSWORD,
      email_confirm: true,
      user_metadata: { role: 'Admin' }
    });

    if (authError || !authUser.user) {
      throw new Error(`Auth creation failed: ${authError?.message}`);
    }

    console.log('✅ Auth user created:', authUser.user.id);

    // 2. Create profile
    const { error: profileError } = await supabaseAdmin
      .from('profiles')
      .upsert({
        id: authUser.user.id,
        full_name: ADMIN_NAME,
        avatar_url: `https://ui-avatars.com/api/?name=${encodeURIComponent(ADMIN_NAME)}&background=6366f1`,
        role: 'Admin',
        last_seen: new Date().toISOString()
      });

    if (profileError) {
      throw new Error(`Profile creation failed: ${profileError.message}`);
    }

    console.log('✅ Admin profile created');
    console.log('\n🔑 LOGIN DETAILS:');
    console.log(`   Email: ${ADMIN_EMAIL}`);
    console.log(`   Password: ${ADMIN_PASSWORD}`);
    console.log(`\n📝 CHANGE PASSWORD after first login!`);
    console.log('\n🚀 Next: npm run dev → Login → UserManagement');

  } catch (error: any) {
    console.error('❌ Admin creation failed:', error.message);
    process.exit(1);
  }
}

createAdmin();
