import type { VercelRequest, VercelResponse } from '@vercel/node';
import { getSupabaseAdmin, isSupabaseConfigured } from './utils/supabaseClient.js';
import { withErrorHandler } from './utils/errorHandler.js';
import { withAuth } from './utils/auth.js';
import { mapProjectDocumentToDb, mapProjectFromDb, mapProjectToDb } from './utils/mappers.js';
import { v4 as randomUUID } from 'uuid'; // Import randomUUID for generating unique IDs

// Default shared bucket for backward compatibility
const DEFAULT_BUCKET_NAME = process.env.SUPABASE_STORAGE_BUCKET || 'project-files';

/**
 * Creates a dedicated storage bucket for a project
 * @param supabaseAdmin - The Supabase admin client
 * @param projectId - The project ID
 * @returns The name of the created bucket
 */
async function createProjectBucket(supabaseAdmin: any, projectId: string): Promise<string> {
  const bucketName = `project-${projectId}`;

  try {
    // Check if bucket already exists
    const { data: buckets } = await supabaseAdmin.storage.listBuckets();
    const bucketExists = buckets?.some((b: any) => b.name === bucketName);

    if (!bucketExists) {
      const { error: createError } = await supabaseAdmin.storage.createBucket(bucketName, {
        public: true,
        fileSizeLimit: 52428800, // 50MB
      });

      if (createError && !createError.message?.includes('already exists')) {
        console.warn(`Failed to create bucket ${bucketName}: ${createError.message}`);
        return DEFAULT_BUCKET_NAME; // Fallback to default bucket
      }
    }

    return bucketName;
  } catch (error: any) {
    console.warn(`Error creating bucket ${bucketName}: ${error.message}`);
    return DEFAULT_BUCKET_NAME;
  }
}

/**
 * Deletes a project's storage bucket
 * @param supabaseAdmin - The Supabase admin client
 * @param projectId - The project ID
 */
async function deleteProjectBucket(supabaseAdmin: any, projectId: string): Promise<void> {
  const bucketName = `project-${projectId}`;

  try {
    // Check if bucket exists before attempting to delete
    const { data: buckets } = await supabaseAdmin.storage.listBuckets();
    const bucketExists = buckets?.some((b: any) => b.name === bucketName);

    if (bucketExists) {
      const { error: deleteError } = await supabaseAdmin.storage.deleteBucket(bucketName);
      if (deleteError) {
        console.warn(`Failed to delete bucket ${bucketName}: ${deleteError.message}`);
      }
    }
  } catch (error: any) {
    console.warn(`Error deleting bucket ${bucketName}: ${error.message}`);
  }
}

