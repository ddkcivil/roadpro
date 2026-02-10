// api/debug-users.ts
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { connectToDatabase } from './_utils/mysqlConnect.js'; // Changed import path
import { withErrorHandler } from './_utils/errorHandler.js';

export default withErrorHandler(async function (req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') {
    res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    const { User } = await connectToDatabase();
    const users = await User.findAll({ attributes: { exclude: ['password'] } }); // Sequelize: findAll, exclude password
    res.status(200).json(users);
  } catch (error: any) {
    console.error('Failed to fetch users for debugging:', error);
    res.status(500).json({ error: 'Failed to fetch users for debugging', details: error.message });
  }
})
