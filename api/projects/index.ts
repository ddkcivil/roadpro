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
      const projectData = req.body;

      if (!projectData.name) {
        res.status(400).json({ error: 'Project name is required' });
      }

      const project = new Project({ // Mongoose: new and save
        id: `proj-${Date.now()}`,
        ...projectData
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
