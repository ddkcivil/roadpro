import type { VercelRequest, VercelResponse } from '@vercel/node';
import { connectToDatabase } from '../_utils/dbConnect.js';
import { withErrorHandler } from '../_utils/errorHandler.js';
import { withAuth } from '../_utils/auth.js';

const handler = async function (req: VercelRequest, res: VercelResponse) {
  const { category } = req.query; // e.g., 'employees', 'leave-requests', 'attendance'

  if (req.method === 'GET') {
    try {
      const { Project } = await connectToDatabase();
      // For now, we store staff data in a special "System" project or as global personnel
      // To keep it simple and consistent with existing schema, we'll use a project with id 'staff-management'
      let staffProject = await Project.findOne({ id: 'staff-management' });

      if (!staffProject) {
        // Create it if it doesn't exist
        staffProject = await Project.create({
          id: 'staff-management',
          name: 'Staff Management System',
          client: 'Internal',
          personnel: {
            employees: [],
            'leave-requests': [],
            attendance: [],
            performance: [],
            salaries: [],
            training: [],
            evaluations: []
          }
        });
      }

      if (category && typeof category === 'string') {
        const data = staffProject.personnel?.[category] || [];
        res.status(200).json(data);
      } else {
        res.status(200).json(staffProject.personnel || {});
      }
    } catch (error: any) {
      console.error('Failed to fetch staff data:', error);
      res.status(500).json({ error: 'Failed to fetch staff data', details: error.message });
    }
  } else if (req.method === 'POST' || req.method === 'PUT') {
    try {
      const { Project } = await connectToDatabase();
      const { category, id: itemId } = req.query;
      const itemData = req.body;

      if (!category || typeof category !== 'string') {
        res.status(400).json({ error: 'Category is required' });
        return;
      }

      let staffProject = await Project.findOne({ id: 'staff-management' });
      if (!staffProject) {
        staffProject = await Project.create({
          id: 'staff-management',
          name: 'Staff Management System',
          client: 'Internal',
          personnel: {
            employees: [],
            'leave-requests': [],
            attendance: [],
            performance: [],
            salaries: [],
            training: [],
            evaluations: []
          }
        });
      }

      const personnel = staffProject.personnel || {};
      const items = personnel[category] || [];

      if (req.method === 'POST') {
        // Add new item
        items.push(itemData);
      } else if (req.method === 'PUT' && itemId) {
        // Update existing item
        const index = items.findIndex((item: any) => item.id === itemId);
        if (index !== -1) {
          items[index] = { ...items[index], ...itemData, updatedAt: new Date().toISOString() };
        } else {
          res.status(404).json({ error: 'Item not found' });
          return;
        }
      }

      personnel[category] = items;
      
      await Project.findOneAndUpdate(
        { id: 'staff-management' },
        { $set: { personnel, updatedAt: new Date().toISOString() } }
      );

      res.status(200).json(itemData);
    } catch (error: any) {
      console.error('Failed to save staff data:', error);
      res.status(500).json({ error: 'Failed to save staff data', details: error.message });
    }
  } else if (req.method === 'DELETE') {
    try {
      const { Project } = await connectToDatabase();
      const { category, id: itemId } = req.query;

      if (!category || !itemId || typeof category !== 'string' || typeof itemId !== 'string') {
        res.status(400).json({ error: 'Category and ID are required' });
        return;
      }

      const staffProject = await Project.findOne({ id: 'staff-management' });
      if (!staffProject) {
        res.status(404).json({ error: 'Staff management project not found' });
        return;
      }

      const personnel = staffProject.personnel || {};
      const items = personnel[category] || [];
      const filteredItems = items.filter((item: any) => item.id !== itemId);

      personnel[category] = filteredItems;

      await Project.findOneAndUpdate(
        { id: 'staff-management' },
        { $set: { personnel, updatedAt: new Date().toISOString() } }
      );

      res.status(204).end();
    } catch (error: any) {
      console.error('Failed to delete staff data:', error);
      res.status(500).json({ error: 'Failed to delete staff data', details: error.message });
    }
  } else {
    res.status(405).json({ error: 'Method Not Allowed' });
  }
};

export default withErrorHandler(withAuth(handler));
