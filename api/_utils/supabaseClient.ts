import { createClient } from '@supabase/supabase-js'

// Cache clients
let supabasePublic: any = null;
let supabaseAdmin: any = null;

const isPlaceholder = (val: string | undefined) => !val || val.includes('your-project') || val.includes('your-anon') || val.length < 10;

// Get Supabase URL - check multiple possible env var names for compatibility
// Note: API runs in Node.js/Vercel, so we use process.env (not import.meta)
function getSupabaseUrl(): string | undefined {
  return (
    process.env.SUPABASE_URL || 
    process.env.NEXT_PUBLIC_SUPABASE_URL || 
    process.env.VITE_SUPABASE_URL ||
    process.env.NEXT_PUBLIC_SUPABASE_URL
  );
}

// Get Supabase Anon Key - check multiple possible env var names for compatibility
function getSupabaseAnonKey(): string | undefined {
  return (
    process.env.SUPABASE_ANON_KEY || 
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 
    process.env.VITE_SUPABASE_ANON_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  );
}

// Get Supabase Service Role Key
function getSupabaseServiceKey(): string | undefined {
  return (
    process.env.SUPABASE_SERVICE_ROLE_KEY || 
    process.env.VITE_SUPABASE_SERVICE_ROLE_KEY ||
    process.env.SUPABASE_SERVICE_KEY
  );
}

export const getSupabaseConfigStatus = () => {
  const url = getSupabaseUrl();
  const key = getSupabaseAnonKey();
  
  const status = {
    hasUrl: !!url,
    hasKey: !!key,
    urlIsPlaceholder: isPlaceholder(url),
    keyIsPlaceholder: isPlaceholder(key),
    urlValid: !!(url && url.startsWith('http')),
    keyValid: !!(key && key.length >= 10 && !isPlaceholder(key)),
  };
  
  console.log('[Supabase] Config Status:', status);
  return status;
};

export const isSupabaseConfigured = (): boolean => {
  const status = getSupabaseConfigStatus();
  return status.hasUrl && status.hasKey && status.urlValid && status.keyValid;
};

export function getSupabasePublic() {
  if (supabasePublic) return supabasePublic;
  if (!isSupabaseConfigured()) return null;

  const url = getSupabaseUrl();
  const key = getSupabaseAnonKey();

  if (!url || !key) {
    console.error('[Supabase] Cannot create public client - missing URL or key');
    return null;
  }

  console.log('[Supabase] Initializing Public Client with URL:', url?.substring(0, 20) + '...');
  supabasePublic = createClient(url, key, { auth: { persistSession: false } });
  return supabasePublic;
}

export function getSupabaseAdmin() {
  if (supabaseAdmin) return supabaseAdmin;
  if (!isSupabaseConfigured()) return null;

  const url = getSupabaseUrl();
  const serviceKey = getSupabaseServiceKey();

  if (!serviceKey) {
    console.error('[Supabase] Admin client requested but service key is missing');
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
