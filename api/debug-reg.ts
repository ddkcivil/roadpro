import type { VercelRequest, VercelResponse } from '@vercel/node';
import { supabaseAdmin } from './_utils/supabaseClient.js';

export default async function (req: VercelRequest, res: VercelResponse) {
  const { data, error } = await supabaseAdmin
    .from('registrations')
    .select('id, email, name, status, requested_role');
  
  if (error) {
    return res.status(500).json({ error: error.message });
  }
  
  res.status(200).json({
    count: data.length,
    registrations: data
  });
}
