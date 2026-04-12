import type { VercelRequest, VercelResponse } from '@vercel/node';
import { supabaseAdmin } from './_utils/supabaseClient.js';
import { withErrorHandler } from './_utils/errorHandler.js';
import { withAuth } from './_utils/auth.js';
import { parseKML } from './_utils/kmlParser.js';
import { v4 as uuidv4 } from 'uuid';

const handler = async function (req: VercelRequest, res: VercelResponse) {
  const { action, projectId } = req.query;

  if (req.method === 'POST' && action === 'ingest') {
    if (!projectId || typeof projectId !== 'string') {
      return res.status(400).json({ error: 'Project ID is required' });
    }

    const { kmlContent, roadName } = req.body;

    if (!kmlContent || !roadName) {
      return res.status(400).json({ error: 'KML content and road name are required' });
    }

    console.log('[API/ROADS] Starting KML Ingestion...');
    const ingestStartTime = Date.now();

    try {
      // Step 1: Parsing KML
      console.log(`[API/ROADS] 1. Parsing KML... (size: ${kmlContent.length})`);
      const parseStartTime = Date.now();
      let roadData;
      try {
        roadData = await parseKML(kmlContent, roadName);
        console.log(`[API/ROADS] 1. KML parsed in ${Date.now() - parseStartTime}ms.`);
      } catch (parseError: any) {
        console.error(`[API/ROADS] === INGEST FAIL at step KML_PARSE ===`, parseError);
        return res.status(500).json({
          error: 'Ingestion failed',
          step: 'KML_PARSE',
          details: parseError.message,
          type: parseError.name
        });
      }
      
      // Step 2: Preparing road data with IDs
      console.log('[API/ROADS] 2. Preparing road data...');
      const prepareStartTime = Date.now();
      let roadWithId;
      try {
        roadWithId = {
          ...roadData,
          id: uuidv4() // Generate unique ID for the road
        };
        // Ensure alignments and structures have IDs
        roadWithId.alignments = (roadWithId.alignments || []).map((a: any) => ({ ...a, id: a.id || uuidv4() }));
        roadWithId.structures = (roadWithId.structures || []).map((s: any) => ({ ...s, id: s.id || uuidv4() }));
        
        // Limit data size for Supabase JSONB limits if necessary, though Supabase JSONB is quite large.
        // Keeping a rough check as a safeguard.
        if (JSON.stringify(roadWithId).length > 1e6) { // ~1MB rough limit
          console.warn('[API/ROADS] Road data may be large, consider potential limits.');
          // Truncation logic can be added here if needed, but Supabase JSONB is robust.
        }
        console.log(`[API/ROADS] 2. Road prepared in ${Date.now() - prepareStartTime}ms. Alignments: ${roadWithId.alignments.length}, Structures: ${roadWithId.structures.length}`);
      } catch (prepareError: any) {
        console.error(`[API/ROADS] === INGEST FAIL at step DATA_PREPARE ===`, prepareError);
        return res.status(500).json({
          error: 'Ingestion failed',
          step: 'DATA_PREPARE',
          details: prepareError.message,
          type: prepareError.name
        });
      }
      
      // Step 3: Update project with new road data in Supabase
      console.log(`[API/ROADS] 3. Updating project ${projectId} with new road data...`);
      const updateStartTime = Date.now();
      
      // Execute RPC to append road to the project's roads array
      const { error: rpcError } = await supabaseAdmin.rpc('append_road_to_project', {
        project_id: projectId,
        new_road_data: roadWithId
      });

      if (rpcError) throw rpcError;

      // Update updatedAt timestamp
      const { data: updatedProject, error: updateError } = await supabaseAdmin
        .from('projects')
        .update({
          updatedAt: new Date().toISOString()
        })
        .eq('id', projectId)
        .select('id, roads')
        .single();

      if (updateError) throw updateError;
      
      if (!updatedProject) {
          console.error('[API/ROADS] Project not found or update failed after upsert.');
          return res.status(404).json({ error: 'Project not found or update failed.' });
      }

      console.log(`[API/ROADS] 3. Project updated in ${Date.now() - updateStartTime}ms. Road ID: ${roadWithId.id}`);
      console.log(`[API/ROADS] === INGEST SUCCESS in ${Date.now() - ingestStartTime}ms ===`);

      return res.status(200).json({
        success: true,
        roadId: roadWithId.id,
        projectName: updatedProject.id, // Assuming 'id' is the project identifier
      });
    } catch (error: any) { // Catch-all for unexpected errors
      console.error(`[API/ROADS] === UNEXPECTED INGEST FAIL ===`, error);
      return res.status(500).json({ 
        error: 'Ingestion failed due to an unexpected error',
        details: error.message,
        type: error.name
      });
    }
  }

  return res.status(405).json({ error: 'Method Not Allowed' });
};

export default withErrorHandler(withAuth(handler));
