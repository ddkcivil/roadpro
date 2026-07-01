import { useState, useEffect, useCallback, useRef } from 'react';
import { Message, UserWithPermissions } from '../types';
import { realApiService } from '../services/api/realApiService';

export const useMessages = (currentUser: UserWithPermissions | null, projectId: string, isAuthenticated: boolean) => {
  console.log('[useMessages] Hook initialized.', { projectId, currentUser: currentUser?.id, isAuthenticated });
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const lastFetchAfterRef = useRef<string>('');
  const isFirstFetchRef = useRef<boolean>(true);
  const currentUserIdRef = useRef<string | null>(null);
  const projectIdRef = useRef<string>('');

  // Track stable values to avoid unnecessary re-initialization
  useEffect(() => {
    currentUserIdRef.current = currentUser?.id || null;
    projectIdRef.current = projectId;
  }, [currentUser?.id, projectId]);

const getTokenWithFallback = (): string | null => {
  // 1. Try localStorage
  let token = localStorage.getItem('roadmaster-token');
  if (token) return token;
  
  // 2. Try sessionStorage
  token = sessionStorage.getItem('roadmaster-token-session');
  if (token) {
    // Sync to localStorage
    try {
      localStorage.setItem('roadmaster-token', token);
    } catch (e) { /* ignore */ }
    return token;
  }
  
  // 3. Try cookie
  if (document?.cookie) {
    const match = document.cookie.match(/roadmaster-access=([^;]+)/);
    if (match) {
      token = decodeURIComponent(match[1]);
      // Sync to localStorage
      try {
        localStorage.setItem('roadmaster-token', token);
      } catch (e) { /* ignore */ }
      return token;
    }
  }
  
  return null;
};

const fetchMessages = useCallback(async (isInitial = false) => {
    if (!isAuthenticated || !projectId || !currentUser) {
      return;
    }

    const tokenCheck = getTokenWithFallback();
    if (!tokenCheck) {
      console.error('[useMessages] ⚠ No token in any storage — aborting fetch despite isAuthenticated=true. Auth state may still be initializing.');
      if (isInitial) setIsLoading(false);
      return;
    }

    console.log('[useMessages] ✓ fetchMessages proceeding:', { projectId, currentUser: currentUser.id });
    try {
      if (isInitial) setIsLoading(true);

      // Use the 'after' timestamp for incremental fetches so we only get new messages
      const afterParam = isInitial ? undefined : (lastFetchAfterRef.current || undefined);
      const newMessages = await realApiService.getMessages(projectId, undefined, afterParam);

      // Update the 'after' timestamp to the latest message's timestamp for next poll
      if (newMessages && newMessages.length > 0) {
        const latestMsg = newMessages[newMessages.length - 1];
        if (latestMsg.timestamp) {
          lastFetchAfterRef.current = latestMsg.timestamp;
        }
      }

      setMessages(prev => {
        const messageMap = new Map();
        prev.forEach(m => messageMap.set(m.id, m));
        newMessages.forEach(m => messageMap.set(m.id, m));
        return Array.from(messageMap.values()).sort((a, b) =>
          new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
        );
      });
    } catch (error: any) {
      console.error('Failed to fetch messages:', error);
      // If fetch fails due to auth, trigger the failure event
      if (error.status === 401 || error.message?.includes('Unauthorized')) {
        window.dispatchEvent(new CustomEvent('roadmaster-auth-failure'));
      }
    } finally {
      if (isInitial) setIsLoading(false);
    }
  }, [projectId, currentUser?.id, isAuthenticated]); // Use currentUser?.id instead of currentUser to avoid re-fetch on object ref change

  // Refactored useEffect to strictly control fetching and interval based on auth/context
  useEffect(() => {
    console.log('[useMessages] useEffect running with:', { isAuthenticated, projectId, currentUser: currentUser?.id });

    // Function to perform fetch and set interval
    const setupMessageFetching = () => {
      console.log('[useMessages] Setting up message fetching and interval.');
      lastFetchAfterRef.current = ''; // Reset 'after' on new setup
      isFirstFetchRef.current = true;
      fetchMessages(true); // Perform initial fetch

      intervalRef.current = setInterval(() => {
        fetchMessages(); // Fetch messages periodically
      }, 10000); // 10 second polling
    };

    // Function to clean up
    const cleanupMessageFetching = () => {
      console.log('[useMessages] Clearing interval and resetting messages.');
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      setMessages([]); // Clear messages
      setIsLoading(false); // Reset loading state
      lastFetchAfterRef.current = '';
    };

    // Conditional logic based on authentication and context
    if (isAuthenticated && projectId && currentUser) {
      setupMessageFetching();
    } else {
      // If not authenticated or context is missing, ensure cleanup happens
      console.log('[useMessages] Not authenticated or missing context. Clearing messages and stopping fetches.');
      cleanupMessageFetching();
    }

    // Cleanup function for the effect
    return () => {
      cleanupMessageFetching();
    };
  }, [fetchMessages, isAuthenticated, projectId, currentUser?.id]); // Use currentUser?.id instead of currentUser

  const sendMessage = async (text: string, receiverId: string, projId: string, attachment?: { url: string, name: string, type: string }) => {
    if (!isAuthenticated) {
      console.warn('[useMessages] Attempted to send message while unauthenticated.');
      return null;
    }
    try {
      const newMessage = await realApiService.sendMessage({
        content: text,
        receiverId,
        projectId: projId,
        attachmentUrl: attachment?.url,
        attachmentName: attachment?.name,
        attachmentType: attachment?.type
      });

      // Add the new message to the state
      setMessages(prev => [...prev, newMessage]);

      // Update the 'after' ref so next poll doesn't re-fetch this message from the server
      if (newMessage.timestamp) {
        lastFetchAfterRef.current = newMessage.timestamp;
      }

      return newMessage;
    } catch (error) {
      console.error('Failed to send message:', error);
      throw error;
    }
  };

  const markAsRead = async (messageId: string) => {
    if (!isAuthenticated) {
      console.warn('[useMessages] Attempted to mark message as read while unauthenticated.');
      return;
    }
    try {
      await realApiService.markMessageAsRead(messageId);
      // Update local state to reflect read status
      setMessages(prev => prev.map(m => m.id === messageId ? { ...m, read: true } : m));
    } catch (error) {
      console.error('Failed to mark message as read:', error);
    }
  };

  // Refresh function to manually refetch messages
  const refresh = useCallback(async () => {
    if (isAuthenticated && projectId && currentUser) {
      lastFetchAfterRef.current = ''; // Reset to get all messages on manual refresh
      await fetchMessages(false);
    } else {
      console.log('[useMessages] Refresh aborted: Not authenticated or missing context.');
    }
  }, [fetchMessages, isAuthenticated, projectId, currentUser?.id]);

  return {
    messages,
    isLoading,
    sendMessage,
    markAsRead,
    refresh
  };
};