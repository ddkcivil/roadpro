// api/health.ts
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { getSupabaseAdmin, isSupabaseConfigured } from './_utils/supabaseClient';
import { withErrorHandler } from './_utils/errorHandler';

export default withErrorHandler(async function (req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') {
    res.status(405).json({ error: 'Method Not Allowed' });
    return;
  }

  try {
    const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseAnonKey = process.env.SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    
    const isPlaceholder = (val: string | undefined) => !val || val.includes('your-project') || val.includes('your-anon');
    
    const hasSupabaseUrl = !!supabaseUrl && !isPlaceholder(supabaseUrl) && supabaseUrl.startsWith('https://');
    const hasViteSupabaseUrl = !!process.env.VITE_SUPABASE_URL;
    const hasSupabaseAnonKey = !!supabaseAnonKey && !isPlaceholder(supabaseAnonKey);
    const hasViteSupabaseAnonKey = !!process.env.VITE_SUPABASE_ANON_KEY;
    const hasSupabaseServiceKey = !!supabaseServiceKey;
    const hasGemini = !!process.env.VITE_GEMINI_API_KEY;
    
    const supabaseReady = isSupabaseConfigured();
    
    console.log('--- HEALTH CHECK RUNNING ---');
    console.log('Supabase env check:', {
      SUPABASE_URL: !!hasSupabaseUrl,
      VITE_SUPABASE_URL: !!hasViteSupabaseUrl,
      SUPABASE_ANON_KEY: !!hasSupabaseAnonKey,
      VITE_SUPABASE_ANON_KEY: !!hasViteSupabaseAnonKey,
      SUPABASE_SERVICE_ROLE_KEY: !!hasSupabaseServiceKey,
      allSupabaseReady: supabaseReady
    });
    console.log('AI env check:', { hasGemini });

    let results: any = {};
    
    if (supabaseReady) {
      const supabase = getSupabaseAdmin();
      if (supabase) {
        // Fetch counts from critical tables
        const { count: userCount, error: userError } = await supabase
          .from('profiles')
          .select('*', { count: 'exact', head: true });

        const { count: projectCount, error: projectError } = await supabase
          .from('projects')
          .select('*', { count: 'exact', head: true });

        const { count: messageCount, error: messageError } = await supabase
          .from('messages')
          .select('*', { count: 'exact', head: true });

        results = {
          profiles: userError ? `Error: ${userError.message}` : `OK (${userCount} rows)`,
          projects: projectError ? `Error: ${projectError.message}` : `OK (${projectCount} rows)`,
          messages: messageError ? `Error: ${messageError.message}` : `OK (${messageCount} rows)`
        };

        if (userError || projectError || messageError) {
          console.warn('Health check partial failure:', results);
        }
      } else {
        results = { status: 'Supabase client could not be initialized' };
      }
    } else {
      results = { status: 'Supabase not configured' };
    }

    res.status(200).json({
      status: 'ok',
      timestamp: new Date().toISOString(),
      database: supabaseReady ? 'connected (Supabase)' : 'not configured',
      targetProject: supabaseUrl ? (supabaseUrl.substring(0, 25) + '...') : 'none',
      tables: results,
      nodeVersion: process.version,
      envCheck: { 
        SUPABASE_URL: !!hasSupabaseUrl,
        VITE_SUPABASE_URL: !!hasViteSupabaseUrl,
        SUPABASE_ANON_KEY: !!hasSupabaseAnonKey,
        VITE_SUPABASE_ANON_KEY: !!hasViteSupabaseAnonKey,
        SUPABASE_SERVICE_ROLE_KEY: !!hasSupabaseServiceKey,
        allSupabaseReady: supabaseReady,
        hasGemini
      }
    });

  } catch (error: any) {
    console.error('CRITICAL Health check failed:', error);
    res.status(500).json({ 
      error: 'CRITICAL Health check failed', 
      details: error.message,
      type: error.name
    });
  }
})
