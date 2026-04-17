import { supabaseAdmin } from './api/_utils/supabaseClient.ts';

async function syncTestUser() {
  console.log('--- Syncing Test User to Profiles ---');

  const { data: { users }, error: uError } = await supabaseAdmin.auth.admin.listUsers();
  if (uError || !users) {
      console.error('List users failed');
      return;
  }

  const testUser = users.find(u => u.email === 'test@roadproj.com');
  if (!testUser) {
    console.error('Test user not found in Auth.');
    return;
  }

  console.log(`Found user: ${testUser.id}`);

  const { data, error } = await supabaseAdmin
    .from('profiles')
    .insert({
      id: testUser.id,
      name: 'Test Admin',
      email: testUser.email,
      role: 'Admin',
      avatar: 'https://ui-avatars.com/api/?name=Test+Admin&background=random'
    })
    .select();

  if (error) {
    console.error('Insert profile failed:', error.message);
  } else {
    console.log('Profile created successfully:', data);
  }

  console.log('\n--- Sync Complete ---');
}

syncTestUser();
