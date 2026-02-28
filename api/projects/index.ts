// api/projects/index.ts
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { connectToDatabase } from '../_utils/dbConnect.js';
import { withErrorHandler } from '../_utils/errorHandler.js';
import { withAuth } from '../_utils/auth.js';
import { CSRFProtection } from '../_utils/csrf.js';

const handler = async function (req: VercelRequest, res: VercelResponse) {
  if (req.method === 'GET') {
    try {
      const { Project } = await connectToDatabase();
      
      // Pagination parameters
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 50;
      const skip = (page - 1) * limit;

      const total = await Project.countDocuments();
      const projects = await Project.find().skip(skip).limit(limit); 
      
      res.status(200).json({
        data: projects,
        pagination: {
          total,
          page,
          limit,
          totalPages: Math.ceil(total / limit)
        }
      });
    } catch (error: any) {
      console.error('Failed to fetch projects:', error);
      res.status(500).json({ error: 'Failed to fetch projects', details: error.message });
    }
  } else if (req.method === 'POST') {
    // Only admins or project managers can create projects
    const userRole = (req as any).user?.role;
    if (userRole !== 'Admin' && userRole !== 'ADMIN' && userRole !== 'Project Manager') {
      res.status(403).json({ error: 'Only admins or project managers can create projects' });
      return;
    }

    try {
      const { Project } = await connectToDatabase();
      const projectData = { ...req.body };

      if (!projectData.name || !projectData.client) {
        res.status(400).json({ error: 'Project name and client are required' });
        return;
      }

      delete projectData._id;
      delete projectData.__v;

      const project = new Project({
        ...projectData,
        id: projectData.id || `proj-${Date.now()}`,
        updatedAt: new Date().toISOString()
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
};

export default withErrorHandler(withAuth(CSRFProtection.withCSRF(handler)));
