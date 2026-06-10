

import type { VercelRequest, VercelResponse } from '@vercel/node';
import { getSupabaseAdmin, isSupabaseConfigured } from './_utils/supabaseClient.js';
import { withErrorHandler } from './_utils/errorHandler.js';
import { withAuth } from './_utils/auth.js';
import { mapProjectDocumentToDb, mapDocumentVersionFromDb } from './_utils/mappers.js';
import { generateUniqueId } from './_utils/uuidUtils.js';
import { Buffer } from 'buffer'; // For Buffer operations

const DEFAULT_BUCKET_NAME = process.env.SUPABASE_STORAGE_BUCKET || 'project-files';

/**
 * Gets the appropriate storage bucket for a project.
 * Uses project-specific bucket if it exists, otherwise falls back to default bucket.
 */
async function getProjectBucket(supabaseAdmin: any, projectId?: string): Promise<string> {
  if (!projectId) return DEFAULT_BUCKET_NAME;
  
  const projectBucket = `project-${projectId}`;
  try {
    const { data: buckets } = await supabaseAdmin.storage.listBuckets();
    const bucketExists = buckets?.some((b: any) => b.name === projectBucket);
    return bucketExists ? projectBucket : DEFAULT_BUCKET_NAME;
  } catch (error) {
    console.warn(`Error checking for project bucket ${projectBucket}:`, error);
    return DEFAULT_BUCKET_NAME;
  }
}

