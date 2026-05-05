import { createClient } from '@supabase/supabase-js'

// Rely on Vercel's injected environment variables. 
// Do not manually load .env files in production as it can cause overrides and path issues.

// Debug logging
console.log('[supabaseClient] Checking env vars - keys:', Object.keys(process.env).filter(k => k.includes('SUPABASE') || k.includes('VITE') || k.includes('NEXT')));

const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.VITE_SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

console.log('[supabaseClient] Loaded URL:', supabaseUrl, 'AnonKey:', supabaseAnonKey ? 'set' : 'missing');

const isPlaceholder = (val: string | undefined) => !val || val.includes('your-project') || val.includes('your-anon') || val.length < 10;

// Check if properly configured before creating client
const isProperlyConfigured = (): boolean => {
  const urlValid = supabaseUrl && !isPlaceholder(supabaseUrl) && 
    (supabaseUrl.startsWith('http://') || supabaseUrl.startsWith('https://'));
  const keyValid = supabaseAnonKey && !isPlaceholder(supabaseAnonKey);
  return urlValid && keyValid;
};

// Only create Supabase client if properly configured - DON'T use placeholder values
let supabasePublic: any = null;
let supabaseAdmin: any = null;

if (isProperlyConfigured()) {
  console.log('[supabaseClient] Creating Supabase client with valid config');
  supabasePublic = createClient(supabaseUrl!, supabaseAnonKey!);
  supabaseAdmin = createClient(supabaseUrl!, supabaseServiceKey || supabaseAnonKey!);
} else {
  console.log('[supabaseClient] Supabase NOT configured - will use fallback only');
}

export { supabasePublic, supabaseAdmin };

// Helper function to get Supabase client with null check - prevents crashes when not configured
export function getSupabaseAdmin() {
  if (!supabaseAdmin) {
    console.warn('[supabaseClient] getSupabaseAdmin called but Supabase is not configured. Add SUPABASE_URL and SUPABASE_ANON_KEY to enable.');
    return null;
  }
  return supabaseAdmin;
}

export function getSupabasePublic() {
  if (!supabasePublic) {
    console.warn('[supabaseClient] getSupabasePublic called but Supabase is not configured. Add SUPABASE_URL and SUPABASE_ANON_KEY to enable.');
    return null;
  }
  return supabasePublic;
}

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

// NEW: Simple check that returns false gracefully without throwing
export const isSupabaseConfigured = (): boolean => {
  // Simply check if valid env vars exist without throwing
  const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const key = process.env.SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY;
  
  // Check for placeholders or missing values
  if (!url || !key || url.includes('your-project') || key.includes('your-anon') || url.length < 10 || key.length < 10) {
    console.log('[supabaseClient] Supabase not configured (missing or placeholder env vars)');
    return false;
  }
  
  // Check if URL is valid format
  if (!url.startsWith('http://') && !url.startsWith('https://')) {
    console.log('[supabaseClient] Supabase URL invalid format');
    return false;
  }
  
  return true;
};

// Optional: Setup tables if not exist (run once)
export async function setupDocumentTables() {
  // Create tables example - run manually or via migration
  console.log('Supabase tables setup - run via dashboard/SQL')
}
