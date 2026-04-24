import { supabaseAdmin, isSupabaseConfigured } from './api/_utils/supabaseClient.ts';

async function check() {
  console.log('Project URL:', process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL);
  const { data, error } = await supabaseAdmin.from('profiles').select('id').limit(1);
  if (error) {
    console.log('Error:', error.message);
  } else {
    console.log('Successfully connected.');
    const { error: msgErr } = await supabaseAdmin.from('messages').select('receiver_id').limit(1);
    if (msgErr) {
       console.log('receiver_id check:', msgErr.message);
    } else {
       console.log('receiver_id EXISTS!');
    }
  }
}
check();
