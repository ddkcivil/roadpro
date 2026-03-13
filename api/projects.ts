import type { VercelRequest, VercelResponse } from '@vercel/node';
import { connectToDatabase } from './_utils/dbConnect.js';
import { withErrorHandler } from './_utils/errorHandler.js';
import { withAuth } from './_utils/auth.js';
import { CSRFProtection } from './_utils/csrf.js';

const handler = async function (req: VercelRequest, res: VercelResponse) {
  const { id } = req.query;

  if (req.method === 'GET') {
    try {
      const { Project } = await connectToDatabase();
      
      if (id) {
        const project = await Project.findOne({ id: id as string });
        if (!project) return res.status(404).json({ error: 'Project not found' });
        return res.status(200).json(project);
      }

      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 50;
      const skip = (page - 1) * limit;

      const total = await Project.countDocuments();
      const projects = await Project.find().skip(skip).limit(limit); 
      
      return res.status(200).json({
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
      return res.status(500).json({ error: 'Failed to fetch projects', details: error.message });
    }
  } 
  
  if (req.method === 'POST') {
    const userRole = (req as any).user?.role;
    if (userRole !== 'Admin' && userRole !== 'ADMIN' && userRole !== 'Project Manager') {
      return res.status(403).json({ error: 'Only admins or project managers can create projects' });
    }

    try {
      const { Project } = await connectToDatabase();
      const projectData = { ...req.body };

      if (!projectData.name || !projectData.client) {
        return res.status(400).json({ error: 'Project name and client are required' });
      }

      delete projectData._id;
      delete projectData.__v;

      const project = new Project({
        ...projectData,
        id: projectData.id || `proj-${Date.now()}`,
        updatedAt: new Date().toISOString()
      });
      await project.save();

      return res.status(201).json(project);
    } catch (error: any) {
      console.error('Failed to create project:', error);
      return res.status(500).json({ error: 'Failed to create project', details: error.message });
    }
  }

  if (req.method === 'PUT') {
    const userRole = (req as any).user?.role;
    if (userRole !== 'Admin' && userRole !== 'ADMIN' && userRole !== 'Project Manager') {
      return res.status(403).json({ error: 'Only admins or project managers can update projects' });
    }

    if (!id || typeof id !== 'string') {
      return res.status(400).json({ error: 'Project ID is required' });
    }

    try {
      const { Project } = await connectToDatabase();
      const projectData = { ...req.body };
      
      if (!projectData.name || !projectData.client) {
        return res.status(400).json({ error: 'Project name and client are required' });
      }
      
      delete projectData._id;
      delete projectData.__v;
      
      const updatedProject = await Project.findOneAndUpdate(
        { id: id as string },
        { $set: { ...projectData, updatedAt: new Date().toISOString() } },
        { new: true, runValidators: true }
      );

      if (!updatedProject) return res.status(404).json({ error: 'Project not found' });
      return res.status(200).json(updatedProject);
    } catch (error: any) {
      console.error('Failed to update project:', error);
      return res.status(500).json({ error: 'Failed to update project', details: error.message });
    }
  }

  if (req.method === 'PATCH') {
    const { action } = req.query;
    
    if (action === 'update-location') {
      try {
        const { Project } = await connectToDatabase();
        const userId = (req as any).user?.userId;
        const userName = (req as any).user?.name || 'Staff';
        const userRole = (req as any).user?.role || 'Staff';
        const { latitude, longitude } = req.body;

        if (!id || typeof id !== 'string') {
          return res.status(400).json({ error: 'Project ID is required' });
        }

        if (latitude === undefined || longitude === undefined) {
          return res.status(400).json({ error: 'Coordinates are required' });
        }

        const project = await Project.findOne({ id: id as string });
        if (!project) return res.status(404).json({ error: 'Project not found' });

        const newStaffLoc = {
          id: `loc-${userId}`,
          userId,
          userName,
          role: userRole,
          latitude,
          longitude,
          status: 'Active',
          timestamp: new Date().toISOString()
        };

        const existingLocs = project.staffLocations || [];
        const otherLocs = existingLocs.filter((l: any) => l.userId !== userId);
        
        project.staffLocations = [...otherLocs, newStaffLoc];
        project.updatedAt = new Date().toISOString();
        await project.save();

        return res.status(200).json({ success: true, location: newStaffLoc });
      } catch (error: any) {
        console.error('Failed to update location:', error);
        return res.status(500).json({ error: 'Failed to update location', details: error.message });
      }
    }
  }

  if (req.method === 'DELETE') {
    const userRole = (req as any).user?.role;
    if (userRole !== 'Admin' && userRole !== 'ADMIN') {
      return res.status(403).json({ error: 'Only admins can delete projects' });
    }

    if (!id || typeof id !== 'string') {
      return res.status(400).json({ error: 'Project ID is required' });
    }

    try {
      const { Project } = await connectToDatabase();
      const deletedProject = await Project.findOneAndDelete({ id: id as string });
      if (!deletedProject) return res.status(404).json({ error: 'Project not found' });
      return res.status(204).end();
    } catch (error: any) {
      console.error('Failed to delete project:', error);
      return res.status(500).json({ error: 'Failed to delete project', details: error.message });
    }
  }

  return res.status(405).json({ error: 'Method Not Allowed' });
};

export default withErrorHandler(withAuth(CSRFProtection.withCSRF(handler)));
