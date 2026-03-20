import type { VercelRequest, VercelResponse } from '@vercel/node';
import { connectToDatabase } from './_utils/dbConnect.js';
import { withErrorHandler } from './_utils/errorHandler.js';
import { withAuth } from './_utils/auth.js';
import { CSRFProtection } from './_utils/csrf.js';
import { parseKML } from '../services/kmlParser.js';
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

    try {
      console.log(`[API] Starting KML Ingestion for project: ${projectId}, road: ${roadName}`);
      const { Project } = await connectToDatabase();
      
      // Parse KML securely on backend
      const roadData = await parseKML(kmlContent, roadName);
      
      const project = await Project.findOne({ id: projectId });
      if (!project) {
        console.error(`[API] Project not found: ${projectId}`);
        return res.status(404).json({ error: 'Project not found' });
      }

      // Add unique IDs to the road and its components if not present
      const roadWithId = {
        ...roadData,
        id: uuidv4()
      };

      // Ensure components have IDs too (some might be missing if parser fallback was used)
      roadWithId.alignments = roadWithId.alignments.map((a: any) => ({ ...a, id: a.id || uuidv4() }));
      roadWithId.structures = roadWithId.structures.map((s: any) => ({ ...s, id: s.id || uuidv4() }));

      const existingRoads = project.roads || [];
      project.roads = [...existingRoads, roadWithId];
      project.markModified('roads'); // Critical for Schema.Types.Mixed
      project.updatedAt = new Date().toISOString();
      
      await project.save();
      console.log(`[API] Successfully ingested road: ${roadWithId.id}`);

      return res.status(200).json({
        success: true,
        road: roadWithId
      });
    } catch (error: any) {
      console.error('[API] KML Ingestion failed:', error);
      return res.status(500).json({ 
        error: 'Ingestion failed', 
        details: error.message,
        stack: process.env.NODE_ENV === 'development' ? error.stack : undefined 
      });
    }
  }

  return res.status(405).json({ error: 'Method Not Allowed' });
};

export default withErrorHandler(withAuth(CSRFProtection.withCSRF(handler)));
