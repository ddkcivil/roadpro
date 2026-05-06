import { createClient } from '@supabase/supabase-js';

const useMock = (import.meta as any).env?.VITE_USE_MOCK_SUPABASE === 'true';

let supabaseClient: any;

if (useMock) {
  throw new Error('[Supabase] Mock service is no longer supported. Please configure VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in your environment.');
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

  const isMissing = (val: string | undefined) => !val || val.length < 10 || val.includes('your-project') || val.includes('your-anon') || val.includes('placeholder');

  if (isMissing(supabaseUrl) || isMissing(supabaseAnonKey)) {
    throw new Error('[Supabase] Configuration is missing or invalid. Please configure VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in your environment.');
  }

  if (!supabaseUrl.startsWith('http')) {
    throw new Error(`CRITICAL: Invalid Supabase URL format: "${supabaseUrl}".`);
  }
  supabaseClient = createClient(supabaseUrl, supabaseAnonKey);
}

export const supabase = supabaseClient;
