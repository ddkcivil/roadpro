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
    urlLength: supabaseUrl?.length ?? 0, 
    keyLength: supabaseAnonKey?.length ?? 0,
    urlStart: supabaseUrl?.substring(0, 20) || 'EMPTY',
    hasValidUrl: !!supabaseUrl && supabaseUrl.startsWith('https://'),
    keyPreview: supabaseAnonKey ? `${supabaseAnonKey.substring(0, 10)}...` : 'MISSING'
  });

  const isPlaceholder = (val: string | undefined) => !val || val.length < 10 || val.includes('your-project') || val.includes('your-anon') || val.includes('placeholder');

  if (isPlaceholder(supabaseUrl) || isPlaceholder(supabaseAnonKey)) {
    console.error('🚨 CRITICAL: Supabase config invalid. Check .env:');
    console.error('   VITE_SUPABASE_URL  ← must be https://your-project.supabase.co');
    console.error('   VITE_SUPABASE_ANON_KEY ← from Supabase Dashboard > Settings > API');
    console.error('Current:', { url: supabaseUrl ? `${supabaseUrl.substring(0,30)}...` : 'MISSING', keyLength: supabaseAnonKey?.length ?? 0 });
    
    // Dummy client that FAILS FAST with consistent errors
    supabaseClient = {
      auth: { 
        getSession: async () => ({ data: { session: null }, error: new Error("Supabase: Config missing - see console") }),
        onAuthStateChange: () => ({ data: { subscription: { unsubscribe: () => {} } } }),
        signInWithPassword: async () => ({ data: {}, error: new Error("Supabase: Config missing - see console") }),
        signOut: async () => ({ error: null }),
        getUser: async () => ({ data: { user: null }, error: new Error("Supabase: Config missing") })
      },
      from: () => ({ 
        select: async () => ({ 
          eq: async () => ({ 
            maybeSingle: async () => ({ data: null, error: new Error("Supabase: Config missing - projects fetch blocked") }), 
            single: async () => ({ data: null, error: new Error("Supabase: Config missing") }),
            order: () => ({})
          }),
          order: () => ({})
        }),
        insert: () => ({ select: () => ({ single: async () => ({ data: null, error: new Error("Supabase: Config missing - save blocked") }) }) }),
        update: () => ({ eq: () => ({ select: () => ({ single: async () => ({ data: null, error: new Error("Supabase: Config missing") }) }) }) }),
        delete: () => ({ eq: () => ({ error: new Error("Supabase: Config missing") }) })
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
