import { supabasePublic } from './api/_utils/supabaseClient.ts';

async function testRealAuth() {
  console.log('--- Testing Real Auth Login ---');
  
  try {
    const { data, error } = await supabasePublic.auth.signInWithPassword({
      email: 'test@roadproj.com',
      password: 'Roadproj123!' // Using the password from TODO_AUTH_FIX.md
    });

    if (error) {
      console.error('Login failed:', error.message);
      console.log('Error details:', error);
    } else {
      console.log('Login success! User ID:', data.user?.id);
    }
  } catch (e) {
    console.error('Critical test failure:', e);
  }
}

testRealAuth();
