import type { VercelRequest, VercelResponse } from '@vercel/node';
import { getSupabaseAdmin, isSupabaseConfigured } from './utils/supabaseClient.js';
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
  // Get Supabase admin client using getter
  if (!isSupabaseConfigured()) {
    return res.status(503).json({ error: 'Database service not configured' });
  }
  const supabaseAdmin = getSupabaseAdmin();
  if (!supabaseAdmin) {
    return res.status(503).json({ error: 'Database service not available' });
  }
  
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
      console.log('[Messages API] Executing Supabase query for project:', projectId);
      console.log('[Messages API] Query parameters: receiverId=', receiverId, 'after=', after);
      console.log('[Messages API] Authenticated user details:', { userId: currentUser?.userId, roles: (currentUser as any)?.roles }); // Log user details without logging sensitive data

      const { data, error } = await queryBuilder;
      
      if (error) {
        console.error('[Messages API] Supabase query error:', error);
        throw error;
      }

      console.log('[Messages API] Supabase query succeeded, received', data?.length || 0, 'messages');
      let filteredData = data || [];

      // Log values before filtering
      const currentUserId = String(currentUser?.userId || '');
      const receiverIdParam = String(receiverId || ''); // Ensure receiverId is a string, default to empty string if undefined

      console.log('[Messages API] Filtering messages. CurrentUserID:', currentUserId, 'ReceiverIDParam:', receiverIdParam);
      
      if (receiverIdParam) { // Check if receiverIdParam is a non-empty string
        if (receiverIdParam === 'general') {
          // Filter for general messages
          console.log('[Messages API] Applying filter for general messages.');
          filteredData = filteredData.filter((msg: any) => msg.receiver_id === 'general');
          console.log('[Messages API] Filtered for general messages. Count:', filteredData.length);
        } else {
          // Private chat: messages between currentUser and receiverId
          console.log('[Messages API] Filtering for private messages between:', currentUserId, 'and', receiverIdParam);
          filteredData = filteredData.filter((msg: any) => {
            const senderIdDb = String(msg.sender_id || '');
            const receiverIdDb = String(msg.receiver_id || '');

            const isMatch1 = senderIdDb === currentUserId && receiverIdDb === receiverIdParam;
            const isMatch2 = senderIdDb === receiverIdParam && receiverIdDb === currentUserId;
            
            return isMatch1 || isMatch2;
          });
          console.log('[Messages API] Filtered for private messages. Count:', filteredData.length);
        }
      } else {
        // All relevant messages for the project (general + user's private messages)
        console.log('[Messages API] Filtering for general and user messages for user ID:', currentUserId);
        filteredData = filteredData.filter((msg: any) => {
          const senderIdDb = String(msg.sender_id || '');
          const receiverIdDb = String(msg.receiver_id || '');
          return receiverIdDb === 'general' || senderIdDb === currentUserId || receiverIdDb === currentUserId;
        });
        console.log('[Messages API] Filtered for general and user messages. Count:', filteredData.length);
      }

      const limitNum = parseInt(req.query.limit as string) || 100;
      const offsetNum = parseInt(req.query.offset as string) || 0;
      filteredData = filteredData.slice(offsetNum, offsetNum + limitNum);

      console.log('[Messages API] Final data prepared for response.');
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
