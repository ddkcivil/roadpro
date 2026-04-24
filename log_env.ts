import { supabaseAdmin, isSupabaseConfigured } from './api/_utils/supabaseClient.ts';

async function logEnv() {
  console.log('Is Configured:', isSupabaseConfigured());
  console.log('SUPABASE_URL:', process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL);
  
  // Try a simple select to see what columns we get back
  const { data, error } = await supabaseAdmin.from('messages').select('*').limit(1);
  if (error) {
    console.log('Error:', error.message);
  } else if (data && data.length > 0) {
    console.log('Columns found:', Object.keys(data[0]));
  } else {
    console.log('No data, but query succeeded.');
    // Try to select columns specifically
    const testCols = ['receiver_id', 'receiverId', 'sender_id', 'senderId'];
    for (const col of testCols) {
      const { error: colErr } = await supabaseAdmin.from('messages').select(col).limit(1);
      console.log(`${col}: ${colErr ? '❌' : '✅'}`);
    }
  }
}

logEnv();
