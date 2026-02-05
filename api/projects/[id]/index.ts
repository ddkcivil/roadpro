// api/projects/[id]/index.ts
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { connectToDatabase } from '../../_utils/dbConnect';
import mongoose from 'mongoose';

export default async function (req: VercelRequest, res: VercelResponse) {
  const { id } = req.query;

  if (!id || typeof id !== 'string') {
    return res.status(400).json({ error: 'Project ID is required' });
  }

  if (req.method === 'GET') {
    try {
      const { Project } = await connectToDatabase();
      const project = await Project.findById(id);

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
      const projectData = req.body;
      
      const project = await Project.findByIdAndUpdate(
        id,
        { ...projectData, updatedAt: new Date() },
        { new: true } // Return the updated document
      );
      
      if (!project) {
        return res.status(404).json({ error: 'Project not found' });
      }
      
      res.status(200).json(project);
    } catch (error: any) {
      console.error('Failed to update project:', error);
      res.status(500).json({ error: 'Failed to update project', details: error.message });
    }
  } else if (req.method === 'DELETE') {
    try {
      const { Project } = await connectToDatabase();
      const project = await Project.findByIdAndDelete(id);
      
      if (!project) {
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
}
