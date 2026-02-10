// api/pending-registrations/[id]/index.ts
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { connectToDatabase } from '../../_utils/mysqlConnect.js'; // Changed import path
// No longer need mongoose

import { withErrorHandler } from '../../_utils/errorHandler.js'; // Adjust path as needed

export default withErrorHandler(async function (req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'DELETE') {
    res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    const { PendingRegistration } = await connectToDatabase();
    const { id } = req.query; // Access id from req.query for dynamic routes

    if (!id || typeof id !== 'string') {
      res.status(400).json({ error: 'Registration ID is required' });
    }

    // Use Sequelize's destroy method for deletion
    const result = await PendingRegistration.destroy({
      where: { id: id }
    });
    
    // result will be 0 if no records were deleted (i.e., not found)
    if (result === 0) {
      res.status(404).json({ error: 'Registration not found' });
    }

    res.status(204).send(''); // 204 No Content for successful deletion
  } catch (error: any) {
    console.error('Failed to reject registration:', error);
    res.status(500).json({ error: 'Failed to reject registration', details: error.message });
  }
})
