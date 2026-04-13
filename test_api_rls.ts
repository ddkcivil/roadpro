import { supabasePublic } from './api/_utils/supabaseClient.ts';

async function runTests() {
  console.log('--- Starting API & RLS Tests ---');

  // 1. Test Health
  try {
    console.log('Testing /api/health...');
    const response = await fetch('http://localhost:3000/api/health');
    const data = await response.json();
    console.log('Health check:', data);
  } catch (e) {
    console.error('Health check failed:', e);
  }

  // 2. Test Public Project Access (RLS)
  try {
    console.log('\nTesting public access to projects...');
    const { data, error } = await supabasePublic
      .from('projects')
      .select('name')
      .limit(1);
    
    if (error) {
      console.error('Projects select error:', error);
    } else {
      console.log('Projects found:', data);
    }
  } catch (e) {
    console.error('Projects test failed:', e);
  }

  console.log('\n--- Tests Complete ---');
}

runTests();
