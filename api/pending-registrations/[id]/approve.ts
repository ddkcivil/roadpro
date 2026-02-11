// api/pending-registrations/[id]/approve.ts
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { connectToDatabase } from '../../_utils/mysqlConnect.js'; // Changed import path
// No longer need mongoose
import bcrypt from 'bcrypt';

import { withErrorHandler } from '../../_utils/errorHandler.js'; // Adjust path as needed
import { UserAttributes, UserCreationAttributes, PendingRegistrationInstance } from '../../_utils/mysqlConnect.js';

export default async function (req: VercelRequest, res: VercelResponse) {
  res.status(200).json({ message: 'Approve endpoint reached', id: req.query.id });
}
