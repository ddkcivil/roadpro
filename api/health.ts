// api/health.ts
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { supabaseAdmin, ensureSupabaseConfigured } from './_utils/supabaseClient.js';
import { withErrorHandler } from './_utils/errorHandler.js';

export default withErrorHandler(async function (req: VercelRequest, res: VercelResponse) {
  ensureSupabaseConfigured();
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
    const hasDeepSeek = !!process.env.VITE_DEEPSEEK_API_KEY;
    const hasGemini = !!process.env.VITE_GEMINI_API_KEY;
    const hasOpenAI = !!process.env.VITE_OPENAI_API_KEY;
    
    const supabaseReady = hasSupabaseUrl && hasSupabaseAnonKey && hasSupabaseServiceKey;
    
    console.log('--- HEALTH CHECK RUNNING ---');
    console.log('Supabase env check:', {
      SUPABASE_URL: !!hasSupabaseUrl,
      VITE_SUPABASE_URL: !!hasViteSupabaseUrl,
      SUPABASE_ANON_KEY: !!hasSupabaseAnonKey,
      VITE_SUPABASE_ANON_KEY: !!hasViteSupabaseAnonKey,
      SUPABASE_SERVICE_ROLE_KEY: !!hasSupabaseServiceKey,
      allSupabaseReady: supabaseReady
    });
    console.log('AI env check:', { hasDeepSeek, hasGemini, hasOpenAI });

    // Fetch real user count from profiles table
    const { count: userCount, error: userError } = await supabaseAdmin
      .from('profiles')
      .select('*', { count: 'exact', head: true });


    // Test new test_table: INSERT + count
    const { data: insertResult, error: insertError } = await supabaseAdmin
      .from('test_table')
      .insert({ message: `Health check at ${new Date().toISOString()}` })
      .select();

    const { count: testTableCount, error: testError } = await supabaseAdmin
      .from('test_table')
      .select('*', { count: 'exact', head: true });

    const results = {
      profiles: userError ? `Error: ${userError.message} (${userError.code || 'no code'})` : `Count: ${userCount}`,
      insert: insertError ? `Error: ${insertError.message} (${insertError.code || 'no code'})` : `ID: ${insertResult?.[0]?.id}`,
      testTable: testError ? `Error: ${testError.message} (${testError.code || 'no code'})` : `Count: ${testTableCount}`
    };

    if (userError || insertError || testError) {
      console.warn('Health check partial failure:', results);
      console.warn('Supabase URL being used:', supabaseUrl?.substring(0, 20) + '...');
    }






    res.status(200).json({
      status: 'ok',
      timestamp: new Date().toISOString(),
      database: 'connected (Supabase)',
      userCount: userCount || 0,
      testTableCount: testTableCount || 0,
      testInsertId: insertResult?.[0]?.id || null,
      nodeVersion: process.version,
      envCheck: { 
        SUPABASE_URL: !!hasSupabaseUrl,
        VITE_SUPABASE_URL: !!hasViteSupabaseUrl,
        SUPABASE_ANON_KEY: !!hasSupabaseAnonKey,
        VITE_SUPABASE_ANON_KEY: !!hasViteSupabaseAnonKey,
        SUPABASE_SERVICE_ROLE_KEY: !!hasSupabaseServiceKey,
        allSupabaseReady: supabaseReady,
        hasDeepSeek, 
        hasGemini,
        hasOpenAI
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
