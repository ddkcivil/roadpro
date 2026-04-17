import { createClient } from '@supabase/supabase-js';
import { createMockSupabaseClient } from './supabaseMock';

const useMock = import.meta.env.VITE_USE_MOCK_SUPABASE === 'true';

let supabaseClient: any;

if (useMock) {
  console.warn('[Supabase] Using Mock Service!');
  supabaseClient = createMockSupabaseClient();
} else {
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || import.meta.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || import.meta.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  const isPlaceholder = (val: string | undefined) => !val || val.includes('your-project') || val.includes('your-anon');

  if (isPlaceholder(supabaseUrl) || isPlaceholder(supabaseAnonKey)) {
    throw new Error('CRITICAL: Supabase environment variables are missing or using placeholder values. Please set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY in your .env.local or Vercel dashboard with your actual Supabase credentials.');
  }

  if (!supabaseUrl.startsWith('http')) {
    throw new Error(`CRITICAL: Invalid NEXT_PUBLIC_SUPABASE_URL format: "${supabaseUrl}". It must be a valid HTTPS URL (e.g., https://xyz.supabase.co).`);
  }

  supabaseClient = createClient(supabaseUrl, supabaseAnonKey);
}

export const supabase = supabaseClient;
