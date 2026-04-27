import { createClient } from '@supabase/supabase-js';
import { createMockSupabaseClient } from './supabaseMock.js';

const useMock = (import.meta as any).env?.VITE_USE_MOCK_SUPABASE === 'true';

let supabaseClient: any;

if (useMock) {
  console.warn('[Supabase] Using Mock Service!');
  supabaseClient = createMockSupabaseClient();
} else {
  const supabaseUrl = (import.meta as any).env?.NEXT_PUBLIC_SUPABASE_URL || (import.meta as any).env?.VITE_SUPABASE_URL || '';
  const supabaseAnonKey = (import.meta as any).env?.NEXT_PUBLIC_SUPABASE_ANON_KEY || (import.meta as any).env?.VITE_SUPABASE_ANON_KEY || '';

  console.log('[Supabase] Env Check:', { 
    urlLength: supabaseUrl?.length, 
    keyLength: supabaseAnonKey?.length,
    urlStart: supabaseUrl?.substring(0, 10)
  });

  const isPlaceholder = (val: string | undefined) => !val || val.includes('your-project') || val.includes('your-anon');

  if (isPlaceholder(supabaseUrl) || isPlaceholder(supabaseAnonKey)) {
    console.error('CRITICAL: Supabase environment variables are missing or using placeholder values.');
    // We create a dummy client to avoid crashing on import, but auth will fail
    supabaseClient = {
      auth: { 
        getSession: async () => ({ data: { session: null }, error: null }),
        onAuthStateChange: () => ({ data: { subscription: { unsubscribe: () => {} } } }),
        signInWithPassword: async () => ({ data: {}, error: new Error("Supabase not configured") }),
        signOut: async () => ({ error: null }),
        getUser: async () => ({ data: { user: null }, error: null })
      },
      from: () => ({ 
        select: () => ({ 
          eq: () => ({ 
            maybeSingle: async () => ({ data: null, error: null }), 
            single: async () => ({ data: null, error: null }),
            order: () => ({})
          }),
          order: () => ({})
        }),
        insert: () => ({ select: () => ({ single: async () => ({ data: null, error: null }) }) }),
        update: () => ({ eq: () => ({ select: () => ({ single: async () => ({ data: null, error: null }) }) }) }),
        delete: () => ({ eq: () => ({ error: null }) })
      })
    } as any;
  } else {
    if (!supabaseUrl.startsWith('http')) {
      throw new Error(`CRITICAL: Invalid Supabase URL format: "${supabaseUrl}".`);
    }
    supabaseClient = createClient(supabaseUrl, supabaseAnonKey);
  }
}

export const supabase = supabaseClient;
