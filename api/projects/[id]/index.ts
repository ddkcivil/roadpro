// api/projects/[id]/index.ts
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { connectToDatabase } from '../../_utils/mysqlConnect.js'; // Changed import path
// No longer need mongoose

import { withErrorHandler } from '../../_utils/errorHandler.js'; // Adjust path as needed

export default withErrorHandler(async function (req: VercelRequest, res: VercelResponse) {
  const { id } = req.query;

  if (!id || typeof id !== 'string') {
    res.status(400).json({ error: 'Project ID is required' });
  }

  if (req.method === 'GET') {
    try {
      const { Project } = await connectToDatabase();
      const project = await Project.findByPk(id as string); // Sequelize: findByPk

      if (!project) {
        res.status(404).json({ error: 'Project not found' });
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
      
      // Sequelize: update method returns [affectedCount, affectedRows]
      const [affectedCount] = await Project.update(
        { ...projectData }, // Exclude ID from update object
        { where: { id: id } }
      );

      if (affectedCount === 0) {
        res.status(404).json({ error: 'Project not found or no changes made' });
      }

      // Fetch the updated project to return it
      const updatedProject = await Project.findByPk(id as string);
      
      res.status(200).json(updatedProject);
    } catch (error: any) {
      console.error('Failed to update project:', error);
      res.status(500).json({ error: 'Failed to update project', details: error.message });
    }
  } else if (req.method === 'DELETE') {
    try {
      const { Project } = await connectToDatabase();
      // Sequelize: destroy method returns the number of deleted rows
      const deletedRowCount = await Project.destroy({
        where: { id: id as string }
      });
      
      if (deletedRowCount === 0) {
        res.status(404).json({ error: 'Project not found' });
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
