// api/health.ts
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { supabaseAdmin } from './_utils/supabaseClient.js';
import { withErrorHandler } from './_utils/errorHandler.js';

export default withErrorHandler(async function (req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') {
    res.status(405).json({ error: 'Method Not Allowed' });
    return;
  }

  try {
    const envVars = Object.keys(process.env);
    const hasSupabaseUrl = !!process.env.NEXT_PUBLIC_SUPABASE_URL;
    const hasSupabaseKey = !!process.env.SUPABASE_SERVICE_ROLE_KEY;
    const hasDeepSeek = envVars.includes('VITE_DEEPSEEK_API_KEY');
    const hasGemini = envVars.includes('VITE_GEMINI_API_KEY');
    const hasOpenAI = envVars.includes('VITE_OPENAI_API_KEY');
    
    console.log('Environment variables check:', { hasSupabaseUrl: !!hasSupabaseUrl, hasSupabaseKey: !!hasSupabaseKey, hasDeepSeek, hasGemini, hasOpenAI });

    // Test Supabase connection - profiles table
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

    const msg = `Profiles:${userError?.message || userCount} | Insert:${insertError?.message || insertResult?.[0]?.id} | TestTable:${testError?.message || testTableCount}`;
    if (userError || insertError || testError) {
      res.status(500).send(msg);
      return;
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
          hasSupabaseUrl, 
          hasSupabaseKey: !!hasSupabaseKey,
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
