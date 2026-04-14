import type { VercelRequest, VercelResponse } from '@vercel/node';
import { supabaseAdmin } from '../_utils/supabaseClient.js';
import { withErrorHandler } from '../_utils/errorHandler.js';
import { withAuth } from '../_utils/auth.js';

const handler = async function (req: VercelRequest, res: VercelResponse) {
  const { category, id: itemId } = req.query; // e.g., 'employees', 'leave-requests', 'attendance'

  if (req.method === 'GET') {
    try {
      // Fetch the staff-management project
      const { data: staffProject, error } = await supabaseAdmin
        .from('projects')
        .select('personnel')
        .eq('id', 'staff-management')
        .single();

      if (error && error.code !== 'PGRST116') throw error; // PGRST116 is 'no rows found'

      if (!staffProject) {
        // Initial state for staff management
        const initialPersonnel = {
            employees: [],
            'leave-requests': [],
            attendance: [],
            performance: [],
            salaries: [],
            training: [],
            evaluations: []
        };
        return res.status(200).json(category ? [] : initialPersonnel);
      }

      const personnel = staffProject.personnel || {};
      if (category && typeof category === 'string') {
        const data = personnel[category] || [];
        return res.status(200).json(data);
      } else {
        return res.status(200).json(personnel);
      }
    } catch (error: any) {
      console.error('Failed to fetch staff data:', error);
      throw error;
    }
  } 
  
  if (req.method === 'POST' || req.method === 'PUT') {
    try {
      if (!category || typeof category !== 'string') {
        return res.status(400).json({ error: 'Category is required' });
      }

      const itemData = req.body;

      // Fetch current state
      const { data: staffProject, error: fetchError } = await supabaseAdmin
        .from('projects')
        .select('personnel')
        .eq('id', 'staff-management')
        .single();

      if (fetchError && fetchError.code !== 'PGRST116') throw fetchError;

      const personnel = staffProject?.personnel || {
        employees: [],
        'leave-requests': [],
        attendance: [],
        performance: [],
        salaries: [],
        training: [],
        evaluations: []
      };

      const items = personnel[category] || [];

      if (req.method === 'POST') {
        items.push(itemData);
      } else if (req.method === 'PUT' && itemId) {
        const index = items.findIndex((item: any) => item.id === itemId);
        if (index !== -1) {
          items[index] = { ...items[index], ...itemData, "updatedAt": new Date().toISOString() };
        } else {
          return res.status(404).json({ error: 'Item not found' });
        }
      }

      personnel[category] = items;
      
      const { error: updateError } = await supabaseAdmin
        .from('projects')
        .upsert({
          id: 'staff-management',
          "name": 'Staff Management System',
          "client": 'Internal',
          personnel,
          "updatedAt": new Date().toISOString()
        });

      if (updateError) throw updateError;

      return res.status(200).json(itemData);
    } catch (error: any) {
      console.error('Failed to save staff data:', error);
      throw error;
    }
  } 
  
  if (req.method === 'DELETE') {
    try {
      if (!category || !itemId || typeof category !== 'string' || typeof itemId !== 'string') {
        return res.status(400).json({ error: 'Category and ID are required' });
      }

      const { data: staffProject, error: fetchError } = await supabaseAdmin
        .from('projects')
        .select('personnel')
        .eq('id', 'staff-management')
        .single();

      if (fetchError) throw fetchError;

      const personnel = staffProject.personnel || {};
      const items = personnel[category] || [];
      personnel[category] = items.filter((item: any) => item.id !== itemId);

      const { error: updateError } = await supabaseAdmin
        .from('projects')
        .update({ personnel, "updatedAt": new Date().toISOString() })
        .eq('id', 'staff-management');

      if (updateError) throw updateError;

      return res.status(204).end();
    } catch (error: any) {
      console.error('Failed to delete staff data:', error);
      throw error;
    }
  }

  return res.status(405).json({ error: 'Method Not Allowed' });
};

export default withErrorHandler(withAuth(handler));

