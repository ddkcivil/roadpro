import type { VercelRequest, VercelResponse } from '@vercel/node';
import { supabaseAdmin } from './_utils/supabaseClient.js';
import { withErrorHandler } from './_utils/errorHandler.js';
import { withAuth } from './_utils/auth.js';
import { mapProjectDocumentToDb, mapDocumentVersionFromDb } from './_utils/mappers.js';
import { v4 as uuidv4 } from 'uuid'; // For generating IDs
import { Buffer } from 'buffer'; // For Buffer operations

const BUCKET_NAME = process.env.SUPABASE_STORAGE_BUCKET || 'project-files';

const handler = async function (req: VercelRequest, res: VercelResponse) {
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
        return res.status(404).json({ error: 'File not found' });
      }

      // Assuming blob_url stores the path to the file in Supabase Storage
      // e.g., 'files/projectId/filename.ext' or 'files/filename.ext'
      const latestVersion = mapDocumentVersionFromDb(docVersions[0]);
      const filePath = latestVersion.filePath; // correctly mapped from blob_url

      if (!filePath) {
        return res.status(404).json({ error: 'File path not found in metadata' });
      }

      // Generate public URL using Supabase Storage client.
      const { data: publicUrlData } = supabaseAdmin.storage
        .from(BUCKET_NAME)
        .getPublicUrl(filePath);
      
      if (publicUrlData?.publicUrl) {
        return res.redirect(publicUrlData.publicUrl);
      } else {
        // Fallback if direct public URL isn't available
        console.error(`Public URL not found for path: ${filePath}`);
        return res.status(500).json({ error: 'Could not retrieve public URL for file.' });
      }


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
      
      // Construct file path in Supabase Storage
      // Example: 'files/projectId/folder/filename.ext' or 'files/filename.ext'
      const storagePath = folder 
        ? `${folder}/${name}` 
        : `${projectId ? `${projectId}/` : ''}${name}`;
      
      // Ensure the storage bucket exists before uploading
      const { data: buckets } = await supabaseAdmin.storage.listBuckets();
      const bucketExists = buckets?.some((b: any) => b.name === BUCKET_NAME);
      if (!bucketExists) {
        const { error: createBucketError } = await supabaseAdmin.storage.createBucket(BUCKET_NAME, {
          public: true,
          fileSizeLimit: 52428800, // 50MB
        });
        if (createBucketError && !createBucketError.message?.includes('already exists')) {
          throw new Error(`Failed to create storage bucket: ${createBucketError.message}`);
        }
      }

      // Upload to Supabase Storage
      const { data: uploadData, error: uploadError } = await supabaseAdmin.storage
        .from(BUCKET_NAME)
        .upload(storagePath, buffer, {
          contentType,
          upsert: true,
        });

      if (uploadError) throw uploadError;

      // Get the public URL after upload
      const { data: publicUrlData } = supabaseAdmin.storage
        .from(BUCKET_NAME)
        .getPublicUrl(storagePath);

      const publicUrl = publicUrlData?.publicUrl; // This is the URL to access the file


      const finalDocId = docId || `doc-${uuidv4()}`;
      const versionId = `ver-${uuidv4()}`;

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
      // Count versions for the document ID to set the next version number
      const { data: versionCountData, error: versionCountError } = await supabaseAdmin
        .from('document_versions')
        .select('count', { count: 'exact' })
        .eq('doc_id', finalDocId);
      
      if (versionCountError) throw versionCountError;
      const nextVersionNum = (versionCountData?.[0]?.count || 0) + 1;

      // Create new version entry in Supabase DB
      const { error: insertVersionError } = await supabaseAdmin
        .from('document_versions')
        .insert({
          id: versionId,
          doc_id: finalDocId,
          blob_url: storagePath, // Store the file path in Supabase Storage, not the public URL
          version_num: nextVersionNum,
          size: buffer.length,
          notes: metadata?.notes || null,
        });
      if (insertVersionError) throw insertVersionError;

      return res.status(201).json({
        id: finalDocId,
        versionId: versionId,
        name,
        contentType,
        size: buffer.length,
        url: `/api/files?id=${finalDocId}`, // URL to fetch metadata/redirect
        // Optionally return publicUrl if the frontend needs it directly
        // publicUrl: publicUrl 
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
        const filePathsToDelete = docVersions.map(version => version.blob_url).filter(path => path);
        
        if (filePathsToDelete.length > 0) {
          // Delete from Supabase Storage
          const { error: storageError } = await supabaseAdmin.storage
            .from(BUCKET_NAME) // Use the defined BUCKET_NAME constant
            .remove(filePathsToDelete);
          
          if (storageError) {
            console.error(`Failed to delete files from storage:`, storageError);
            // Decide if this should be a fatal error or if we proceed with DB deletion
            // For now, log and proceed to delete metadata.
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

  return res.status(405).json({ error: 'Method Not Allowed' });
};

export default withErrorHandler(withAuth(handler));
