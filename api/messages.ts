import type { VercelRequest, VercelResponse } from '@vercel/node';
import { supabaseAdmin } from './_utils/supabaseClient.js';
import { withErrorHandler } from './_utils/errorHandler.js';
import { withAuth } from './_utils/auth.js';
import { v4 as uuidv4 } from 'uuid';

const handler = async function (req: VercelRequest, res: VercelResponse) {
  // Assuming 'messages' table in Supabase with columns like:
  // id (UUID, primary key, auto-generated)
  // project_id (TEXT)
  // sender_id (TEXT)
  // receiver_id (TEXT)
  // content (TEXT)
  // timestamp (TIMESTAMPTZ)
  // read (BOOLEAN)
  // attachment_url (TEXT)
  // attachment_name (TEXT)
  // attachment_type (TEXT)

  return withAuth(async (req: any, res: VercelResponse) => {
    const { projectId, receiverId, after } = req.query;
    const currentUser = req.user;

    if (req.method === 'GET') {
      if (!projectId || typeof projectId !== 'string') {
        return res.status(400).json({ error: 'projectId is required' });
      }

      let queryBuilder = supabaseAdmin.from('messages').select('*');

      // Apply project filter
      queryBuilder = queryBuilder.eq('projectId', projectId);

      // Apply receiver filter (general or private chat)
      if (receiverId) {
        if (receiverId === 'general') {
          queryBuilder = queryBuilder.eq('receiverId', 'general');
        } else {
          // Private chat: messages where sender and receiver match currentUser and receiverId in any order
          queryBuilder = queryBuilder.or(`senderId.eq.${currentUser.userId},receiverId.eq.${receiverId}`, { foreignTable: `senderId.eq.${receiverId},receiverId.eq.${currentUser.userId}` });
        }
      } else {
        // All messages for the project that the user is involved in (sender or receiver or general)
        queryBuilder = queryBuilder.or(
          `receiverId.eq.general,senderId.eq.${currentUser.userId},receiverId.eq.${currentUser.userId}`,
          {}
        );
      }

      // Apply timestamp filter for 'after'
      if (after && typeof after === 'string') {
        queryBuilder = queryBuilder.gt('timestamp', after);
      }

      // Apply sorting and pagination
      const limitNum = parseInt(req.query.limit as string) || 100;
      const offsetNum = parseInt(req.query.offset as string) || 0;
      queryBuilder = queryBuilder.order('timestamp', { ascending: true }) // Fetching older messages first for chat history
                                .limit(limitNum)
                                .range(offsetNum, offsetNum + limitNum - 1);

      const { data: messages, error } = await queryBuilder;
      if (error) throw error;

      return res.status(200).json(messages || []);
    }

    if (req.method === 'POST') {
      console.log('Received message POST request:', { ...req.body, attachmentUrl: req.body.attachmentUrl ? '(truncated)' : undefined });
      const { content, receiverId, projectId, attachmentUrl, attachmentName, attachmentType } = req.body;

      if ((!content || content.trim() === '') && !attachmentUrl) {
        return res.status(400).json({ error: 'Message content or attachment is required' });
      }

      if (!receiverId || !projectId) {
        return res.status(400).json({ error: 'receiverId and projectId are required' });
      }

      try {
        const { data: newMessage, error } = await supabaseAdmin
          .from('messages')
          .insert([{
            senderId: currentUser.userId,
            receiverId,
            content: content || '',
            projectId,
            timestamp: new Date().toISOString(),
            read: false,
            attachmentUrl,
            attachmentName,
            attachmentType
          }])
          .select('*') // Return the inserted row
          .single(); // Expect a single row

        if (error) throw error;

        console.log('Message created successfully:', newMessage.id);
        return res.status(201).json(newMessage);
      } catch (error: any) {
        console.error('Error creating message:', error);
        return res.status(500).json({ error: 'Failed to create message', details: error.message });
      }
    }

    if (req.method === 'PUT') {
        const { messageId, action } = req.query;
        if (action === 'read' && messageId && typeof messageId === 'string') {
            // Update message to read status for the current user
            const { error } = await supabaseAdmin
                .from('messages')
                .update({ read: true, read_at: new Date().toISOString() }) // Added read_at timestamp
                .eq('id', messageId)
                .eq('receiverId', currentUser.userId); // Ensure only the receiver can mark as read
            
            if (error) throw error;
            
            return res.status(200).json({ success: true });
        }
        // Handle other PUT actions if necessary
    }

    return res.status(405).json({ error: 'Method Not Allowed' });
  })(req, res);
};

export default withErrorHandler(handler);
