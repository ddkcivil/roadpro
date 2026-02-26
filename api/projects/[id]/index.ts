// api/projects/[id]/index.ts
import type { VercelRequest, VercelResponse } from '@vercel/node';

import { connectToDatabase } from '../../_utils/dbConnect.js';
import { withErrorHandler } from '../../_utils/errorHandler.js';

export default withErrorHandler(async function (req: VercelRequest, res: VercelResponse) {
  const { id } = req.query;

  if (!id || typeof id !== 'string') {
    res.status(400).json({ error: 'Project ID is required' });
  }

  if (req.method === 'GET') {
    try {
      const { Project } = await connectToDatabase();
      const project = await Project.findOne({ id: id as string });

      if (!project) {
        return res.status(404).json({ error: 'Project not found' });
      }

      res.status(200).json(project);
    } catch (error: any) {
      console.error('Failed to fetch project:', error);
      res.status(500).json({ error: 'Failed to fetch project', details: error.message });
    }
  } else if (req.method === 'PUT') {
    try {
      const { Project } = await connectToDatabase();
      const projectData = { ...req.body };
      
      if (!projectData.name || !projectData.client) {
        return res.status(400).json({ error: 'Project name and client are required for updates' });
      }
      
      // MongoDB does not allow updating the immutable _id field
      delete projectData._id;
      delete projectData.__v;
      
      const updatedProject = await Project.findOneAndUpdate(
        { id: id as string },
        { $set: projectData },
        { new: true, runValidators: true }
      );

      if (!updatedProject) {
        return res.status(404).json({ error: 'Project not found' });
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
    try {
      const { Project } = await connectToDatabase();
      const deletedProject = await Project.findOneAndDelete({ id: id as string });
      
      if (!deletedProject) {
        return res.status(404).json({ error: 'Project not found' });
      }
      
      res.status(204).send(''); // 204 No Content for successful deletion
    } catch (error: any) {
      console.error('Failed to delete project:', error);
      res.status(500).json({ error: 'Failed to delete project', details: error.message });
    }
  } else {
    res.status(405).json({ error: 'Method Not Allowed' });
  }
})
