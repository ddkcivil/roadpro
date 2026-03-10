import { useState, useEffect, useCallback, useRef } from 'react';
import { Message, UserWithPermissions } from '../types';
import { realApiService } from '../services/api/realApiService';

export const useMessages = (currentUser: UserWithPermissions, projectId: string) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const lastFetchedRef = useRef<string | null>(null);

  const fetchMessages = useCallback(async (isInitial = false) => {
    if (!projectId || !currentUser) return;
    
    try {
      if (isInitial) setIsLoading(true);
      
      const newMessages = await realApiService.getMessages(projectId);
      
      setMessages(prev => {
          // Merge logic to avoid duplicates and handle real-time updates
          const messageMap = new Map();
          prev.forEach(m => messageMap.set(m.id, m));
          newMessages.forEach(m => messageMap.set(m.id, m));
          return Array.from(messageMap.values()).sort((a, b) => 
            new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
          );
      });
    } catch (error) {
      console.error('Failed to fetch messages:', error);
    } finally {
      if (isInitial) setIsLoading(false);
    }
  }, [projectId, currentUser]);

  // Initial fetch and polling
  useEffect(() => {
    fetchMessages(true);
    
    const interval = setInterval(() => {
      fetchMessages();
    }, 10000); // 10 second polling for "real-time" feel without web sockets
    
    return () => clearInterval(interval);
  }, [fetchMessages]);

  const sendMessage = async (text: string, receiverId: string, projId: string, attachment?: { url: string, name: string, type: string }) => {
    try {
      const newMessage = await realApiService.sendMessage({
        content: text,
        receiverId,
        projectId: projId,
        attachmentUrl: attachment?.url,
        attachmentName: attachment?.name,
        attachmentType: attachment?.type
      });
      
      setMessages(prev => [...prev, newMessage]);
      return newMessage;
    } catch (error) {
      console.error('Failed to send message:', error);
      throw error;
    }
  };

  const markAsRead = async (messageId: string) => {
    try {
        await realApiService.markMessageAsRead(messageId);
        setMessages(prev => prev.map(m => m.id === messageId ? { ...m, read: true } : m));
    } catch (error) {
        console.error('Failed to mark message as read:', error);
    }
  };

  return {
    messages,
    isLoading,
    sendMessage,
    markAsRead,
    refresh: fetchMessages
  };
};
