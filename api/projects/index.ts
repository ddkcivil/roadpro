// api/projects/index.ts
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { connectToDatabase } from '../_utils/dbConnect.js';

import { withErrorHandler } from '../_utils/errorHandler.js';

export default withErrorHandler(async function (req: VercelRequest, res: VercelResponse) {
  if (req.method === 'GET') {
    try {
      const { Project } = await connectToDatabase();
      const projects = await Project.find(); // Mongoose: find
      res.status(200).json(projects);
    } catch (error: any) {
      console.error('Failed to fetch projects:', error);
      res.status(500).json({ error: 'Failed to fetch projects', details: error.message });
    }
  } else if (req.method === 'POST') {
    try {
      const { Project } = await connectToDatabase();
      const projectData = { ...req.body };

      if (!projectData.name || !projectData.client) {
        return res.status(400).json({ error: 'Project name and client are required' });
      }

      // Ensure we don't save with an existing ID if provided in body for some reason
      delete projectData._id;
      delete projectData.__v;

      const project = new Project({
        ...projectData,
        id: projectData.id || `proj-${Date.now()}` // Generate ID if not provided
      });
      await project.save();

      res.status(201).json(project);
    } catch (error: any) {
      console.error('Failed to create project:', error);
      res.status(500).json({ error: 'Failed to create project', details: error.message });
    }
  } else {
    res.status(405).json({ error: 'Method Not Allowed' });
  }
})
