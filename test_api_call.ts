import { supabasePublic } from './api/utils/supabaseClient.ts';

async function testApiCall() {
  console.log('--- Testing API Call with Auth ---');

  // 1. Login to get token
  console.log('Logging in...');
  const { data: authData, error: authError } = await supabasePublic.auth.signInWithPassword({
    email: 'admin@myroad.app',
    password: 'admin123'
  });

  if (authError || !authData.session) {
    console.error('Login failed:', authError?.message);
    return;
  }

  const token = authData.session.access_token;
  console.log('Login successful. Token obtained.');

  // 2. Call /api/messages directly using fetch or supabase client
  // Since we want to test the serverless function, let's use the local URL if possible, 
  // but we are testing RLS and Supabase directly here too.
  
  try {
    console.log('Fetching messages with user token...');
    const { data, error } = await supabasePublic
      .from('messages')
      .select('*')
      .eq('project_id', 'general'); // Adjust if needed
    
    if (error) {
      console.error('Fetch messages error:', error.message);
      console.log('Full error:', error);
    } else {
      console.log('Fetch messages success! Found:', data.length);
    }
  } catch (e) {
    console.error('Fetch messages critical failure:', e);
  }

  console.log('\n--- Test Complete ---');
}

testApiCall();