const handler = async function (req: VercelRequest, res: VercelResponse) {
  // Check if Supabase is configured before proceeding
  if (!isSupabaseConfigured()) {
    return res.status(503).json({ error: 'Database service not configured' });
  }
  const supabaseAdmin = getSupabaseAdmin();
  if (!supabaseAdmin) {
    return res.status(503).json({ error: 'Database service not available' });
  }
  const { id } = req.query;


  if (req.method === 'GET') {
    if (!id || typeof id !== 'string') {
      return res.status(400).json({ error: 'File ID is required' });
    }

    try {
      // Fetch metadata from Supabase database to get the file path/key
      // We'll query document_versions for the most recent version's blob_url
      const { data: docVersions, error: docError } = await supabaseAdmin
        .from('document_versions')
        .select('blob_url, doc_id, id, version_num')
        .or(`doc_id.eq.${id},id.eq.${id}`) // Allow searching by doc_id or version id
        .order('version_num', { ascending: false });

      if (docError) throw docError;

      if (!docVersions || docVersions.length === 0) {
        // Fallback: check if it's a site photo
        const { data: photo, error: photoError } = await supabaseAdmin
          .from('project_site_photos')
          .select('url')
          .eq('id', id as string)
          .single();
        
        if (photo?.url) {
          return res.redirect(photo.url);
        }

        if (photoError && !photoError.message?.includes('JSON object')) {
          console.error('Error fetching photo:', photoError);
        }

        return res.status(404).json({ error: 'File not found' });
      }

// Assuming blob_url stores the path to the file in Supabase Storage
      // e.g., 'files/projectId/filename.ext' or 'files/filename.ext'
      const latestVersion = mapDocumentVersionFromDb(docVersions[0]);
      const filePath = latestVersion.filePath; // correctly mapped from blob_url

      if (!filePath) {
        return res.status(404).json({ error: 'File path not found in metadata' });
      }

      // Fetch document to get projectId for bucket resolution
      let projId: string | undefined;
      let fileName: string | undefined;
      try {
        const { data: doc } = await supabaseAdmin
          .from('project_documents')
          .select('project_id, name')
          .eq('id', latestVersion.docId)
          .maybeSingle();
        projId = doc?.project_id;
        fileName = doc?.name;
      } catch (e) { /* ignore */ }

      // Get the appropriate bucket and fetch the file
      const bucketName = await getProjectBucket(supabaseAdmin, projId);
      
      const { data: fileBlob, error: downloadError } = await supabaseAdmin.storage
        .from(bucketName)
        .download(filePath);
      
      if (downloadError) throw downloadError;

      // Determine content type from metadata or fallback
      let contentType = 'application/octet-stream';
      try {
        const metadata = typeof latestVersion.metadata === 'string' 
          ? JSON.parse(latestVersion.metadata) 
          : latestVersion.metadata;
        if (metadata?.mimeType) {
          contentType = metadata.mimeType;
        } else if (filePath.toLowerCase().endsWith('.pdf')) {
          contentType = 'application/pdf';
        } else if (filePath.toLowerCase().match(/\.(jpg|jpeg|png|gif|webp)$/)) {
          contentType = `image/${filePath.split('.').pop()}`;
        }
      } catch (e) {}

      const buffer = Buffer.from(await fileBlob.arrayBuffer());
      
      const rawFileName = fileName || latestVersion.name || 'document';
      // Strip non-ASCII characters and quotes for the standard filename parameter
      const asciiFileName = rawFileName.replace(/[^\x20-\x7E]/g, '_').replace(/"/g, "'");
      // Use RFC 5987 encoded filename* for UTF-8 support
      const encodedFileName = encodeURIComponent(rawFileName).replace(/['()]/g, escape).replace(/\*/g, '%2A');

      res.setHeader('Content-Type', contentType);
      res.setHeader('Content-Length', buffer.length.toString());
      res.setHeader('Content-Disposition', `inline; filename="${asciiFileName}"; filename*=UTF-8''${encodedFileName}`);
      return res.send(buffer);


    } catch (error: any) {
      console.error('Failed to fetch file:', error);
      return res.status(500).json({ error: 'Failed to fetch file', details: error.message });
    }
  }

  if (req.method === 'POST') {
    try {
      const { 
        name, 
        contentType, 
        base64Data, 
        projectId, 
        folder, 
        tags, 
        subject, 
        refNo, 
        metadata,
        docId // Optional: if provided, we add a new version to this docId
      } = req.body;

      if (!base64Data || !name || !contentType) {
        return res.status(400).json({ error: 'name, contentType, and base64Data are required' });
      }

      // Convert base64 to Buffer
      const base64Content = base64Data.includes(';base64,') 
        ? base64Data.split(';base64,')[1] 
        : base64Data;
      
      const buffer = Buffer.from(base64Content, 'base64');
      
      // Sanitize filename to be safe for Supabase Storage path
      // Replace disallowed chars, non-ASCII characters, and spaces with underscores
      const safeName = name
        .replace(/[^\x00-\x7F]/g, '_') // Replace non-ASCII characters (like –)
        .replace(/[\/\?*:"<>|]/g, '_')  // Replace common disallowed filename characters
        .replace(/\s+/g, '_');           // Replace spaces
      
// Get the appropriate bucket for this project
      const bucketName = await getProjectBucket(supabaseAdmin, projectId);
      
            // Ensure the project-specific bucket exists before uploading
      const finalDocId = docId || `doc-${generateUniqueId()}`;
      const versionId = `ver-${generateUniqueId()}`;

      // 1. Check for duplicates in DB if it's a new document
      if (!docId && projectId) {
        const { data: existing } = await supabaseAdmin
          .from('project_documents')
          .select('id, name, size')
          .eq('project_id', projectId)
          .eq('name', name)
          .maybeSingle();

        if (existing) {
          // If the size is also very similar, it's likely a duplicate
          const existingSizeBytes = parseInt(existing.size) || 0;
          if (Math.abs(existingSizeBytes - buffer.length) < 1024) { // within 1KB
            return res.status(409).json({ 
              error: 'Duplicate document found', 
              id: existing.id,
              message: 'A document with this name and similar size already exists in this project.'
            });
          }
        }
      }
      const { data: bucketList } = await supabaseAdmin.storage.listBuckets();
      const projBucketExists = bucketList?.some((b: any) => b.name === bucketName);
      if (!projBucketExists && bucketName === DEFAULT_BUCKET_NAME) {
        // Try to create the default bucket if it doesn't exist
        const { error: createBucketError } = await supabaseAdmin.storage.createBucket(DEFAULT_BUCKET_NAME, {
          public: true,
          fileSizeLimit: 52428800, // 50MB
        });
        if (createBucketError && !createBucketError.message?.includes('already exists')) {
          console.warn(`Could not create bucket: ${createBucketError.message}`);
        }
      } else if (!projBucketExists) {
        // Create project-specific bucket
        const { error: createBucketError } = await supabaseAdmin.storage.createBucket(bucketName, {
          public: true,
          fileSizeLimit: 52428800, // 50MB
        });
        if (createBucketError && !createBucketError.message?.includes('already exists')) {
          console.warn(`Could not create project bucket: ${createBucketError.message}`);
          // Fall back to default bucket
          const fallbackBucket = DEFAULT_BUCKET_NAME;
          const { error: fallbackError } = await supabaseAdmin.storage.createBucket(fallbackBucket, {
            public: true,
            fileSizeLimit: 52428800,
          });
          if (fallbackError && !fallbackError.message?.includes('already exists')) {
            throw new Error(`Failed to create storage: ${fallbackError.message}`);
          }
        }
      }

      // Construct file path in Supabase Storage
      // Include versionId to ensure uniqueness and prevent overwrites
      const storagePath = folder
        ? `${folder}/${versionId}_${safeName}`
        : `${projectId ? `${projectId}/` : ''}${versionId}_${safeName}`;

      // Upload to Supabase Storage
      const { data: uploadData, error: uploadError } = await supabaseAdmin.storage
        .from(bucketName)
        .upload(storagePath, buffer, {
          contentType,
          upsert: true,
        });

      if (uploadError) throw uploadError;

      // Get the public URL after upload
      const { data: publicUrlData } = supabaseAdmin.storage
        .from(bucketName)
        .getPublicUrl(storagePath);

      const publicUrl = publicUrlData?.publicUrl;

      // Handle Site Photos separately
      if (folder === 'site-photos') {
        const photoId = docId || `photo-${generateUniqueId()}`;
        const { error: photoError } = await supabaseAdmin
          .from('project_site_photos')
          .insert({
            id: photoId,
            project_id: projectId,
            url: publicUrl,
            caption: metadata?.caption || '',
            uploaded_by: (req as any).user?.name || 'User',
            location_lat: metadata?.location?.lat || null,
            location_lng: metadata?.location?.lng || null
          });
        
        if (photoError) throw photoError;

        return res.status(201).json({
          id: photoId,
          url: publicUrl,
          name,
          contentType,
          size: buffer.length
        });
      }

      // (ID generation moved up)

      if (!docId) {
        // Create new document entry in Supabase DB
        const { error: insertDocError } = await supabaseAdmin
          .from('project_documents')
          .insert(mapProjectDocumentToDb({
            id: finalDocId,
            projectId: projectId || null,
            name,
            folder: folder || null,
            tags: tags || [],
            subject: subject || null,
            refNo: refNo || null,
            size: buffer.length.toString(),
            type: contentType,
            status: 'Active',
            metadata: JSON.stringify(metadata || {})
          }));
        if (insertDocError) throw insertDocError;
      } else {
        // Update existing document entry
        const { error: updateDocError } = await supabaseAdmin
          .from('project_documents')
          .update(mapProjectDocumentToDb({
            size: buffer.length.toString(),
            type: contentType,
            updatedAt: new Date().toISOString()
          }))
          .eq('id', finalDocId);
        if (updateDocError) throw updateDocError;
      }

      // Get current version count to determine next version number
      const { count, error: versionCountError } = await supabaseAdmin
        .from('document_versions')
        .select('*', { count: 'exact', head: true })
        .eq('doc_id', finalDocId);
      
      if (versionCountError) throw versionCountError;
      const nextVersionNum = (count || 0) + 1;

      // Create new version entry in Supabase DB
      const { error: insertVersionError } = await supabaseAdmin
        .from('document_versions')
        .insert({
          id: versionId,
          doc_id: finalDocId,
          blob_url: storagePath,
          version_num: nextVersionNum,
          size: buffer.length,
          notes: metadata?.notes || null,
        });
      if (insertVersionError) throw insertVersionError;

      // Determine content type from metadata or fallback to type
      let finalContentType = metadata?.mimeType || contentType;

      return res.status(201).json({
        id: finalDocId,
        versionId: versionId,
        name,
        contentType: finalContentType,
        size: buffer.length,
        url: `/api/files?id=${finalDocId}`,
      });
    } catch (error: any) {
      console.error('Failed to upload file:', error);
      return res.status(500).json({ error: 'Failed to upload file', details: error.message });
    }
  }

  if (req.method === 'DELETE') {
    const userRole = (req as any).user?.role;
    // Assuming 'Admin' or 'Project Manager' roles are managed via withAuth and available in req.user
    const r = userRole?.toUpperCase();
    const isAuthorized = r === 'ADMIN' || r === 'PROJECT MANAGER' || r === 'MANAGER' || r === 'PROJECT_MANAGER';
    if (!isAuthorized) {
      return res.status(403).json({ error: 'Only admins or project managers can delete files' });
    }

    if (!id || typeof id !== 'string') {
      return res.status(400).json({ error: 'File ID is required' });
    }

    try {
      // Fetch metadata from Supabase DB to get file paths for deletion
      const { data: docVersions, error: docError } = await supabaseAdmin
        .from('document_versions')
        .select('blob_url') // We need the path stored in blob_url
        .eq('doc_id', id);

      if (docError) throw docError;
      
      if (!docVersions || docVersions.length === 0) {
        console.warn(`No document versions found for doc ID ${id} during delete. Proceeding to delete document metadata.`);
        // Still attempt to delete the main document entry even if versions are missing
      } else {
        // Extract file paths from blob_url (assuming blob_url stores the path)
        const filePathsToDelete = docVersions.map((version: any) => version.blob_url).filter((path: any) => path);
        
if (filePathsToDelete.length > 0) {
          // Delete from Supabase Storage (use default bucket for backward compatibility)
          const { error: storageError } = await supabaseAdmin.storage
            .from(DEFAULT_BUCKET_NAME)
            .remove(filePathsToDelete);
          
          if (storageError) {
            console.error(`Failed to delete files from storage:`, storageError);
            // Throw an error to prevent DB deletion if storage fails
            throw new Error(`Failed to delete files from storage: ${storageError.message}`);
          }
        }
      }

      // Delete the main document entry from project_documents table
      // Supabase RLS can handle cascading deletes for document_versions if configured
      const { error: deleteDocError } = await supabaseAdmin
        .from('project_documents')
        .delete()
        .eq('id', id);
      
      if (deleteDocError) throw deleteDocError;
      
      return res.status(204).end();
    } catch (error: any) {
      console.error('Failed to delete file:', error);
      return res.status(500).json({ error: 'Failed to delete file', details: error.message });
    }
  }

  if (req.method === 'PATCH') {
    const userRole = (req as any).user?.role;
    const r = userRole?.toUpperCase();
    const isAuthorized = r === 'ADMIN' || r === 'PROJECT MANAGER' || r === 'MANAGER' || r === 'PROJECT_MANAGER' || r === 'PLANNING_ENGINEER';
    
    if (!isAuthorized) {
      return res.status(403).json({ error: 'Permission denied for metadata update' });
    }

    if (!id || typeof id !== 'string') {
      return res.status(400).json({ error: 'File ID is required' });
    }

    try {
      const { 
        name, 
        folder, 
        tags, 
        subject, 
        refNo, 
        metadata,
        status,
        letterDate,
        correspondenceType
      } = req.body;

      const updateData: any = {};
      if (name !== undefined) updateData.name = name;
      if (folder !== undefined) updateData.folder = folder;
      if (tags !== undefined) updateData.tags = tags;
      if (subject !== undefined) updateData.subject = subject;
      if (refNo !== undefined) updateData.ref_no = refNo;
      if (status !== undefined) updateData.status = status;
      if (letterDate !== undefined) updateData.letter_date = letterDate;
      if (correspondenceType !== undefined) updateData.correspondence_type = correspondenceType;
      
      if (metadata !== undefined) {
        updateData.metadata = typeof metadata === 'string' ? metadata : JSON.stringify(metadata);
      }

      updateData.updated_at = new Date().toISOString();

      const { data, error } = await supabaseAdmin
        .from('project_documents')
        .update(updateData)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;

      return res.status(200).json(data);
    } catch (error: any) {
      console.error('Failed to update file metadata:', error);
      return res.status(500).json({ error: 'Failed to update file metadata', details: error.message });
    }
  }

  return res.status(405).json({ error: 'Method Not Allowed' });
};

export default withErrorHandler(withAuth(handler));
