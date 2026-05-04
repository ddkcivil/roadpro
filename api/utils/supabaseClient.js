import 'dotenv/config'; // Required for loading .env variables locally
import { createClient, SupabaseClient } from '@supabase/supabase-js';

const supabaseUrlEnv = process.env.SUPABASE_URL;
const supabaseAnonKeyEnv = process.env.SUPABASE_ANON_KEY;
const supabaseServiceKeyEnv = process.env.SUPABASE_SERVICE_ROLE_KEY;

const isPlaceholder = (val: string | undefined | null): boolean => !val || val.includes('your-project') || val.includes('your-anon');

export const ensureSupabaseConfigured = (): { url: string; anonKey: string; serviceKey: string } => {
    if (isPlaceholder(supabaseUrlEnv) || isPlaceholder(supabaseAnonKeyEnv)) {
        const missing = [];
        if (isPlaceholder(supabaseUrlEnv)) missing.push('SUPABASE_URL');
        if (isPlaceholder(supabaseAnonKeyEnv)) missing.push('SUPABASE_ANON_KEY');
        console.error(`[CONFIG] Missing or placeholder Supabase variables: \${missing.join(', ')}`);
        throw new Error(`CRITICAL: Supabase environment variables (\${missing.join(', ')}) are missing or using placeholder values. Please check your .env file or Vercel dashboard.`);
    }
    if (!supabaseUrlEnv || !supabaseUrlEnv.startsWith('http')) {
        console.error(`[CONFIG] Invalid SUPABASE_URL format: "\${supabaseUrlEnv}"`);
        throw new Error(`CRITICAL: Invalid SUPABASE_URL format: "\${supabaseUrlEnv}". It must be a valid HTTP/HTTPS URL.`);
    }
    if (!supabaseServiceKeyEnv || isPlaceholder(supabaseServiceKeyEnv)) {
        console.error('[CONFIG] Missing or placeholder SUPABASE_SERVICE_ROLE_KEY.');
        throw new Error('CRITICAL: SUPABASE_SERVICE_ROLE_KEY is missing or using a placeholder value. This key is required for admin operations.');
    }
    // We've checked that these are defined and valid, so we can assert non-null
    return { url: supabaseUrlEnv!, anonKey: supabaseAnonKeyEnv!, serviceKey: supabaseServiceKeyEnv! };
};

// Initialize Supabase clients after configuration check
let supabasePublicClient: SupabaseClient;
let supabaseAdminClient: SupabaseClient;

try {
    const { url, anonKey, serviceKey } = ensureSupabaseConfigured();
    supabasePublicClient = createClient(url, anonKey);
    supabaseAdminClient = createClient(url, serviceKey);
    
    // IMPORTANT: For server-side operations (like in API routes), you *must* use the service role key.
    // The 'createClient' function when used with the service key implicitly enables the service role.
    // If you need to access auth functions from the service role client, you might need to use:
    // supabaseAdminClient.auth.admin.* methods.

    console.log('[Supabase] Clients initialized successfully.');

} catch (error) {
    console.error('Failed to initialize Supabase clients:', error);
    // Exit if configuration fails, as the script cannot proceed
    process.exit(1);
}

export const supabase = supabasePublicClient; // Client for frontend usage (e.g., in hooks)
export const supabaseAdmin = supabaseAdminClient; // Client for backend API routes
