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
    queryBuilder = queryBuilder.eq('projectId', projectId);

    // Apply receiver filter (general or private chat)
    if (receiverId) {
      if (receiverId === 'general') {
        queryBuilder = queryBuilder.eq('receiverId', 'general');
      } else {
        // Private chat: messages between currentUser and receiverId
        queryBuilder = queryBuilder.or(
          `and(senderId.eq.${currentUser.userId},receiverId.eq.${receiverId}),and(senderId.eq.${receiverId},receiverId.eq.${currentUser.userId})`
        );
      }
    } else {
      // All relevant messages for the project
      queryBuilder = queryBuilder.or(
        `receiverId.eq.general,senderId.eq.${currentUser.userId},receiverId.eq.${currentUser.userId}`
      );
    }

    // Apply timestamp filter for 'after'
    if (after && typeof after === 'string') {
      queryBuilder = queryBuilder.gt('timestamp', after);
    }

    // Apply sorting and pagination
    const limitNum = parseInt(req.query.limit as string) || 100;
    const offsetNum = parseInt(req.query.offset as string) || 0;
    
    // Use range for pagination, it includes limit implicitly
    queryBuilder = queryBuilder
      .order('timestamp', { ascending: true })
      .range(offsetNum, offsetNum + limitNum - 1);

    try {
      const { data, error } = await queryBuilder;
      if (error) throw error;
      return res.status(200).json(data || []);
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
          senderId: currentUser.userId,
          receiverId: bodyReceiverId,
          content: content || '',
          projectId: bodyProjectId,
          timestamp: new Date().toISOString(),
          read: false,
          attachmentUrl: attachmentUrl || null,
          attachmentName: attachmentName || null,
          attachmentType: attachmentType || null,
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
          .update({ read: true, readAt: new Date().toISOString() })
          .eq('id', messageId)
          .eq('receiverId', currentUser.userId);

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
