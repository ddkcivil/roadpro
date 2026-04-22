import { config } from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
// Load from api/.env and root .env with override
config({ path: path.join(__dirname, '..', '.env'), override: true });
config({ path: path.join(__dirname, '..', '..', '.env'), override: true });

import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const isPlaceholder = (val: string | undefined) => !val || val.includes('your-project') || val.includes('your-anon');

// We'll export a helper to check if the client is valid
export const isSupabaseConfigured = () => {
  return !isPlaceholder(supabaseUrl) && !isPlaceholder(supabaseAnonKey) && !!supabaseUrl && supabaseUrl.startsWith('http');
};

// Initialize only if we have basic requirements to avoid library-level throws
// We'll use fallbacks if missing, but then check in handlers
const finalUrl = isPlaceholder(supabaseUrl) ? 'https://placeholder.supabase.co' : supabaseUrl!;
const finalAnonKey = isPlaceholder(supabaseAnonKey) ? 'placeholder' : supabaseAnonKey!;

export const supabasePublic = createClient(
  finalUrl, 
  finalAnonKey
)

export const supabaseAdmin = createClient(
  finalUrl,
  supabaseServiceKey || finalAnonKey
)

export function ensureSupabaseConfigured() {
  const currentUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
  const currentAnon = process.env.SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (isPlaceholder(currentUrl) || isPlaceholder(currentAnon)) {
    const missing = [];
    if (isPlaceholder(currentUrl)) missing.push('SUPABASE_URL');
    if (isPlaceholder(currentAnon)) missing.push('SUPABASE_ANON_KEY');

    console.error(`[CONFIG] Missing or placeholder Supabase variables: ${missing.join(', ')}`);
    console.error('[CONFIG] process.env keys:', Object.keys(process.env).filter(k => k.includes('SUPABASE')));
    throw new Error(`CRITICAL: Supabase environment variables (${missing.join(', ')}) are missing or using placeholder values.`);
  }

  if (!currentUrl!.startsWith('http')) {
    console.error(`[CONFIG] Invalid SUPABASE_URL format: "${currentUrl}"`);
    throw new Error(`CRITICAL: Invalid SUPABASE_URL format: "${currentUrl}". It must be a valid HTTP/HTTPS URL.`);
  }
}



// Optional: Setup tables if not exist (run once)
export async function setupDocumentTables() {
  // Create tables example - run manually or via migration
  console.log('Supabase tables setup - run via dashboard/SQL')
}

