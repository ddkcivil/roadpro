// api/projects/[id]/index.ts
import type { VercelRequest, VercelResponse } from '@vercel/node';

import { connectToDatabase } from '../../_utils/dbConnect.js';
import { withErrorHandler } from '../../_utils/errorHandler.js';
import { withAuth } from '../../_utils/auth.js';

const handler = async function (req: VercelRequest, res: VercelResponse) {
  const { id } = req.query;

  if (!id || typeof id !== 'string') {
    res.status(400).json({ error: 'Project ID is required' });
    return;
  }

  if (req.method === 'GET') {
    try {
      const { Project } = await connectToDatabase();
      const project = await Project.findOne({ id: id as string });

      if (!project) {
        res.status(404).json({ error: 'Project not found' });
        return;
      }

      res.status(200).json(project);
    } catch (error: any) {
      console.error('Failed to fetch project:', error);
      res.status(500).json({ error: 'Failed to fetch project', details: error.message });
    }
  } else if (req.method === 'PUT') {
    // Only admins or project managers can update projects
    const userRole = (req as any).user?.role;
    if (userRole !== 'Admin' && userRole !== 'ADMIN' && userRole !== 'Project Manager') {
      res.status(403).json({ error: 'Only admins or project managers can update projects' });
      return;
    }

    try {
      const { Project } = await connectToDatabase();
      const projectData = { ...req.body };
      
      if (!projectData.name || !projectData.client) {
        res.status(400).json({ error: 'Project name and client are required for updates' });
        return;
      }
      
      // MongoDB does not allow updating the immutable _id field
      delete projectData._id;
      delete projectData.__v;
      
      const updatedProject = await Project.findOneAndUpdate(
        { id: id as string },
        { $set: { ...projectData, updatedAt: new Date().toISOString() } },
        { new: true, runValidators: true }
      );

      if (!updatedProject) {
        res.status(404).json({ error: 'Project not found' });
        return;
      }
      
      res.status(200).json(updatedProject);
    } catch (error: any) {
      console.error('Failed to update project. Error:', error);
      res.status(500).json({ 
        error: 'Failed to update project', 
        details: error.message,
        stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
      });
    }
  } else if (req.method === 'DELETE') {
    // Only admins can delete projects
    const userRole = (req as any).user?.role;
    if (userRole !== 'Admin' && userRole !== 'ADMIN') {
      res.status(403).json({ error: 'Only admins can delete projects' });
      return;
    }

    try {
      const { Project } = await connectToDatabase();
      console.log(`[DEBUG] Attempting to delete project with custom id: ${id}`);
      
      const deletedProject = await Project.findOneAndDelete({ id: id as string });
      
      if (!deletedProject) {
        console.log(`[DEBUG] Project not found for deletion: ${id}`);
        res.status(404).json({ error: 'Project not found' });
        return;
      }
      
      console.log(`[DEBUG] Successfully deleted project: ${id}`);
      res.status(204).end(); // Use .end() for 204 No Content
      return;
    } catch (error: any) {
      console.error('Failed to delete project. Error:', error);
      res.status(500).json({ error: 'Failed to delete project', details: error.message });
      return;
    }
  } else {
    res.status(405).json({ error: 'Method Not Allowed' });
  }
};

export default withErrorHandler(withAuth(handler));
