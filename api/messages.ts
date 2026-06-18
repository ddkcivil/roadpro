import type { VercelRequest, VercelResponse } from '@vercel/node';
import { getSupabaseAdmin, isSupabaseConfigured } from './_utils/supabaseClient.ts';
import { withErrorHandler } from './_utils/errorHandler.ts';
import { withAuth } from './_utils/auth.ts';

function mapMessageFromDb(dbMsg: any): any {
  if (!dbMsg) return dbMsg;
  return {
    id: dbMsg.id,
    senderId: dbMsg.sender_id,
    receiverId: dbMsg.receiver_id,
    content: dbMsg.content,
    timestamp: dbMsg.timestamp || dbMsg.created_at, // Support both column names for compatibility
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
  const supabaseReady = isSupabaseConfigured();
  console.log('[Messages API] Supabase configured:', supabaseReady);
  
  if (!supabaseReady) {
    return res.status(503).json({ error: 'Database service not configured' });
  }
  const supabaseAdmin = getSupabaseAdmin();
  console.log('[Messages API] Supabase admin client:', supabaseAdmin ? 'initialized' : 'NULL');
  
  if (!supabaseAdmin) {
    return res.status(503).json({ error: 'Database service not available' });
  }
  
  const { projectId, receiverId, after } = req.query;
  // NOTE: projectId here refers to the application's internal project ID (e.g., 'proj-123'),
  // not the Vercel infrastructure Project ID (e.g., 'prj_abc').
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

    // Apply timestamp filter for 'after' - use created_at column (not timestamp)
    if (after && typeof after === 'string' && after.trim()) {
      queryBuilder = queryBuilder.gt('created_at', after);
    }

    // Apply sorting - use created_at column
    queryBuilder = queryBuilder.order('created_at', { ascending: true });

    try {
      console.log('[Messages API] Executing Supabase query for project:', projectId);
      console.log('[Messages API] Query parameters: receiverId=', receiverId, 'after=', after);
      console.log('[Messages API] Authenticated user details:', { userId: currentUser?.userId, roles: (currentUser as any)?.roles });

      console.log('[Messages API] About to execute query...');
      let queryResult;
      try {
        queryResult = await queryBuilder;
      } catch (queryExeError: any) {
        console.error('[Messages API] Query execution error:', queryExeError.message, queryExeError.stack);
        throw queryExeError;
      }
      
      const { data, error } = queryResult;
      
      if (error) {
        console.error('[Messages API] Supabase query error:', error);
        throw error;
      }
      
      console.log('[Messages API] Query executed successfully, data type:', typeof data, 'is array:', Array.isArray(data));

      console.log('[Messages API] Supabase query succeeded, received', data?.length || 0, 'messages');
      let filteredData = data || [];

      // Log values before filtering
      const currentUserId = String(currentUser?.userId || '');
      const receiverIdParam = String(receiverId || '');

      console.log('[Messages API] Filtering messages. CurrentUserID:', currentUserId, 'ReceiverIDParam:', receiverIdParam);
      
      if (receiverIdParam) {
        if (receiverIdParam === 'general') {
          console.log('[Messages API] Applying filter for general messages.');
          filteredData = filteredData.filter((msg: any) => msg.receiver_id === 'general');
          console.log('[Messages API] Filtered for general messages. Count:', filteredData.length);
        } else {
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
      console.log('[Messages API] Attempting to insert message. Body:', JSON.stringify(req.body));
      
      // Build insert data dynamically to handle optional schema columns
      const insertData: any = {
        sender_id: currentUser.userId,
        receiver_id: bodyReceiverId,
        content: content || '',
        project_id: bodyProjectId,
        read: false,
      };
      
      // Only add attachment fields if provided
      if (attachmentUrl) insertData.attachment_url = attachmentUrl;
      if (attachmentName) insertData.attachment_name = attachmentName;
      if (attachmentType) insertData.attachment_type = attachmentType;

      const { data: newMessage, error } = await supabaseAdmin
        .from('messages')
        .insert([insertData])
        .select('*')
        .single();

      if (error) {
        console.error('[Messages API] Supabase Insert Error:', JSON.stringify(error));
        throw error;
      }
      return res.status(201).json(mapMessageFromDb(newMessage));
    } catch (error: any) {
      console.error('[Messages API] Error creating message:', error);
      return res.status(500).json({ error: 'Failed to create message', details: error.message, code: error.code, hint: error.hint, message: error.message });
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
