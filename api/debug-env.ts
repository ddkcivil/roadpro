import type { VercelRequest, VercelResponse } from '@vercel/node';

export default async function (req: VercelRequest, res: VercelResponse) {
  res.status(200).json({
    hasUrl: !!process.env.SUPABASE_URL,
    hasNextUrl: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
    hasAnon: !!process.env.SUPABASE_ANON_KEY,
    hasNextAnon: !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    hasService: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
    keys: Object.keys(process.env).sort(),
    nodeVersion: process.version,
  });
}

