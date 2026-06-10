import { createClient } from '@supabase/supabase-js'

// Cache clients
let supabasePublic: any = null;
let supabaseAdmin: any = null;

const isPlaceholder = (val: string | undefined) => !val || val.includes('your-project') || val.includes('your-anon') || val.length < 10;

export const isSupabaseConfigured = (): boolean => {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_ANON_KEY;
  
  if (!url || !key || isPlaceholder(url) || isPlaceholder(key)) return false;
  return url.startsWith('http');
};

export function getSupabasePublic() {
  if (supabasePublic) return supabasePublic;
  if (!isSupabaseConfigured()) return null;

  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_ANON_KEY;

  console.log('[Supabase] Initializing Public Client');
  supabasePublic = createClient(url!, key!, { auth: { persistSession: false } });
  return supabasePublic;
}

export function getSupabaseAdmin() {
  if (supabaseAdmin) return supabaseAdmin;
  if (!isSupabaseConfigured()) return null;

  const url = process.env.SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!serviceKey) {
    console.error('[Supabase] Admin client requested but SUPABASE_SERVICE_ROLE_KEY is missing');
    return null;
  }

  console.log('[Supabase] Initializing Admin Client');
  supabaseAdmin = createClient(url!, serviceKey, { auth: { persistSession: false } });
  return supabaseAdmin;
}

// NOTE: Only getter functions are exported
// Use getSupabasePublic() or getSupabaseAdmin() to get clients
// Do NOT import supabasePublic or supabaseAdmin directly as they may be null

// Optional: Setup tables if not exist (run once)
export async function setupDocumentTables() {
  // Create tables example - run manually or via migration
  console.log('Supabase tables setup - run via dashboard/SQL')
}
