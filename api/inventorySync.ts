import type { VercelRequest, VercelResponse } from '@vercel/node';
import { getSupabaseAdmin, isSupabaseConfigured } from './_utils/supabaseClient.js';
import { withErrorHandler } from './_utils/errorHandler.js';
import { withAuth } from './_utils/auth.js';

const EXTERNAL_API_URL = 'https://rajendradhakal.servernepal.cc/api_trans_all.php?api_key=INVENTORY_API_2026';

interface ExternalTransaction {
  id: number;
  username: string;
  name: string;
  branch: string;
  ref_no: string;
  party_name: string;
  vehical_no: string;
  category: string;
  material_detail: string;
  unit: string;
  recieved_qty: number;
  rate: number;
  amount: string;
  consumption: number;
  remarks: string;
  created_at: string;
  bsdate: string;
  dbdate: string;
  vat_percent: number;
  vat_amount: string;
  total_amount: string;
  location: string;
}

interface SyncResult {
  success: boolean;
  totalFetched: number;
  inserted: number;
  updated: number;
  skipped: number;
  errors: number;
  syncedAt: string;
  errorDetails?: string[];
}

const handler = async function (req: VercelRequest, res: VercelResponse) {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(204).end();
  }

  const allowedMethods = ['GET', 'POST', 'PUT', 'DELETE'];
  if (req.method && !allowedMethods.includes(req.method)) {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

if (!isSupabaseConfigured()) {
    return res.status(503).json({ error: 'Database service not configured' });
  }

  const supabaseAdmin = getSupabaseAdmin();
  if (!supabaseAdmin) {
    return res.status(503).json({ error: 'Database service not available' });
  }

  const id = req.query.id as string | undefined;
  const summary = req.query.summary as string | undefined;

  // GET - Fetch all or single material
  if (req.method === 'GET') {
    if (id) {
      const { data, error } = await supabaseAdmin
        .from('inventory_transactions')
        .select('*')
        .eq('id', id)
        .single();

      if (error) {
        return res.status(404).json({ error: 'Material not found', details: error.message });
      }

      return res.status(200).json(data);
    }

    // Summary view — aggregated unique materials with total stock quantity
    if (summary === 'true') {
      const { data, error } = await supabaseAdmin
        .from('inventory_transactions')
        .select('material_detail, category, unit, recieved_qty, id, location, created_at');

      if (error) {
        return res.status(500).json({ error: 'Failed to fetch inventory summary', details: error.message });
      }

      // Aggregate unique materials by material_detail
      const materialMap = new Map<string, {
        id: number;
        name: string;
        category: string;
        unit: string;
        total_quantity: number;
        total_amount: number;
        latest_location: string;
        transaction_count: number;
        created_at: string;
      }>();

      for (const tx of (data || [])) {
        const key = tx.material_detail || `Unknown-${tx.id}`;
        if (materialMap.has(key)) {
          const existing = materialMap.get(key)!;
          existing.total_quantity += (tx.recieved_qty || 0);
          existing.transaction_count += 1;
          existing.latest_location = tx.location || existing.latest_location;
          if (new Date(tx.created_at) > new Date(existing.created_at)) {
            existing.created_at = tx.created_at;
            existing.id = tx.id;
          }
        } else {
          materialMap.set(key, {
            id: tx.id,
            name: key,
            category: tx.category || '',
            unit: tx.unit || '',
            total_quantity: tx.recieved_qty || 0,
            total_amount: 0,
            latest_location: tx.location || '',
            transaction_count: 1,
            created_at: tx.created_at || '',
          });
        }
      }

      const materials = Array.from(materialMap.values());

      // Also compute stock in/out summary across all transactions
      const { data: stockSummary, error: sumError } = await supabaseAdmin
        .rpc('get_inventory_stock_summary' as any);

      // If RPC doesn't exist, compute client-side
      let totalStockIn = 0;
      let totalStockOut = 0;
      let totalCategories = 0;
      const categorySet = new Set<string>();
      for (const mat of materials) {
        totalStockIn += mat.total_quantity;
        if (mat.category) categorySet.add(mat.category);
      }
      totalCategories = categorySet.size;

      return res.status(200).json({
        materials,
        summary: {
          totalMaterials: materials.length,
          totalCategories,
          totalStockIn,
          totalStockOut,
          totalCurrentStock: totalStockIn,
        },
      });
    }

    // Return all transactions
    const { data, error } = await supabaseAdmin
      .from('inventory_transactions')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(1000);

    if (error) {
      return res.status(500).json({ error: 'Failed to fetch inventory transactions', details: error.message });
    }

    return res.status(200).json(data || []);
  }

  // POST - Sync from external API
  if (req.method === 'POST') {
    try {
      const externalResponse = await fetch(EXTERNAL_API_URL);

      if (!externalResponse.ok) {
        return res.status(502).json({ error: `External API returned status ${externalResponse.status}` });
      }

      const externalData = await externalResponse.json();
      
      if (!externalData || !externalData.data || !Array.isArray(externalData.data)) {
        return res.status(500).json({ error: 'Invalid response format from external API' });
      }

      const transactions: ExternalTransaction[] = externalData.data;
      const totalFetched = transactions.length;
      const syncedAt = new Date().toISOString();

      // Process in batches
      const batchSize = 100;
      let inserted = 0;
      let errors = 0;
      const errorDetails: string[] = [];

      for (let i = 0; i < transactions.length; i += batchSize) {
        const batch = transactions.slice(i, i + batchSize);
        
        const upsertRecords = batch.map(tx => ({
          id: tx.id,
          username: tx.username || null,
          name: tx.name || null,
          branch: tx.branch || null,
          ref_no: tx.ref_no || null,
          party_name: tx.party_name || null,
          vehical_no: tx.vehical_no || null,
          category: tx.category || null,
          material_detail: tx.material_detail || null,
          unit: tx.unit || null,
          recieved_qty: tx.recieved_qty ?? 0,
          rate: tx.rate ?? 0,
          amount: tx.amount || '0.00',
          consumption: tx.consumption ?? 0,
          remarks: tx.remarks || null,
          created_at: tx.created_at || null,
          bsdate: tx.bsdate || null,
          dbdate: tx.dbdate || null,
          vat_percent: tx.vat_percent ?? 0,
          vat_amount: tx.vat_amount || '0.00',
          total_amount: tx.total_amount || '0.00',
          location: tx.location || null,
          synced_at: syncedAt,
          source_url: EXTERNAL_API_URL,
        }));

        const { error } = await supabaseAdmin
          .from('inventory_transactions')
          .upsert(upsertRecords, { onConflict: 'id' });

        if (error) {
          errors += batch.length;
          errorDetails.push(`Batch ${i}-${i + batch.length}: ${error.message}`);
        } else {
          inserted += batch.length;
        }
      }

      const result: SyncResult = {
        success: errors === 0,
        totalFetched,
        inserted,
        updated: totalFetched - inserted,
        skipped: 0,
        errors,
        syncedAt,
      };

      if (errorDetails.length > 0) {
        result.errorDetails = errorDetails;
      }

      return res.status(200).json(result);
    } catch (error: any) {
      return res.status(500).json({ error: 'Inventory sync failed', details: error.message });
    }
  }

  // PUT - Update material
  if (req.method === 'PUT') {
    if (!id) {
      return res.status(400).json({ error: 'Material ID required' });
    }

    const { data, error } = await supabaseAdmin
      .from('inventory_transactions')
      .update(req.body)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      return res.status(500).json({ error: 'Failed to update material', details: error.message });
    }

    return res.status(200).json(data);
  }

  // DELETE - Delete material
  if (req.method === 'DELETE') {
    if (!id) {
      return res.status(400).json({ error: 'Material ID required' });
    }

    const { error } = await supabaseAdmin
      .from('inventory_transactions')
      .delete()
      .eq('id', id);

    if (error) {
      return res.status(500).json({ error: 'Failed to delete material', details: error.message });
    }

    return res.status(200).json({ success: true });
  }

  return res.status(405).json({ error: 'Method Not Allowed' });
};

export default withErrorHandler(withAuth(handler));
