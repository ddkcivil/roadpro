// api/pending-registrations/index.ts
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { connectToDatabase } from '../_utils/mysqlConnect.js'; // Changed import path
import { generateUniqueId } from '../_utils/uuidUtils.js'; // Import from local _utils
import { withErrorHandler } from '../_utils/errorHandler.js'; // Adjust path as needed
import { PendingRegistrationCreationAttributes } from '../_utils/mysqlConnect.js';

export default withErrorHandler(async function (req: VercelRequest, res: VercelResponse) {
  if (req.method === 'GET') {
    try {
      const { PendingRegistration } = await connectToDatabase();
      // Fetch all pending registrations
      const pendingRegistrations = await PendingRegistration.findAll();
      res.status(200).json(pendingRegistrations);
    } catch (error: any) {
      console.error('Failed to fetch pending registrations:', error);
      res.status(500).json({ error: 'Failed to fetch pending registrations', details: error.message });
    }
  } else if (req.method === 'POST') {
    try {
      const { PendingRegistration, User } = await connectToDatabase(); // Get User model as well
      const { name, email, phone, requestedRole } = req.body;

      if (!name || !email || !requestedRole) {
        res.status(400).json({ error: 'Name, email, and requested role are required.' });
        return;
      }

      // Basic email format validation
      if (!/^[\w\.-]+@[\w\.-]+\.[a-zA-Z]{2,}$/.test(email)) {
        res.status(400).json({ error: 'Please enter a valid email address.' });
        return;
      }

      // Check if a pending registration with this email already exists
      const existingPending = await PendingRegistration.findOne({ where: { email: email.toLowerCase() } });
      if (existingPending) {
        res.status(409).json({ error: 'A pending registration with this email already exists.' });
        return;
      }

      // Check if a user with this email already exists in the approved users collection
      const existingUser = await User.findOne({ where: { email: email.toLowerCase() } });
      if (existingUser) {
        res.status(409).json({ error: 'A user with this email already exists.' });
        return;
      }

      // Create a new pending registration using Sequelize's create method
      const newPendingRegistration = await PendingRegistration.create({
        id: generateUniqueId(),
        name,
        email: email.toLowerCase(),
        phone: phone || '',
        requestedRole,
        status: 'pending', // Default status
      } as any);

      res.status(201).json({
        message: 'Registration submitted successfully. Awaiting administrator approval.',
        pendingRegistration: newPendingRegistration,
      });
    } catch (error: any) {
      console.error('Error submitting pending registration:', error);
      res.status(500).json({ error: 'Failed to submit registration.', details: error.message });
    }
  } else {
    res.status(405).json({ error: 'Method Not Allowed' });
  }
})
