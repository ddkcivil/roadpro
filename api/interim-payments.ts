import type { VercelRequest, VercelResponse } from '@vercel/node';
import { getSupabaseAdmin, isSupabaseConfigured } from './_utils/supabaseClient.js';
import { withErrorHandler } from './_utils/errorHandler.js';
import { withAuth } from './_utils/auth.js';

const handler = async function (req: VercelRequest, res: VercelResponse) {
  if (!isSupabaseConfigured()) {
    return res.status(503).json({ error: 'Database service not configured' });
  }
  const supabaseAdmin = getSupabaseAdmin();
  if (!supabaseAdmin) {
    return res.status(503).json({ error: 'Database service not available' });
  }

  const { id } = req.query;
  const projectId = Array.isArray(id) ? id[0] : id;

  if (!projectId) {
    return res.status(400).json({ error: 'Project ID is required' });
  }

  try {
    if (req.method === 'GET') {
      const { data, error } = await supabaseAdmin
        .from('projects')
        .select('interim_payments')
        .eq('id', projectId)
        .single();

      if (error) throw error;
      return res.status(200).json(data?.interim_payments || []);
    }

    if (req.method === 'POST') {
      const payment = req.body;
      if (!payment || !payment.id) {
        return res.status(400).json({ error: 'Invalid payment data' });
      }

      const { data: currentProject, error: fetchError } = await supabaseAdmin
        .from('projects')
        .select('interim_payments')
        .eq('id', projectId)
        .single();

      if (fetchError) throw fetchError;

      const currentPayments = currentProject?.interim_payments || [];
      const updatedPayments = [...currentPayments, payment];

      const { error: updateError } = await supabaseAdmin
        .from('projects')
        .update({ interim_payments: updatedPayments })
        .eq('id', projectId);

      if (updateError) throw updateError;
      return res.status(201).json(payment);
    }

    if (req.method === 'PUT') {
      const payment = req.body;
      if (!payment || !payment.id) {
        return res.status(400).json({ error: 'Invalid payment data' });
      }

      const { data: currentProject, error: fetchError } = await supabaseAdmin
        .from('projects')
        .select('interim_payments')
        .eq('id', projectId)
        .single();

      if (fetchError) throw fetchError;

      const currentPayments = currentProject?.interim_payments || [];
      const updatedPayments = currentPayments.map((p: any) => 
        p.id === payment.id ? payment : p
      );

      const { error: updateError } = await supabaseAdmin
        .from('projects')
        .update({ interim_payments: updatedPayments })
        .eq('id', projectId);

      if (updateError) throw updateError;
      return res.status(200).json(payment);
    }

    if (req.method === 'DELETE') {
      const paymentId = req.body.id;
      if (!paymentId) {
        return res.status(400).json({ error: 'Payment ID is required' });
      }

      const { data: currentProject, error: fetchError } = await supabaseAdmin
        .from('projects')
        .select('interim_payments')
        .eq('id', projectId)
        .single();

      if (fetchError) throw fetchError;

      const currentPayments = currentProject?.interim_payments || [];
      const updatedPayments = currentPayments.filter((p: any) => p.id !== paymentId);

      const { error: updateError } = await supabaseAdmin
        .from('projects')
        .update({ interim_payments: updatedPayments })
        .eq('id', projectId);

      if (updateError) throw updateError;
      return res.status(200).json({ success: true });
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (error: any) {
    console.error('Interim Payments API error:', error);
    return res.status(500).json({ error: 'Operation failed', details: error.message });
  }
};

export default withErrorHandler(handler);
export const config = { api: { bodyParser: true } };