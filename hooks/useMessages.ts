import { useState, startTransition } from 'react';
import { Message, UserWithPermissions } from '../types';
import { DataCache, getCacheKey } from '../utils/data/cacheUtils';
import { useDebounce } from './useDebounce';

export const useMessages = (currentUser: UserWithPermissions) => {
  const [messages, setMessages] = useState<Message[]>(() => {
    const cacheKey = getCacheKey('messages');
    const cachedMessages = DataCache.get<Message[]>(cacheKey);
    
    if (cachedMessages && Array.isArray(cachedMessages)) {
      return cachedMessages;
    }
    
    const savedMessages = localStorage.getItem('roadmaster-messages');
    const messagesData = savedMessages ? (JSON.parse(savedMessages) || []) : [];
    
    const finalMessages = Array.isArray(messagesData) ? messagesData : [];
    
    if (!savedMessages) {
      localStorage.setItem('roadmaster-messages', JSON.stringify([]));
    }
    
    DataCache.set(cacheKey, finalMessages, { ttl: 5 * 60 * 1000 });
    
    return finalMessages;
  });

  const debouncedSaveMessages = useDebounce((updatedMessages: Message[]) => {
    localStorage.setItem('roadmaster-messages', JSON.stringify(updatedMessages));
    DataCache.set(getCacheKey('messages'), updatedMessages, { ttl: 5 * 60 * 1000 });
  }, 1000);

  const sendMessage = (text: string, receiverId: string, projectId: string) => {
    const newMessage: Message = {
      id: `msg-${Date.now()}`,
      senderId: currentUser.id,
      receiverId,
      content: text,
      timestamp: new Date().toISOString(),
      projectId,
      read: false
    };

    const updatedMessages = [...messages, newMessage];
    setMessages(updatedMessages);
    debouncedSaveMessages(updatedMessages);
  };

  return {
    messages,
    setMessages,
    sendMessage
  };
};
