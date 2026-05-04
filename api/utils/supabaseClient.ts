import { createClient } from '@supabase/supabase-js'

// Rely on Vercel's injected environment variables. 
// Do not manually load .env files in production as it can cause overrides and path issues.

const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const isPlaceholder = (val: string | undefined) => !val || val.includes('your-project') || val.includes('your-anon') || val.length < 10;

// Use null instead of placeholder to fail fast rather than connect to invalid URL
let finalUrl: string;
let finalAnonKey: string;

if (isPlaceholder(supabaseUrl) || isPlaceholder(supabaseAnonKey)) {
  console.error('[supabaseClient] Missing or invalid SUPABASE_URL or SUPABASE_ANON_KEY');
  finalUrl = 'https://placeholder.supabase.co';
  finalAnonKey = 'placeholder';
} else {
  finalUrl = supabaseUrl!;
  finalAnonKey = supabaseAnonKey!;
}

export const supabasePublic = createClient(
  finalUrl, 
  finalAnonKey
)

export const supabaseAdmin = createClient(
  finalUrl,
  supabaseServiceKey || finalAnonKey
)

export function ensureSupabaseConfigured() {
  const currentUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const currentAnon = process.env.SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY;

  if (isPlaceholder(currentUrl) || isPlaceholder(currentAnon)) {
    const missing = [];
    if (isPlaceholder(currentUrl)) missing.push('SUPABASE_URL');
    if (isPlaceholder(currentAnon)) missing.push('SUPABASE_ANON_KEY');

    console.error(`[CONFIG] Missing or placeholder Supabase variables: ${missing.join(', ')}`);
    throw new Error(`CRITICAL: Supabase environment variables (${missing.join(', ')}) are missing or using placeholder values.`);
  }

  if (!currentUrl!.startsWith('http')) {
    throw new Error(`CRITICAL: Invalid SUPABASE_URL format: "${currentUrl}". It must be a valid HTTP/HTTPS URL.`);
  }
}

export const isSupabaseConfigured = () => {
  try {
    ensureSupabaseConfigured();
    return true;
  } catch {
    return false;
  }
};



// Optional: Setup tables if not exist (run once)
export async function setupDocumentTables() {
  // Create tables example - run manually or via migration
  console.log('Supabase tables setup - run via dashboard/SQL')
}

