import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
console.log('DEBUG: SUPABASE_SERVICE_ROLE_KEY is present:', !!supabaseServiceKey);
console.log('DEBUG: Key length:', supabaseServiceKey ? supabaseServiceKey.length : 0);
console.log('DEBUG: SUPABASE_URL valid:', supabaseUrl ? supabaseUrl.startsWith('https://') : false);
console.log('DEBUG: ANON_KEY length:', (supabaseAnonKey?.length || 0) > 0);

const isPlaceholder = (val: string | undefined) => !val || val.includes('your-project') || val.includes('your-anon');

if (isPlaceholder(supabaseUrl) || isPlaceholder(supabaseAnonKey)) {
  throw new Error('Missing or invalid Supabase environment variables. Please check your .env or Vercel dashboard for SUPABASE_URL and SUPABASE_ANON_KEY.');
}

if (!supabaseUrl!.startsWith('http')) {
  throw new Error(`Invalid SUPABASE_URL format: "${supabaseUrl}". It must be a valid HTTP/HTTPS URL.`);
}

export const supabasePublic = createClient(
  supabaseUrl!, 
  supabaseAnonKey!
)

export const supabaseAdmin = createClient(
  supabaseUrl!, 
  supabaseServiceKey || supabaseAnonKey!
)



// Optional: Setup tables if not exist (run once)
export async function setupDocumentTables() {
  // Create tables example - run manually or via migration
  console.log('Supabase tables setup - run via dashboard/SQL')
}
