import type { VercelRequest, VercelResponse } from '@vercel/node';
import { supabaseAdmin } from './utils/supabaseClient.js';
import { withErrorHandler } from './utils/errorHandler.js';
import { withAuth } from './utils/auth.js';

function mapMessageFromDb(dbMsg: any): any {
  if (!dbMsg) return dbMsg;
  return {
    id: dbMsg.id,
    senderId: dbMsg.sender_id,
    receiverId: dbMsg.receiver_id,
    content: dbMsg.content,
    timestamp: dbMsg.timestamp,
    read: dbMsg.read,
    projectId: dbMsg.project_id,
    attachmentUrl: dbMsg.attachment_url,
    attachmentName: dbMsg.attachment_name,
    attachmentType: dbMsg.attachment_type,
    createdAt: dbMsg.created_at,
    readAt: dbMsg.read_at
  };
}

const handler = async function (req: VercelRequest, res: VercelResponse) {
  const { projectId, receiverId, after } = req.query;
  const currentUser = (req as any).user;

  console.log('[Messages API] Request received. projectId:', projectId, 'user:', currentUser?.userId);

  if (req.method === 'GET') {
    if (!projectId || typeof projectId !== 'string') {
      console.log('[Messages API] Missing projectId');
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
      console.log('[Messages API] Executing Supabase query...');
      const { data, error } = await queryBuilder;
      
      if (error) {
        console.error('[Messages API] Supabase query error:', error);
        throw error;
      }

      console.log('[Messages API] Query succeeded, received', data?.length || 0, 'messages');
      let filteredData = data || [];

      // In-memory filtering to avoid PostgREST UUID casting issues on TEXT columns
      if (receiverId) {
        if (receiverId === 'general') {
          filteredData = filteredData.filter((msg: any) => msg.receiver_id === 'general');
        } else {
          // Private chat: messages between currentUser and receiverId
          filteredData = filteredData.filter((msg: any) =>
            (msg.sender_id === currentUser.userId && msg.receiver_id === receiverId) ||
            (msg.sender_id === receiverId && msg.receiver_id === currentUser.userId)
          );
        }
      } else {
        // All relevant messages for the project (general + user's private messages)
        filteredData = filteredData.filter((msg: any) =>
          msg.receiver_id === 'general' ||
          msg.sender_id === currentUser.userId ||
          msg.receiver_id === currentUser.userId
        );
      }

      const limitNum = parseInt(req.query.limit as string) || 100;
      const offsetNum = parseInt(req.query.offset as string) || 0;
      filteredData = filteredData.slice(offsetNum, offsetNum + limitNum);

      return res.status(200).json(filteredData.map(mapMessageFromDb));
    } catch (queryError: any) {
      console.error('[Messages API] Messages query failed:', queryError);
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
      return res.status(201).json(mapMessageFromDb(newMessage));
    } catch (error: any) {
      console.error('[Messages API] Error creating message:', error);
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
