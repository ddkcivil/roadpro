import type { VercelRequest, VercelResponse } from '@vercel/node';
import { connectToDatabase } from './_utils/dbConnect.js';
import { withErrorHandler } from './_utils/errorHandler.js';
import { withAuth } from './_utils/auth.js';
import { generateUniqueId } from './_utils/uuidUtils.js';

const handler = async function (req: VercelRequest, res: VercelResponse) {
  const { id } = req.query;

  if (req.method === 'GET') {
    if (!id || typeof id !== 'string') {
      return res.status(400).json({ error: 'File ID is required' });
    }

    try {
      const { FileStore } = await connectToDatabase();
      const file = await FileStore.findOne({ id });

      if (!file) {
        return res.status(404).json({ error: 'File not found' });
      }

      // Set the appropriate content type and send the buffer
      res.setHeader('Content-Type', file.contentType);
      res.setHeader('Content-Length', file.size);
      res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
      return res.status(200).send(file.data);
    } catch (error: any) {
      console.error('Failed to fetch file:', error);
      return res.status(500).json({ error: 'Failed to fetch file', details: error.message });
    }
  }

  if (req.method === 'POST') {
    try {
      const { FileStore } = await connectToDatabase();
      const { name, contentType, base64Data, metadata } = req.body;

      if (!base64Data || !name || !contentType) {
        return res.status(400).json({ error: 'name, contentType, and base64Data are required' });
      }

      // Convert base64 to Buffer
      // Data URL format: data:image/jpeg;base64,/9j/4AAQSkZJRg...
      const base64Content = base64Data.includes(';base64,') 
        ? base64Data.split(';base64,')[1] 
        : base64Data;
      
      const buffer = Buffer.from(base64Content, 'base64');
      const fileId = `file-${generateUniqueId()}`;

      const newFile = new FileStore({
        id: fileId,
        name,
        contentType,
        data: buffer,
        size: buffer.length,
        metadata: metadata || {},
        uploadDate: new Date()
      });

      await newFile.save();

      return res.status(201).json({
        id: fileId,
        name,
        contentType,
        size: buffer.length,
        url: `/api/files?id=${fileId}`
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
      const { FileStore } = await connectToDatabase();
      const deletedFile = await FileStore.findOneAndDelete({ id });
      
      if (!deletedFile) {
        return res.status(404).json({ error: 'File not found' });
      }

      return res.status(204).end();
    } catch (error: any) {
      console.error('Failed to delete file:', error);
      return res.status(500).json({ error: 'Failed to delete file', details: error.message });
    }
  }

  return res.status(405).json({ error: 'Method Not Allowed' });
};

export default withErrorHandler(withAuth(handler));
