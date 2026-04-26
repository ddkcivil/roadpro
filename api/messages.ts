import type { VercelRequest, VercelResponse } from '@vercel/node';
import { supabaseAdmin } from './_utils/supabaseClient.js';
import { withErrorHandler } from './_utils/errorHandler.js';
import { withAuth } from './_utils/auth.js';

const handler = async function (req: VercelRequest, res: VercelResponse) {
  const { projectId, receiverId, after } = req.query;
  const currentUser = (req as any).user;

  if (req.method === 'GET') {
    if (!projectId || typeof projectId !== 'string') {
      return res.status(400).json({ error: 'projectId is required' });
    }

    let queryBuilder = supabaseAdmin.from('messages').select('*');

    // Apply project filter
    queryBuilder = queryBuilder.eq('project_id', projectId);

    // Apply timestamp filter for 'after'
    if (after && typeof after === 'string') {
      queryBuilder = queryBuilder.gt('timestamp', after);
    }

    // Apply sorting
    queryBuilder = queryBuilder.order('timestamp', { ascending: true });

    try {
      const { data, error } = await queryBuilder;
      if (error) throw error;

      let filteredData = data || [];

      // In-memory filtering to avoid PostgREST UUID casting issues on TEXT columns
      if (receiverId) {
        if (receiverId === 'general') {
          filteredData = filteredData.filter(msg => msg.receiver_id === 'general');
        } else {
          // Private chat: messages between currentUser and receiverId
          filteredData = filteredData.filter(msg =>
            (msg.sender_id === currentUser.userId && msg.receiver_id === receiverId) ||
            (msg.sender_id === receiverId && msg.receiver_id === currentUser.userId)
          );
        }
      } else {
        // All relevant messages for the project (general + user's private messages)
        filteredData = filteredData.filter(msg =>
          msg.receiver_id === 'general' ||
          msg.sender_id === currentUser.userId ||
          msg.receiver_id === currentUser.userId
        );
      }

      const limitNum = parseInt(req.query.limit as string) || 100;
      const offsetNum = parseInt(req.query.offset as string) || 0;
      filteredData = filteredData.slice(offsetNum, offsetNum + limitNum);

      return res.status(200).json(filteredData);
    } catch (queryError: any) {
      console.error('Messages query failed:', queryError);
      return res.status(500).json({ error: 'Failed to fetch messages', details: queryError.message });
    }
  }

  if (req.method === 'POST') {
    const { content, receiverId: bodyReceiverId, projectId: bodyProjectId, attachmentUrl, attachmentName, attachmentType } = req.body;

    if ((!content || content.trim() === '') && !attachmentUrl) {
      return res.status(400).json({ error: 'Message content or attachment is required' });
    }

    if (!bodyReceiverId || !bodyProjectId) {
      return res.status(400).json({ error: 'receiverId and projectId are required' });
    }

    try {
      const { data: newMessage, error } = await supabaseAdmin
        .from('messages')
        .insert([{
          sender_id: currentUser.userId,
          receiver_id: bodyReceiverId,
          content: content || '',
          project_id: bodyProjectId,
          timestamp: new Date().toISOString(),
          read: false,
          attachment_url: attachmentUrl || null,
          attachment_name: attachmentName || null,
          attachment_type: attachmentType || null,
        }])
        .select('*')
        .single();

      if (error) throw error;
      return res.status(201).json(newMessage);
    } catch (error: any) {
      console.error('Error creating message:', error);
      return res.status(500).json({ error: 'Failed to create message', details: error.message });
    }
  }

  if (req.method === 'PUT') {
    const { messageId, action } = req.query;
    if (action === 'read' && messageId && typeof messageId === 'string') {
      try {
        const { error } = await supabaseAdmin
          .from('messages')
          .update({ read: true, read_at: new Date().toISOString() })
          .eq('id', messageId)
          .eq('receiver_id', currentUser.userId);

        if (error) throw error;
        return res.status(200).json({ success: true });
      } catch (error: any) {
        return res.status(500).json({ error: 'Failed to mark message as read', details: error.message });
      }
    }
  }

  return res.status(405).json({ error: 'Method Not Allowed' });
};

export default withErrorHandler(withAuth(handler));
