
import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';

// Use environment variables confirmed to be working by test_supabase_config.ts
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceKey) {
    console.error('CRITICAL: Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY.');
    console.error('Ensure these are set in your environment or .env file.');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceKey);

async function introspect() {
  console.log('Introspecting database structure...');
  
  try {
    // Get columns for the 'projects' table from information_schema
    const { data: projectColumns, error: projectError } = await supabase.rpc('get_columns', { table_name: 'projects' });
    
    if (projectError) {
       console.error('Error fetching columns for "projects" table via RPC:', projectError.message);
       // Fallback: Try to select all and get keys if RPC fails and table not empty
       const { data: projects, error: selectError } = await supabase.from('projects').select('*').limit(1);
       if (selectError) {
           console.error('Error selecting from "projects" table (fallback):', selectError.message);
       } else if (projects && projects.length > 0) {
           console.log('Projects columns (from select *):', Object.keys(projects[0]));
       } else {
           console.log('Projects table is empty or inaccessible. Cannot infer columns via select *.');
       }
    } else {
       console.log('Columns for "projects" table:', projectColumns);
    }

    // Get columns for the 'messages' table from information_schema
    const { data: messageColumns, error: messageError } = await supabase.rpc('get_columns', { table_name: 'messages' });
    if (messageError) {
        console.error('Error fetching columns for "messages" table via RPC:', messageError.message);
    } else {
        console.log('Columns for "messages" table:', messageColumns);
    }

  } catch (e: any) {
    console.error('An unexpected error occurred during introspection:', e.message);
  }
}

introspect();
