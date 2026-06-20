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
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(204).end();
  }

  if (req.method !== 'POST' && req.method !== 'GET') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  if (!isSupabaseConfigured()) {
    return res.status(503).json({ error: 'Database service not configured' });
  }

  const supabaseAdmin = getSupabaseAdmin();
  if (!supabaseAdmin) {
    return res.status(503).json({ error: 'Database service not available' });
  }

  const currentUser = (req as any).user;

  if (req.method === 'GET') {
    // Return all synced inventory transactions
    const { data, error } = await supabaseAdmin
      .from('inventory_transactions')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(1000);

    if (error) {
      console.error('[InventorySync] Fetch error:', error);
      return res.status(500).json({ error: 'Failed to fetch inventory transactions', details: error.message });
    }

    return res.status(200).json(data || []);
  }

  try {
    console.log(`[InventorySync] Starting sync for user: ${currentUser?.userId}`);

    // Step 1: Fetch from external API
    let externalResponse: Response;
    try {
      externalResponse = await fetch(EXTERNAL_API_URL);
    } catch (fetchError: any) {
      console.error('[InventorySync] External API fetch failed:', fetchError.message);
      return res.status(502).json({ error: 'Failed to reach external inventory API', details: fetchError.message });
    }

    if (!externalResponse.ok) {
      return res.status(502).json({ error: `External API returned status ${externalResponse.status}` });
    }

    const externalData = await externalResponse.json();
    
    if (!externalData || !externalData.data || !Array.isArray(externalData.data)) {
      return res.status(500).json({ error: 'Invalid response format from external API' });
    }

    const transactions: ExternalTransaction[] = externalData.data;
    const totalFetched = transactions.length;
    console.log(`[InventorySync] Fetched ${totalFetched} records from external API`);

    // Step 2: Prepare records for upsert
    let inserted = 0;
    let updated = 0;
    let skipped = 0;
    let errors = 0;
    const errorDetails: string[] = [];

    // Process in batches of 100 to avoid payload limits
    const batchSize = 100;
    const syncedAt = new Date().toISOString();

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

      const { data, error } = await supabaseAdmin
        .from('inventory_transactions')
        .upsert(upsertRecords, { onConflict: 'id' })
        .select('id');

      if (error) {
        console.error(`[InventorySync] Batch upsert error (batch starting at ${i}):`, error.message);
        errors += batch.length;
        errorDetails.push(`Batch ${i}-${i + batch.length}: ${error.message}`);
      } else if (data) {
        // Count new vs updated by comparing synced_at
        for (const record of data) {
          const originalTx = batch.find(b => b.id === record.id);
          if (originalTx) {
            if (record.synced_at === syncedAt) {
              inserted++;
            } else {
              updated++;
            }
          }
        }
      } else {
        // If no error and no data returned, assume all were upserted
        inserted += batch.length;
      }
    }

    const result: SyncResult = {
      success: errors === 0,
      totalFetched,
      inserted,
      updated,
      skipped,
      errors,
      syncedAt,
    };

    if (errorDetails.length > 0) {
      result.errorDetails = errorDetails;
    }

    console.log(`[InventorySync] Sync complete:`, result);
    return res.status(200).json(result);

  } catch (error: any) {
    console.error('[InventorySync] Unexpected error:', error);
    return res.status(500).json({ 
      error: 'Inventory sync failed', 
      details: error.message 
    });
  }
};

export default withErrorHandler(withAuth(handler));