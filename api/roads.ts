import type { VercelRequest, VercelResponse } from '@vercel/node';
import { connectToDatabase } from './_utils/dbConnect.js';
import { withErrorHandler } from './_utils/errorHandler.js';
import { withAuth } from './_utils/auth.js';
import { CSRFProtection } from './_utils/csrf.js';
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

    // Declare variables used across steps outside the try blocks
    let Project: any; // Type may need to be refined if schema is known
    let project: any;
    let roadData: any;
    let roadWithId: any;
    let updatedProject: any;

    try {
      // Step 1: Connecting DB
      console.log('[API/ROADS] 1. Connecting DB...');
      const startConnect = Date.now();
      try {
        const dbResult = await connectToDatabase();
        Project = dbResult.Project;
        console.log(`[API/ROADS] 1. DB connected in ${Date.now() - startConnect}ms`);
      } catch (dbError: any) {
        console.error(`[API/ROADS] === INGEST FAIL at step DB_CONNECT ===`, dbError);
        return res.status(500).json({
          error: 'Ingestion failed',
          step: 'DB_CONNECT',
          details: dbError.message,
          type: dbError.name
        });
      }
      
      // Step 2: Parsing KML
      console.log(`[API/ROADS] 2. Parsing KML... (size: ${kmlContent.length})`);
      const startParse = Date.now();
      try {
        roadData = await parseKML(kmlContent, roadName);
        console.log(`[API/ROADS] 2. KML parsed in ${Date.now() - startParse}ms. Road data size: ${JSON.stringify(roadData).length} chars`);
      } catch (parseError: any) {
        console.error(`[API/ROADS] === INGEST FAIL at step KML_PARSE ===`, parseError);
        return res.status(500).json({
          error: 'Ingestion failed',
          step: 'KML_PARSE',
          details: parseError.message,
          type: parseError.name
        });
      }
      
      // Step 3: Finding project
      console.log(`[API/ROADS] 3. Finding project: ${projectId}`);
      const startFind = Date.now();
      try {
        project = await Project.findOne({ id: projectId });
        console.log(`[API/ROADS] 3. Project query in ${Date.now() - startFind}ms. Found: ${!!project}`);
        if (!project) {
          console.error(`[API/ROADS] Project NOT found: ${projectId}`);
          return res.status(404).json({ error: 'Project not found' });
        }
      } catch (findError: any) {
        console.error(`[API/ROADS] === INGEST FAIL at step PROJECT_FIND ===`, findError);
        return res.status(500).json({
          error: 'Ingestion failed',
          step: 'PROJECT_FIND',
          details: findError.message,
          type: findError.name
        });
      }

      // Step 4: Preparing road data
      console.log('[API/ROADS] 4. Preparing road data...');
      const startPrepare = Date.now();
      try {
        roadWithId = {
          ...roadData,
          id: uuidv4()
        };
        roadWithId.alignments = (roadWithId.alignments || []).map((a: any) => ({ ...a, id: a.id || uuidv4() }));
        roadWithId.structures = (roadWithId.structures || []).map((s: any) => ({ ...s, id: s.id || uuidv4() }));
        
        // Limit data size for MongoDB doc limit (16MB)
        if (JSON.stringify(roadWithId).length > 1e6) { // 1MB rough limit
          console.warn('[API/ROADS] Road data too large, truncating alignments/structures');
          roadWithId.alignments = roadWithId.alignments.slice(0, 100);
          roadWithId.structures = roadWithId.structures.slice(0, 50);
        }
        
        console.log(`[API/ROADS] 4. Road prepared in ${Date.now() - startPrepare}ms. Alignments: ${roadWithId.alignments.length}, Structures: ${roadWithId.structures.length}, size: ${JSON.stringify(roadWithId).length} chars`);
      } catch (prepareError: any) {
        console.error(`[API/ROADS] === INGEST FAIL at step DATA_PREPARE ===`, prepareError);
        return res.status(500).json({
          error: 'Ingestion failed',
          step: 'DATA_PREPARE',
          details: prepareError.message,
          type: prepareError.name
        });
      }
      
      // Step 5: Atomic $push update
      console.log('[API/ROADS] 5. Atomic $push update...');
      const startUpdate = Date.now();
      try {
        updatedProject = await Project.findOneAndUpdate(
          { id: projectId },
          { 
            $push: { roads: roadWithId },
            $set: { updatedAt: new Date().toISOString() }
          },
          { new: true }
        );
        console.log(`[API/ROADS] 5. Update complete in ${Date.now() - startUpdate}ms. Updated roads count: ${updatedProject?.roads?.length || 'unknown'}. Road ID: ${roadWithId.id}`);
        console.log(`[API/ROADS] === INGEST SUCCESS ===`);

        return res.status(200).json({
          success: true,
          road: roadWithId
        });
      } catch (updateError: any) {
        console.error(`[API/ROADS] === INGEST FAIL at step DB_UPDATE ===`, updateError);
        return res.status(500).json({
          error: 'Ingestion failed',
          step: 'DB_UPDATE',
          details: updateError.message,
          type: updateError.name
        });
      }
    } catch (error: any) { // This catch is for any unexpected errors not caught by granular blocks
      console.error(`[API/ROADS] === UNEXPECTED INGEST FAIL ===`, error);
      console.error('Full error:', {
        message: error.message,
        name: error.name,
        stack: error.stack?.split('\n').slice(0, 10).join('\n')
      });
      return res.status(500).json({ 
        error: 'Ingestion failed due to an unexpected error',
        step: 'UNEXPECTED',
        details: error.message,
        type: error.name
      });
    }
  }

  return res.status(405).json({ error: 'Method Not Allowed' });
};

export default withErrorHandler(withAuth(CSRFProtection.withCSRF(handler)));
