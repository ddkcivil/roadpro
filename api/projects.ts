import type { VercelRequest, VercelResponse } from '@vercel/node';
import { supabaseAdmin } from './utils/supabaseClient.js';
import { withErrorHandler } from './utils/errorHandler.js';
import { withAuth } from './utils/auth.js';
import { mapProjectFromDb, mapProjectToDb } from './utils/mappers.js';
// Removed CSRFProtection as it might not be needed with Supabase auth, or needs re-evaluation.
// Removed connectToDatabase as we use supabaseAdmin directly.

const handler = async function (req: VercelRequest, res: VercelResponse) {
  const { id } = req.query;
  
  // Supabase client is already initialized in utils/supabaseClient.js

  if (req.method === 'GET') {
    try {
      if (id) {
        // Fetch a single project by ID
        const { data: project, error } = await supabaseAdmin
          .from('projects')
          .select('*')
          .eq('id', id as string)
          .single();

        if (error) throw error;
        if (!project) return res.status(404).json({ error: 'Project not found' });

        // Fetch associated documents and photos manually to avoid relationship cache issues
        const [docsRes, photosRes] = await Promise.all([
          supabaseAdmin.from('project_documents').select('*').eq('project_id', id as string),
          supabaseAdmin.from('project_site_photos').select('*').eq('project_id', id as string)
        ]);

        const projectWithData = {
          ...project,
          project_documents: docsRes.data || [],
          project_site_photos: photosRes.data || []
        };

        return res.status(200).json(mapProjectFromDb(projectWithData));
      }

      // Fetch paginated list of projects
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 50;
      const skip = (page - 1) * limit;

      // Fetch total count
      const { count: total, error: countError } = await supabaseAdmin
        .from('projects')
        .select('*', { count: 'exact', head: true });
      
      if (countError) throw countError;

      const { data: projects, error: fetchError } = await supabaseAdmin
        .from('projects')
        .select('*')
        .range(skip, skip + limit - 1)
        .order('created_at', { ascending: false });

      if (fetchError) throw fetchError;

      if (projects && projects.length > 0) {
        const projectIds = projects.map(p => p.id);
        
        // Fetch docs and photos for all projects in the list
        const [docsRes, photosRes] = await Promise.all([
          supabaseAdmin.from('project_documents').select('*').in('project_id', projectIds),
          supabaseAdmin.from('project_site_photos').select('*').in('project_id', projectIds)
        ]);

        const docsMap: Record<string, any[]> = {};
        const photosMap: Record<string, any[]> = {};

        (docsRes.data || []).forEach(d => {
          if (!docsMap[d.project_id]) docsMap[d.project_id] = [];
          docsMap[d.project_id].push(d);
        });

        (photosRes.data || []).forEach(p => {
          if (!photosMap[p.project_id]) photosMap[p.project_id] = [];
          photosMap[p.project_id].push(p);
        });

        projects.forEach(p => {
          p.project_documents = docsMap[p.id] || [];
          p.project_site_photos = photosMap[p.id] || [];
        });
      }
      
      return res.status(200).json({
        data: (projects || []).map(mapProjectFromDb),
        pagination: {
          total: total || 0,
          page,
          limit,
          totalPages: Math.ceil((total || 0) / limit)
        }
      });
    } catch (error: any) {
      console.error('Failed to fetch projects:', error);
      return res.status(500).json({ error: 'Failed to fetch projects', details: error.message });
    }
  } 
  
  if (req.method === 'POST') {
    const userRole = (req as any).user?.role;
    const r = userRole?.toUpperCase();
    const isProjectAuth = r === 'ADMIN' || r === 'PROJECT MANAGER' || r === 'MANAGER' || r === 'PROJECT_MANAGER' || r === 'ADMIN' || r === 'MANAGER';
    if (!isProjectAuth) {
      return res.status(403).json({ error: 'Only admins or project managers can create projects' });
    }

    try {
      const projectData = { ...req.body };

      if (!projectData.name || !projectData.client) {
        return res.status(400).json({ error: 'Project name and client are required' });
      }

      // Remove MongoDB specific fields if any are accidentally passed
      delete projectData._id;
      delete projectData.__v;

      const projectId = projectData.id || `proj-${Date.now()}`; // Fallback ID generator, consider uuidv4 if needed

      const userId = (req as any).user?.userId;
      const { data: newProject, error } = await supabaseAdmin
        .from('projects')
        .insert(mapProjectToDb({
          ...projectData,
          id: projectId,
          ownerId: userId,
          updatedAt: new Date().toISOString()
        }))
        .select('*') // Return the inserted row without joins to avoid schema cache errors
        .single(); // Expect a single row

      if (error) throw error;

      return res.status(201).json(mapProjectFromDb(newProject));
    } catch (error: any) {
      console.error('Failed to create project:', error);
      return res.status(500).json({ error: 'Failed to create project', details: error.message });
    }
  } 
  if (req.method === 'PUT') {
    const userRole = (req as any).user?.role;
    const r = userRole?.toUpperCase();
    const isProjectAuth = r === 'ADMIN' || r === 'PROJECT MANAGER' || r === 'MANAGER' || r === 'PROJECT_MANAGER' || r === 'SITE_ENGINEER';
    if (!isProjectAuth) {
      return res.status(403).json({ error: 'Only authorized personnel can update projects' });
    }

    if (!id || typeof id !== 'string') {
      return res.status(400).json({ error: 'Project ID is required' });
    }

    try {
      const projectData = { ...req.body };

      // Remove MongoDB specific fields if any are accidentally passed
      delete projectData._id;
      delete projectData.__v;

      // Supabase update operation
      const { data: updatedProject, error } = await supabaseAdmin
        .from('projects')
        .update(mapProjectToDb({
          ...projectData,
          updatedAt: new Date().toISOString() // Ensure updated_at is updated
        }))
        .eq('id', id as string)
        .select('*') // Return the updated row without joins
        .single(); // Expect a single row

      if (error) throw error;
      if (!updatedProject) return res.status(404).json({ error: 'Project not found' });

      return res.status(200).json(mapProjectFromDb(updatedProject));
    } catch (error: any) {
      console.error('Failed to update project:', error);
      return res.status(500).json({ error: 'Failed to update project', details: error.message });
    }
  } 
  if (req.method === 'PATCH') {
    const { action } = req.query;
    
    if (action === 'update-location') {
      // Refactor location update for Supabase
      const userRole = (req as any).user?.role;
      // Assuming a staffLocations table exists and manages user locations per project
      // Role check might need adjustment based on Supabase auth setup
      const r = userRole?.toUpperCase();
      const isAuthorized = r === 'ADMIN' || r === 'PROJECT MANAGER' || r === 'MANAGER' || r === 'PROJECT_MANAGER' || r === 'STAFF';
      if (!isAuthorized) {
        return res.status(403).json({ error: 'Only authorized personnel can update locations' });
      }

      const { latitude, longitude } = req.body;

      if (!id || typeof id !== 'string') {
        return res.status(400).json({ error: 'Project ID is required for location update' });
      }

      if (latitude === undefined || longitude === undefined) {
        return res.status(400).json({ error: 'Coordinates (latitude and longitude) are required' });
      }

      const userId = (req as any).user?.userId;
      const userName = (req as any).user?.name || 'Staff';
      const userRoleForLoc = (req as any).user?.role || 'Staff'; // Use role for location update

      if (!userId) {
          return res.status(401).json({ error: 'User ID not found in authentication token.' });
      }

      try {
        const timestamp = new Date().toISOString();

        // Upsert location data into the staff_locations table
        const { error } = await supabaseAdmin
          .from('staff_locations') 
          .upsert([ // Use upsert to either insert or update
            {
              project_id: id as string,
              user_id: userId,
              latitude: latitude,
              longitude: longitude,
              timestamp: timestamp,
              status: 'Active', // Assuming a status field
              // userName and role might be redundant if managed by user profiles, but can be stored for quick access
              user_name: userName, 
              user_role: userRoleForLoc
            }
          ], { onConflict: 'project_id, user_id' }); // Define unique constraint for upsert

        if (error) throw error;

        // Update the project's updatedAt timestamp if needed, or just return success
        // For now, assume location update is a separate concern from project update timestamp
        return res.status(200).json({ success: true, message: 'Location updated successfully' });

      } catch (error: any) {
        console.error('Failed to update location:', error);
        return res.status(500).json({ error: 'Failed to update location', details: error.message });
      }
    }

    // Default PATCH for granular field updates on 'projects' table
    const userRole = (req as any).user?.role;
    const r = userRole?.toUpperCase();
    const isProjectAuth = r === 'ADMIN' || r === 'PROJECT MANAGER' || r === 'MANAGER' || r === 'PROJECT_MANAGER' || r === 'SITE_ENGINEER';
    if (!isProjectAuth) {
      return res.status(403).json({ error: 'Only authorized personnel can update projects' });
    }

    if (!id || typeof id !== 'string') {
      return res.status(400).json({ error: 'Project ID is required' });
    }

    try {
      const patchData = { ...req.body };
      
      // Prevent overwriting ID or other system fields
      delete patchData.id;
      delete patchData._id;
      delete patchData.__v;
      delete patchData.created_at;
      delete patchData.updated_at; // Let Supabase handle updated_at if it has a trigger, or set it here

      // Supabase update operation for general project fields
      const { data: updatedProject, error } = await supabaseAdmin
        .from('projects')
        .update(mapProjectToDb({
          ...patchData,
          updatedAt: new Date().toISOString() // Explicitly set updated_at
        }))
        .eq('id', id as string)
        .select('*')
        .single();

      if (error) throw error;
      if (!updatedProject) return res.status(404).json({ error: 'Project not found' });
      
      return res.status(200).json(mapProjectFromDb(updatedProject));
    } catch (error: any) {
      console.error('Failed to patch project:', error);
      return res.status(500).json({ error: 'Failed to patch project', details: error.message });
    }
  }
  
  if (req.method === 'DELETE') {
    const userRole = (req as any).user?.role;
    if (userRole?.toUpperCase() !== 'ADMIN') {
      return res.status(403).json({ error: 'Only admins can delete projects' });
    }

    if (!id || typeof id !== 'string') {
      return res.status(400).json({ error: 'Project ID is required' });
    }

    try {
      // --- Supabase Integration ---
      const { error: deleteError } = await supabaseAdmin
        .from('projects')
        .delete()
        .eq('id', id as string);

      if (deleteError) throw deleteError;

      // If deletion from Supabase is successful
      // Audit log might need to be adjusted if it was tied to MongoDB
      // For now, assuming it's abstract enough or handled elsewhere.
      // If AuditService.logDataModification needs to be called here, it would be similar to saveProject/deleteProject

      return res.status(204).end();
    } catch (error: any) {
      console.error('Failed to delete project:', error);
      return res.status(500).json({ error: 'Failed to delete project', details: error.message });
    }
  }

  return res.status(405).json({ error: 'Method Not Allowed' });
};

export default withErrorHandler(withAuth(handler));

