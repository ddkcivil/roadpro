import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

const isPlaceholder = (val: string | undefined) => !val || val.includes('your-project') || val.includes('your-anon');

if (isPlaceholder(supabaseUrl) || isPlaceholder(supabaseAnonKey)) {
  throw new Error('CRITICAL: Supabase environment variables are missing or using placeholder values. Please set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in your .env.local or Vercel dashboard with your actual Supabase credentials.');
}

if (!supabaseUrl.startsWith('http')) {
  throw new Error(`CRITICAL: Invalid VITE_SUPABASE_URL format: "${supabaseUrl}". It must be a valid HTTPS URL (e.g., https://xyz.supabase.co).`);
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
