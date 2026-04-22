import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';

const s = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
s.auth.admin.listUsers().then(({data}) => {
  const admin = data.users.find(u => u.email === 'admin@myroad.app');
  console.log(JSON.stringify(admin, null, 2));
});
