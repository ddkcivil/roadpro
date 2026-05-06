import { createClient } from '@supabase/supabase-js'

// Cache clients
let supabasePublic: any = null;
let supabaseAdmin: any = null;

const isPlaceholder = (val: string | undefined) => !val || val.includes('your-project') || val.includes('your-anon') || val.length < 10;

export const isSupabaseConfigured = (): boolean => {
  const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const key = process.env.SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY;
  
  if (!url || !key || isPlaceholder(url) || isPlaceholder(key)) return false;
  return url.startsWith('http');
};

export function getSupabasePublic() {
  if (supabasePublic) return supabasePublic;
  if (!isSupabaseConfigured()) return null;

  const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const key = process.env.SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY;

  console.log('[Supabase] Initializing Public Client');
  supabasePublic = createClient(url!, key!);
  return supabasePublic;
}

export function getSupabaseAdmin() {
  if (supabaseAdmin) return supabaseAdmin;
  if (!isSupabaseConfigured()) return null;

  const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const anonKey = process.env.SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY;

  console.log('[Supabase] Initializing Admin Client');
  supabaseAdmin = createClient(url!, serviceKey || anonKey!);
  return supabaseAdmin;
}

// Compatibility exports
export { supabasePublic, supabaseAdmin };


// Optional: Setup tables if not exist (run once)
export async function setupDocumentTables() {
  // Create tables example - run manually or via migration
  console.log('Supabase tables setup - run via dashboard/SQL')
}
