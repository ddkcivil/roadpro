// api/projects/index.ts
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { connectToDatabase } from '../_utils/mysqlConnect.js'; // Changed import path
// No longer need mongoose

import { withErrorHandler } from '../_utils/errorHandler.js';

export default withErrorHandler(async function (req: VercelRequest, res: VercelResponse) {
  if (req.method === 'GET') {
    try {
      const { Project } = await connectToDatabase();
      const projects = await Project.findAll(); // Sequelize: findAll
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
      
      const project = await Project.create({ // Sequelize: create
        id: `proj-${Date.now()}`,
        ...projectData,
        // Sequelize manages createdAt and updatedAt automatically if timestamps: true
      });
      
      res.status(201).json(project);
    } catch (error: any) {
      console.error('Failed to create project:', error);
      res.status(500).json({ error: 'Failed to create project', details: error.message });
    }
  } else {
    res.status(405).json({ error: 'Method Not Allowed' });
  }
})
