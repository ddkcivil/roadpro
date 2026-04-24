// Fixed Supabase REST API query - changed "createdat" → "created_at" (snake_case)
import 'dotenv/config';

const SUPABASE_REST_URL = 'http://127.0.0.1:54321/rest/v1';
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

async function testProjectsQuery() {
  console.log('Testing Supabase projects REST API...');
  
  // BROKEN QUERY (original error):
  // const brokenUrl = `${SUPABASE_REST_URL}/projects?select=*&order=createdat.desc`;
  
  // FIXED QUERY:
  const fixedUrl = `${SUPABASE_REST_URL}/projects?select=*&order=created_at.desc`;
  
  try {
    const response = await fetch(fixedUrl, {
      method: 'GET',
      headers: {
        'apikey': SUPABASE_ANON_KEY,
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
        'Content-Type': 'application/json',
      },
    });
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${await response.text()}`);
    }
    
    const projects = await response.json();
    console.log('✅ SUCCESS! Found projects:', projects.length);
    console.log('First project:', projects[0]);
    
  } catch (error) {
    console.error('❌ Query failed:', error);
  }
}

testProjectsQuery();
