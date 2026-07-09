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
        .select('monthly_reports')
        .eq('id', projectId)
        .single();

      if (error) throw error;
      return res.status(200).json(data?.monthly_reports || []);
    }

    if (req.method === 'POST') {
      const report = req.body;
      if (!report || !report.id) {
        return res.status(400).json({ error: 'Invalid report data' });
      }

      const { data: currentProject, error: fetchError } = await supabaseAdmin
        .from('projects')
        .select('monthly_reports')
        .eq('id', projectId)
        .single();

      if (fetchError) throw fetchError;

      const currentReports = currentProject?.monthly_reports || [];
      const updatedReports = [...currentReports, report];

      const { error: updateError } = await supabaseAdmin
        .from('projects')
        .update({ monthly_reports: updatedReports })
        .eq('id', projectId);

      if (updateError) throw updateError;
      return res.status(201).json(report);
    }

    if (req.method === 'PUT') {
      const report = req.body;
      if (!report || !report.id) {
        return res.status(400).json({ error: 'Invalid report data' });
      }

      const { data: currentProject, error: fetchError } = await supabaseAdmin
        .from('projects')
        .select('monthly_reports')
        .eq('id', projectId)
        .single();

      if (fetchError) throw fetchError;

      const currentReports = currentProject?.monthly_reports || [];
      const updatedReports = currentReports.map((r: any) => 
        r.id === report.id ? report : r
      );

      const { error: updateError } = await supabaseAdmin
        .from('projects')
        .update({ monthly_reports: updatedReports })
        .eq('id', projectId);

      if (updateError) throw updateError;
      return res.status(200).json(report);
    }

    if (req.method === 'DELETE') {
      const reportId = req.body.id;
      if (!reportId) {
        return res.status(400).json({ error: 'Report ID is required' });
      }

      const { data: currentProject, error: fetchError } = await supabaseAdmin
        .from('projects')
        .select('monthly_reports')
        .eq('id', projectId)
        .single();

      if (fetchError) throw fetchError;

      const currentReports = currentProject?.monthly_reports || [];
      const updatedReports = currentReports.filter((r: any) => r.id !== reportId);

      const { error: updateError } = await supabaseAdmin
        .from('projects')
        .update({ monthly_reports: updatedReports })
        .eq('id', projectId);

      if (updateError) throw updateError;
      return res.status(200).json({ success: true });
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (error: any) {
    console.error('Monthly Reports API error:', error);
    return res.status(500).json({ error: 'Operation failed', details: error.message });
  }
};

export default withErrorHandler(handler);
export const config = { api: { bodyParser: true } };