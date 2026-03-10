import type { VercelRequest, VercelResponse } from '@vercel/node';
import { connectToDatabase } from './_utils/dbConnect.js';
import { withErrorHandler } from './_utils/errorHandler.js';
import { withAuth } from './_utils/auth.js';
import { v4 as uuidv4 } from 'uuid';

const handler = async function (req: VercelRequest, res: VercelResponse) {
  return withAuth(async (req: any, res: VercelResponse) => {
    const { Message } = await connectToDatabase();
    const { projectId, receiverId, after } = req.query;
    const currentUser = req.user;

    if (req.method === 'GET') {
      if (!projectId) {
        return res.status(400).json({ error: 'projectId is required' });
      }

      let query: any = { projectId };

      if (receiverId) {
        if (receiverId === 'general') {
          query.receiverId = 'general';
        } else {
          // Private chat: messages between currentUser and receiverId
          query.$or = [
            { senderId: currentUser.userId, receiverId: receiverId },
            { senderId: receiverId, receiverId: currentUser.userId }
          ];
        }
      } else {
        // All messages for the project that the user is involved in
        query.$or = [
          { receiverId: 'general' },
          { senderId: currentUser.userId },
          { receiverId: currentUser.userId }
        ];
      }

      if (after) {
        query.createdAt = { $gt: new Date(after as string) };
      }

      const messages = await Message.find(query).sort({ createdAt: 1 }).limit(100);
      return res.status(200).json(messages);
    }

    if (req.method === 'POST') {
      const { content, receiverId, projectId } = req.body;

      if (!content || !receiverId || !projectId) {
        return res.status(400).json({ error: 'content, receiverId, and projectId are required' });
      }

      const newMessage = await Message.create({
        id: uuidv4(),
        senderId: currentUser.userId,
        receiverId,
        content,
        projectId,
        timestamp: new Date().toISOString(),
        read: false
      });

      return res.status(201).json(newMessage);
    }

    if (req.method === 'PUT') {
        const { messageId, action } = req.query;
        if (action === 'read' && messageId) {
            await Message.updateOne(
                { id: messageId, receiverId: currentUser.userId },
                { $set: { read: true } }
            );
            return res.status(200).json({ success: true });
        }
    }

    return res.status(405).json({ error: 'Method Not Allowed' });
  })(req, res);
};

export default withErrorHandler(handler);
