import type { VercelRequest, VercelResponse } from '@vercel/node';
import { put, del } from '@vercel/blob';
import { sql } from '@vercel/postgres';
import { connectToDatabase } from './_utils/dbConnect.js';
import { withErrorHandler } from './_utils/errorHandler.js';
import { withAuth } from './_utils/auth.js';
import { generateUniqueId } from './_utils/uuidUtils.js';

const handler = async function (req: VercelRequest, res: VercelResponse) {
  const { id } = req.query;
  
  // Ensure database connections and tables are ready
  await connectToDatabase();

  if (req.method === 'GET') {
    if (!id || typeof id !== 'string') {
      return res.status(400).json({ error: 'File ID is required' });
    }

    try {
      // 1. Try Postgres (New storage)
      const { rows } = await sql`
        SELECT blob_url FROM document_versions 
        WHERE doc_id = ${id} 
        ORDER BY version_num DESC 
        LIMIT 1
      `;

      if (rows && rows.length > 0) {
        return res.redirect(rows[0].blob_url);
      }
      
      // 2. Try Version ID directly
      const { rows: verRows } = await sql`
        SELECT blob_url FROM document_versions 
        WHERE id = ${id}
      `;
      
      if (verRows.length > 0) {
        return res.redirect(verRows[0].blob_url);
      }

      return res.status(404).json({ error: 'File not found' });
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
      
      // Upload to Vercel Blob
      const blob = await put(`files/${name}`, buffer, {
        contentType,
        access: 'public',
      });

      const finalDocId = docId || `doc-${generateUniqueId()}`;
      const versionId = `ver-${generateUniqueId()}`;

      if (!docId) {
        // Create new document entry
        await sql`
          INSERT INTO project_documents (
            id, project_id, name, folder, tags, subject, ref_no, size, type, status, metadata
          ) VALUES (
            ${finalDocId}, ${projectId || null}, ${name}, ${folder || null}, 
            ${tags || []}, ${subject || null}, ${refNo || null}, 
            ${buffer.length}, ${contentType}, 'Active', ${JSON.stringify(metadata || {})}
          )
        `;
      } else {
        // Update document size/type/updated_at
        await sql`
          UPDATE project_documents 
          SET size = ${buffer.length}, type = ${contentType}, updated_at = CURRENT_TIMESTAMP
          WHERE id = ${finalDocId}
        `;
      }

      // Get current version count to determine next version number
      const { rows: versionRows } = await sql`
        SELECT COUNT(*) as count FROM document_versions WHERE doc_id = ${finalDocId}
      `;
      const nextVersionNum = parseInt(versionRows[0].count) + 1;

      // Create version entry
      await sql`
        INSERT INTO document_versions (
          id, doc_id, blob_url, version_num, size, notes
        ) VALUES (
          ${versionId}, ${finalDocId}, ${blob.url}, ${nextVersionNum}, ${buffer.length}, ${metadata?.notes || null}
        )
      `;

      return res.status(201).json({
        id: finalDocId,
        versionId: versionId,
        name,
        contentType,
        size: buffer.length,
        url: `/api/files?id=${finalDocId}`,
        blobUrl: blob.url
      });
    } catch (error: any) {
      console.error('Failed to upload file:', error);
      return res.status(500).json({ error: 'Failed to upload file', details: error.message });
    }
  }

  if (req.method === 'DELETE') {
    const userRole = (req as any).user?.role;
    if (userRole !== 'Admin' && userRole !== 'ADMIN' && userRole !== 'Project Manager') {
      return res.status(403).json({ error: 'Only admins or project managers can delete files' });
    }

    if (!id || typeof id !== 'string') {
      return res.status(400).json({ error: 'File ID is required' });
    }

    try {
      // Get all blob URLs for this document to delete from storage
      const { rows: versions } = await sql`
        SELECT blob_url FROM document_versions WHERE doc_id = ${id}
      `;

      for (const version of versions) {
        try {
          await del(version.blob_url);
        } catch (delError) {
          console.error(`Failed to delete blob ${version.blob_url}:`, delError);
        }
      }

      // Delete from Postgres (cascading delete should handle versions)
      await sql`DELETE FROM project_documents WHERE id = ${id}`;
      
      return res.status(204).end();
    } catch (error: any) {
      console.error('Failed to delete file:', error);
      return res.status(500).json({ error: 'Failed to delete file', details: error.message });
    }
  }

  return res.status(405).json({ error: 'Method Not Allowed' });
};

export default withErrorHandler(withAuth(handler));