const handler = async function (req: VercelRequest, res: VercelResponse) {
  const { id } = req.query;

  // Get Supabase admin client using getter
  if (!isSupabaseConfigured()) {
    return res.status(503).json({ error: 'Database service not configured' });
  }
  const supabaseAdmin = getSupabaseAdmin();
  if (!supabaseAdmin) {
    return res.status(503).json({ error: 'Database service not available' });
  }

  if (req.method === 'GET') {
    try {
      // Check for search query parameter
      const searchQuery = req.query.search as string;
      const searchField = req.query.field as string; // 'id', 'name', 'client', or undefined for all
      const limit = parseInt(req.query.limit as string) || 50;

      if (id) {
        // Fetch a single project by ID - use maybeSingle to avoid throwing on no results
        const { data: project, error } = await supabaseAdmin
          .from('projects')
          .select('*')
          .eq('id', (id as string).trim())
          .maybeSingle();

        // If there's an error, log it and treat as "not found" (common with non-UUID IDs)
        if (error) {
          console.warn('[GET Project] Error fetching project (treating as not found):', error);
          return res.status(404).json({ error: 'Project not found', details: error.message });
        }

        // If project not found, return 404
        if (!project) return res.status(404).json({ error: 'Project not found' });

        // Fetch associated documents and photos in separate queries.
        // This avoids fragile join/select behavior that can cause Supabase to throw (500) for GET.
        const projectId = (id as string).trim();

let docsData: any[] = [];
        let photosData: any[] = [];
        let kmlData: any[] = [];

        // 1) Documents (no joins)
        try {
          // Try both exact match and potentially case-insensitive if first fails
          let { data: docsRes, error: docsError } = await supabaseAdmin
            .from('project_documents')
            .select('*')
            .eq('project_id', projectId);

          if (!docsError && (!docsRes || docsRes.length === 0)) {
            // Fallback: Try case-insensitive match if exact match returned nothing
            const { data: retryDocs, error: retryError } = await supabaseAdmin
              .from('project_documents')
              .select('*')
              .ilike('project_id', projectId);

            if (!retryError && retryDocs && retryDocs.length > 0) {
              console.log(`[GET Project] Found ${retryDocs.length} documents via case-insensitive match for ${projectId}`);
              docsRes = retryDocs;
            }
          }

          if (docsError) {
            console.warn('[GET Project] Could not fetch project_documents:', docsError.message);
          }

          docsData = docsRes || [];
        } catch (docsErr: any) {
          console.warn('[GET Project] Warning: project_documents query failed:', docsErr?.message);
        }

        // 2) Document versions for those docs
        if (docsData.length > 0) {
          try {
            const documentIds = docsData.map((doc: any) => doc.id).filter(Boolean);
            const { data: docVersionsRes, error: docVersionsError } = await supabaseAdmin
              .from('document_versions')
              .select('*')
              .in('doc_id', documentIds);

            if (docVersionsError) {
              console.warn('[GET Project] Could not fetch document_versions:', docVersionsError.message);
            } else {
              // Attach versions to each doc in JS so mappers can remain unchanged
              const byDocId = new Map<string, any[]>();
              (docVersionsRes || []).forEach((v: any) => {
                const list = byDocId.get(v.doc_id) || [];
                list.push(v);
                byDocId.set(v.doc_id, list);
              });

              docsData = docsData.map((doc: any) => ({
                ...doc,
                document_versions: byDocId.get(doc.id) || []
              }));
            }
          } catch (dvErr: any) {
            console.warn('[GET Project] Warning: document_versions query failed:', dvErr?.message);
          }
        }

        // 3) Photos
        try {
          const { data: photosRes, error: photosError } = await supabaseAdmin
            .from('project_site_photos')
            .select('*')
            .eq('project_id', projectId);

          if (photosError) {
            console.warn('[GET Project] Could not fetch project_site_photos:', photosError.message);
          }

          photosData = photosRes || [];
        } catch (photosErr: any) {
          console.warn('[GET Project] Warning: project_site_photos query failed:', photosErr?.message);
        }

// 4) KML Data - Try JSONB field first, then table
        try {
          // FIRST: Try to get KML from the kml_data field on projects table (primary storage)
          // It could be returned as JSON (if JSONB) or string (if text type)
          const rawKmlData = (project as any).kml_data;
          
          if (rawKmlData) {
            // Parse if it's a string (text column) or use directly if it's JSON (JSONB column)
            let parsedKml: any[] = [];
            if (typeof rawKmlData === 'string') {
              try {
                parsedKml = JSON.parse(rawKmlData);
              } catch (parseErr) {
                console.warn('[GET Project] Failed to parse kml_data:', parseErr);
              }
            } else if (Array.isArray(rawKmlData)) {
              parsedKml = rawKmlData;
            }
            
            if (parsedKml.length > 0) {
              kmlData = parsedKml.map((kml: any) => ({
                id: kml.id,
                name: kml.name,
                kmlContent: kml.kmlContent,
                timestamp: kml.timestamp,
                visible: kml.visible !== false,
                color: kml.color
              }));
              console.log('[GET Project] Loaded KML from kml_data field:', kmlData.length, 'files');
            }
          }
          
          // FALLBACK: Try separate table if no data in kml_data field
          if (kmlData.length === 0) {
            const { data: kmlRes, error: kmlError } = await supabaseAdmin
              .from('project_kml')
              .select('*')
              .eq('project_id', projectId);

            if (kmlError) {
              console.warn('[GET Project] Could not fetch project_kml:', kmlError.message);
            }

            // Map KML data to expected format
            kmlData = (kmlRes || []).map((kml: any) => ({
              id: kml.id,
              name: kml.name,
              kmlContent: kml.kml_content,  // Map kml_content to kmlContent
              timestamp: kml.timestamp,
              visible: kml.visible !== false,
              color: kml.color
            }));
            
            if (kmlData.length > 0) {
              console.log('[GET Project] Loaded KML from table:', kmlData.length, 'files');
            }
          }
        } catch (kmlErr: any) {
          console.warn('[GET Project] Warning: project_kml query failed:', kmlErr?.message);
        }

        const projectWithData = {
          ...project,
          project_documents: docsData,
          project_site_photos: photosData,
          project_kml: kmlData
        };

        return res.status(200).json(mapProjectFromDb(projectWithData));
      }

      // Handle search query
      if (searchQuery && searchQuery.trim()) {
        const searchTerm = searchQuery.trim().toLowerCase();
        let queryBuilder = supabaseAdmin.from('projects').select('*');

        // Apply field-specific or general search
        if (searchField === 'id') {
          // Search by ID (exact or partial match on id field)
          queryBuilder = queryBuilder.ilike('id', `%${searchTerm}%`);
        } else if (searchField === 'code') {
          // Search by project code (e.g., proj-xxxxx)
          queryBuilder = queryBuilder.ilike('code', `%${searchTerm}%`);
        } else if (searchField === 'name') {
          // Search by project name
          queryBuilder = queryBuilder.ilike('name', `%${searchTerm}%`);
        } else if (searchField === 'client') {
          // Search by client name
          queryBuilder = queryBuilder.ilike('client', `%${searchTerm}%`);
        } else {
          // General search across id, code, name, and client fields using OR
          queryBuilder = queryBuilder.or(`id.ilike.%${searchTerm}%,code.ilike.%${searchTerm}%,name.ilike.%${searchTerm}%,client.ilike.%${searchTerm}%`);
        }

        const { data: projects, error: searchError } = await queryBuilder.limit(limit);

        if (searchError) throw searchError;

        return res.status(200).json({
          data: (projects || []).map(mapProjectFromDb),
          search: searchTerm,
          count: projects?.length || 0
        });
      }

      // Fetch paginated list of projects (default behavior)
      const page = parseInt(req.query.page as string) || 1;
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
    console.log('[POST Project] Starting project creation...');
    const userRole = (req as any).user?.role;
    console.log('[POST Project] User role:', userRole);
    const r = userRole?.toUpperCase();
    const allowedRoles = ['ADMIN', 'PROJECT MANAGER', 'MANAGER', 'PROJECT_MANAGER'];
    const isProjectAuth = allowedRoles.includes(r);
    if (!isProjectAuth) {
      console.warn('[POST Project] Unauthorized role:', r);
      return res.status(403).json({ error: 'Only admins or project managers can create projects' });
    }

    try {
      const projectData = { ...req.body };
      console.log('[POST Project] Received project data:', JSON.stringify(projectData).slice(0, 500));

      // Get userId from auth middleware
      const userId = (req as any).user?.userId;
      console.log('[POST Project] User ID:', userId);
      if (!userId) {
        console.error('[POST Project] User ID not found in token');
        return res.status(401).json({ error: 'User ID not found in authentication token.' });
      }

      if (!projectData.name || !projectData.client) {
        console.warn('[POST Project] Missing required fields:', { name: !!projectData.name, client: !!projectData.client });
        return res.status(400).json({ error: 'Project name and client are required' });
      }

      // Generate a unique project ID using UUID v4
      const projectId = projectData.id || randomUUID();
      console.log('[POST Project] Project ID:', projectId);

      // Prepare the project data for upsert, ensuring the ID is set correctly.
      const projectDataForUpsert = mapProjectToDb({
        ...projectData,
        id: projectId,
        ownerId: userId, // Assuming userId is available from auth middleware
        updatedAt: new Date().toISOString()
      });
      console.log('[POST Project] Mapped data for DB:', JSON.stringify(projectDataForUpsert).slice(0, 500));

      // Use upsert with ignoreDuplicates to handle potential race conditions gracefully.
      // If the ID already exists, Supabase will ignore the insert and not return an error.
      // We then check if any data was actually returned, indicating a successful insert.
      console.log('[POST Project] Calling Supabase upsert...');
      const { data: upsertedProject, error } = await supabaseAdmin
        .from('projects')
        .upsert(projectDataForUpsert, { onConflict: 'id', ignoreDuplicates: true })
        .select('*') // Select the row. This will either be the newly inserted row or the existing row if ignoreDuplicates was hit.
        .eq('id', projectId) // Ensure we're looking at the specific ID that was attempted.
        .single(); // Expect a single row result.

      if (error) {
        // Catch any errors other than duplicate key violations that upsert might return.
        console.error('[POST Project] Supabase upsert error:', error.code, error.message, error.details);
        return res.status(500).json({ error: 'Failed to save project', details: error.message, code: error.code });
      }

      console.log('[POST Project] Upsert result:', upsertedProject ? 'success' : 'no data returned');

      // If upsertedProject is null/undefined, it means no row was inserted or updated because ignoreDuplicates prevented it (ID already existed and was ignored).
      if (!upsertedProject) {
        console.warn(`[POST Project] Project with ID ${projectId} already exists and was not updated due to ignoreDuplicates.`);
        // If a project with this ID existed, we should still return a 409 Conflict,
        // as the operation did not result in a new creation or an explicit update that returned data.
        return res.status(409).json({
          error: 'Project with this ID already exists',
          projectId: projectId,
          hint: 'This operation was ignored because the project already exists. No changes were made.'
        });
      }

      // If upsertedProject has data, a new project was successfully inserted or an existing one was updated and returned.

      // Create a dedicated storage bucket for the new project
      const bucketName = await createProjectBucket(supabaseAdmin, projectId);
      console.log(`[POST Project] Created storage bucket: ${bucketName}`);

      return res.status(201).json(mapProjectFromDb(upsertedProject));

    } catch (error: any) {
      console.error('[POST Project] Exception:', error.message, error.stack);
      // This catch block now handles errors that might occur before the upsert operation
      // or unexpected errors from the upsert operation itself if they bypass the specific error handling.
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

      // Remove id field to prevent duplicate key constraint violation
      delete projectData.id;

      // Supabase update operation
      const { data: updatedProject, error } = await supabaseAdmin
        .from('projects')
        .update(mapProjectToDb({
          ...projectData,
          updatedAt: new Date().toISOString() // Ensure updated_at is updated
        }))
        .eq('id', (id as string).trim())
        .select('*') // Return the updated row without joins
        .single(); // Expect a single row

      if (error) throw error;
      if (!updatedProject) return res.status(404).json({ error: 'Project not found' });

      // --- Deep Sync for Associated Data ---
      // If documents or sitePhotos are provided in the body, sync their metadata to separate tables.
      // Note: We use the already sanitized projectData from the body.

      const syncTasks = [];

// 1. Sync Documents Metadata
      if (req.body.documents && Array.isArray(req.body.documents)) {
        const docsToSync = req.body.documents.map((doc: any) => mapProjectDocumentToDb({
          ...doc,
          projectId: id // Ensure the ID is correct
        })).filter(Boolean);

        if (docsToSync.length > 0) {
          syncTasks.push(
            supabaseAdmin.from('project_documents').upsert(docsToSync, { onConflict: 'id' })
              .then(({ error: e }: any) => { if (e) console.warn('[Deep Sync] Documents failed:', e.message); })
          );
        }
      }

      // 2. Sync Site Photos Metadata
      if (req.body.sitePhotos && Array.isArray(req.body.sitePhotos)) {
        const photosToSync = req.body.sitePhotos.map((p: any) => ({
          id: p.id,
          project_id: id,
          caption: p.caption,
          uploaded_by: p.uploadedBy || p.uploaded_by,
          location_lat: p.location?.lat || null,
          location_lng: p.location?.lng || null,
          updated_at: new Date().toISOString()
        })).filter((p: any) => p.id);

        if (photosToSync.length > 0) {
          syncTasks.push(
            supabaseAdmin.from('project_site_photos').upsert(photosToSync, { onConflict: 'id' })
              .then(({ error: e }: any) => { if (e) console.warn('[Deep Sync] Photos failed:', e.message); })
          );
        }
      }

// 3. Sync KML Data - Store in separate table only (skip JSONB field which may not exist in all schemas)
      if (req.body.kmlData && Array.isArray(req.body.kmlData)) {
        // Skip JSONB field update - it requires kml_data column which may not exist in all Supabase schemas
        // Only sync to separate table (optional - won't fail if table doesn't exist)
        const kmlToSync = req.body.kmlData.map((kml: any) => ({
          id: kml.id,
          project_id: id,
          name: kml.name,
          kml_content: kml.kmlContent,
          timestamp: kml.timestamp,
          visible: kml.visible !== false,
          color: kml.color || null
        })).filter((kml: any) => kml.id);

        if (kmlToSync.length > 0) {
          syncTasks.push(
            supabaseAdmin.from('project_kml').upsert(kmlToSync, { onConflict: 'id' })
              .then(({ error: e }: any) => { 
                if (e) {
                  console.log('[Deep Sync] KML table sync skipped (table may not exist)');
                } else {
                  console.log('[Deep Sync] KML synced to table:', kmlToSync.length, 'files');
                }
              })
          );
        }
      }

      // Wait for all sync tasks to complete
      if (syncTasks.length > 0) {
        await Promise.all(syncTasks).catch(err => console.error('[Deep Sync] Unhandled error:', err));
      }

// Attach the synced data to the updatedProject object so mapProjectFromDb can return a full object
      const projectWithAssociations = {
        ...updatedProject,
        project_documents: req.body.documents || [],
        project_site_photos: req.body.sitePhotos || [],
        project_kml: req.body.kmlData || []  // Include KML data in response
      };

      console.log(`[PUT Project] Updated ${id} with ${projectWithAssociations.project_documents.length} docs, ${projectWithAssociations.project_site_photos.length} photos, and ${projectWithAssociations.project_kml.length} KML files`);

      return res.status(200).json(mapProjectFromDb(projectWithAssociations));
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
              project_id: (id as string).trim(),
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
        .eq('id', (id as string).trim())
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
      const projectIdToDelete = (id as string).trim();

      // --- File Cleanup ---
      // Fetch associated documents
      const { data: docs, error: docsError } = await supabaseAdmin
        .from('project_documents')
        .select('id') // Fetch document IDs associated with the project
        .eq('project_id', projectIdToDelete);

      if (docsError) {
        console.error('Error fetching project documents for cleanup:', docsError);
        // Log the error but continue with project deletion.
      } else if (docs && docs.length > 0) {
        const documentIds = docs.map((doc: any) => doc.id);

        // Fetch blob_urls for all versions of these documents
        const { data: docVersions, error: docVersionsError } = await supabaseAdmin
          .from('document_versions')
          .select('blob_url')
          .in('doc_id', documentIds);

        if (docVersionsError) {
          console.error('Error fetching document versions for cleanup:', docVersionsError);
        } else if (docVersions && docVersions.length > 0) {
          const filePathsToDelete = docVersions.map((version: any) => version.blob_url).filter((path: any) => path);

          if (filePathsToDelete.length > 0) {
            // Try to delete from project-specific bucket first, fall back to default bucket
            const projectBucket = `project-${projectIdToDelete}`;
            const { data: buckets } = await supabaseAdmin.storage.listBuckets();
            const bucketToUse = buckets?.some((b: any) => b.name === projectBucket) ? projectBucket : DEFAULT_BUCKET_NAME;

            const { error: storageError } = await supabaseAdmin.storage
              .from(bucketToUse)
              .remove(filePathsToDelete);

            if (storageError) {
              console.error(`Failed to delete files from storage during project deletion:`, storageError);
              // Log the error but do not throw, as the project itself is being deleted.
            }
          }
        }
      }

// Clean up associated site photos
      const { error: deletePhotosError } = await supabaseAdmin
        .from('project_site_photos')
        .delete()
        .eq('project_id', projectIdToDelete);

      if (deletePhotosError) {
        console.error('Error deleting project site photos:', deletePhotosError);
        // Log the error but do not throw.
      }

      // Clean up associated KML data
      const { error: deleteKmlError } = await supabaseAdmin
        .from('project_kml')
        .delete()
        .eq('project_id', projectIdToDelete);

      if (deleteKmlError) {
        console.error('Error deleting project KML:', deleteKmlError);
        // Log the error but do not throw.
      }

      // --- Project Deletion from 'projects' table ---
      const { error: deleteProjectError } = await supabaseAdmin
        .from('projects')
        .delete()
        .eq('id', projectIdToDelete);

      if (deleteProjectError) throw deleteProjectError; // This will be caught by the outer catch block

      // Delete the project's storage bucket after all data is cleaned up
      await deleteProjectBucket(supabaseAdmin, projectIdToDelete);

      // If we are here, project table deletion was successful, and cleanup attempts were made (errors logged if any).
      return res.status(200).json({ message: 'Project and associated files/photos deleted successfully.' });

    } catch (error: any) {
      console.error('Failed to delete project or its associated data:', error);
      return res.status(500).json({ error: 'Failed to delete project or its associated data', details: error.message });
    }
  }

  return res.status(405).json({ error: 'Method Not Allowed' });
};

/**
 * Gets the storage bucket name for a project
 * Falls back to default bucket if project-specific bucket doesn't exist
 */
// NOTE: getProjectBucketName is currently unused.
// Keeping the old helper removed to avoid lint warnings/errors.

export default withErrorHandler(withAuth(handler));

