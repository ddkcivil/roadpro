// api/health.ts
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { getSupabaseAdmin, isSupabaseConfigured, getSupabaseConfigStatus } from './_utils/supabaseClient.js';
import { withErrorHandler } from './_utils/errorHandler.js';

export default withErrorHandler(async function (req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') {
    res.status(405).json({ error: 'Method Not Allowed' });
    return;
  }

try {
    const configStatus = getSupabaseConfigStatus();
    
    const hasViteSupabaseUrl = !!process.env.VITE_SUPABASE_URL;
    const hasViteSupabaseAnonKey = !!process.env.VITE_SUPABASE_ANON_KEY;
    const hasSupabaseServiceKey = !!process.env.SUPABASE_SERVICE_ROLE_KEY;
    const hasGemini = !!process.env.VITE_GEMINI_API_KEY;
    
    const supabaseReady = configStatus.hasUrl && configStatus.hasKey && configStatus.urlValid && configStatus.keyValid;
    
console.log('--- HEALTH CHECK RUNNING ---');
    console.log('Supabase env check:', configStatus);
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
      targetProject: configStatus.hasUrl ? (configStatus.hasUrl ? 'https://hrampejpzsanbkrpzbod.supabase.co' : '') : 'none',
      tables: results,
      nodeVersion: process.version,
      envCheck: { 
        ...configStatus,
        VITE_SUPABASE_URL: !!hasViteSupabaseUrl,
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
