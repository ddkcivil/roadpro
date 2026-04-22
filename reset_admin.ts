
import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function resetAdminPassword() {
  console.log('Resetting password for admin@myroad.app...');
  
  const { data: { users }, error: listError } = await supabase.auth.admin.listUsers();
  if (listError) {
    console.error('Error listing users:', listError.message);
    return;
  }

  const adminUser = users.find(u => u.email === 'admin@myroad.app');
  if (!adminUser) {
    console.error('Admin user not found in Auth table.');
    return;
  }

  const { data, error } = await supabase.auth.admin.updateUserById(
    adminUser.id,
    { 
      password: 'admin123',
      email_confirm: true 
    }
  );

  if (error) {
    console.error('Error updating password:', error.message);
  } else {
    console.log('✅ Password successfully reset to: admin123');
    console.log('✅ Email marked as confirmed.');
  }
}

resetAdminPassword();
