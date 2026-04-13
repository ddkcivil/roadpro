import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing required Supabase env vars: SUPABASE_URL, SUPABASE_ANON_KEY');
}

if (!supabaseServiceKey) {
  throw new Error('Missing SUPABASE_SERVICE_ROLE_KEY for admin client');
}

export const supabasePublic = createClient(
  supabaseUrl, 
  supabaseAnonKey
)

export const supabaseAdmin = createClient(
  supabaseUrl, 
  supabaseServiceKey || supabaseAnonKey
)



// Optional: Setup tables if not exist (run once)
export async function setupDocumentTables() {
  // Create tables example - run manually or via migration
  console.log('Supabase tables setup - run via dashboard/SQL')
}
