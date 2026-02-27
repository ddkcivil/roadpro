// api/pending-registrations/[id]/reject.ts
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { connectToDatabase } from '../../_utils/dbConnect.js';
import { withErrorHandler } from '../../_utils/errorHandler.js';

export default withErrorHandler(async function (req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method Not Allowed' });
    return;
  }

  try {
    const { PendingRegistration } = await connectToDatabase();
    const { id } = req.query;

    if (!id || typeof id !== 'string') {
      res.status(400).json({ error: 'Registration ID is required' });
      return;
    }

    // Find and delete the pending registration
    const registration = await PendingRegistration.findOneAndDelete({ id });

    if (!registration) {
      res.status(404).json({ error: 'Registration not found' });
      return;
    }

    res.status(204).end();
  } catch (error: any) {
    console.error('Failed to reject registration:', error);
    res.status(500).json({ error: 'Failed to reject registration', details: error.message });
  }
})
