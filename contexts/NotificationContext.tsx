import React, { createContext, useContext, useState, ReactNode, useEffect } from 'react';
import { toast } from 'sonner';

// Define notification types
export type NotificationType = 'info' | 'success' | 'warning' | 'error' | 'reminder' | 'alert' | 'update' | 'task';

// Define notification channels
export type NotificationChannel = 'email' | 'in-app' | 'push' | 'sms';

// Define notification priority
export type NotificationPriority = 'low' | 'normal' | 'high' | 'critical';

export interface NotificationPreferences {
  channels: NotificationChannel[];
  types: NotificationType[];
  enabled: boolean;
  muteHours?: { start: number; end: number }; // Hours in 24-hour format
}

export interface Notification {
  id: string;
  title: string;
  message: string;
  type: NotificationType;
  priority: NotificationPriority;
  timestamp: Date;
  read: boolean;
  channel: NotificationChannel;
  userId?: string; // For user-specific notifications
  projectId?: string; // For project-specific notifications
  actions?: {
    label: string;
    handler: () => void;
  }[];
}

interface NotificationContextType {
  notifications: Notification[];
  unreadCount: number;
  preferences: NotificationPreferences;
  addNotification: (notification: Omit<Notification, 'id' | 'timestamp' | 'read'>) => void;
  removeNotification: (id: string) => void;
  markAsRead: (id: string) => void;
  markAllAsRead: () => void;
  updatePreferences: (prefs: Partial<NotificationPreferences>) => void;
  getNotificationHistory: (limit?: number) => Notification[];
  clearNotifications: () => void;
  requestPushPermission: () => Promise<void>;
}

const NOTIFICATION_STORAGE_KEY = 'roadmaster-notifications';
const PREFERENCES_STORAGE_KEY = 'roadmaster-notification-preferences';

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export const NotificationProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  // Load notifications from localStorage
  const [notifications, setNotifications] = useState<Notification[]>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem(NOTIFICATION_STORAGE_KEY);
      return saved ? JSON.parse(saved).map((n: any) => ({
        ...n,
        timestamp: new Date(n.timestamp)
      })) : [];
    }
    return [];
  });

  // Load preferences from localStorage
  const [preferences, setPreferences] = useState<NotificationPreferences>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem(PREFERENCES_STORAGE_KEY);
      return saved ? JSON.parse(saved) : {
        channels: ['in-app'],
        types: ['info', 'success', 'warning', 'error'],
        enabled: true
      };
    }
    return {
      channels: ['in-app'],
      types: ['info', 'success', 'warning', 'error'],
      enabled: true
    };
  });

  // Save to localStorage whenever notifications change
  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem(NOTIFICATION_STORAGE_KEY, JSON.stringify(notifications));
    }
  }, [notifications]);

  // Save preferences to localStorage whenever they change
  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem(PREFERENCES_STORAGE_KEY, JSON.stringify(preferences));
    }
  }, [preferences]);

  const unreadCount = notifications.filter(n => !n.read).length;

  const addNotification = (notification: Omit<Notification, 'id' | 'timestamp' | 'read'>) => {
    // Check if notifications are enabled and if the notification type is allowed
    if (!preferences.enabled || !preferences.types.includes(notification.type)) {
      return; // Don't add if disabled or type not allowed
    }

    const newNotification: Notification = {
      ...notification,
      id: `notif-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
      timestamp: new Date(),
      read: false,
    };
    
    setNotifications(prev => [newNotification, ...prev]);

    // Integrate with sonner for immediate visual feedback
    const toastFn = notification.type === 'error' ? toast.error : 
                    notification.type === 'success' ? toast.success : 
                    notification.type === 'warning' ? toast.warning : toast.info;
    
    toastFn(notification.title, {
      description: notification.message,
      duration: notification.priority === 'critical' ? 10000 : 
                notification.priority === 'high' ? 7000 : 5000,
    });

    // Browser Push Notification fallback
    if (preferences.channels.includes('push') && 'Notification' in window && Notification.permission === 'granted') {
      new window.Notification(notification.title, {
        body: notification.message,
        icon: '/favicon.ico'
      });
    }
  };

  const requestPushPermission = async () => {
    if ('Notification' in window) {
      const permission = await Notification.requestPermission();
      if (permission === 'granted') {
        updatePreferences({ channels: [...preferences.channels, 'push'] });
        toast.success("Push Notifications Enabled");
      }
    }
  };

  const removeNotification = (id: string) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
  };

  const markAsRead = (id: string) => {
    setNotifications(prev =>
      prev.map(n => (n.id === id ? { ...n, read: true } : n))
    );
  };

  const markAllAsRead = () => {
    setNotifications(prev =>
      prev.map(n => ({ ...n, read: true }))
    );
  };

  const updatePreferences = (prefs: Partial<NotificationPreferences>) => {
    setPreferences(prev => ({ ...prev, ...prefs }));
  };

  const getNotificationHistory = (limit?: number): Notification[] => {
    const sorted = [...notifications].sort((a, b) => 
      b.timestamp.getTime() - a.timestamp.getTime()
    );
    return limit ? sorted.slice(0, limit) : sorted;
  };

  const clearNotifications = () => {
    setNotifications([]);
  };

  return (
    <NotificationContext.Provider value={{
      notifications,
      unreadCount,
      preferences,
      addNotification,
      removeNotification,
      markAsRead,
      markAllAsRead,
      updatePreferences,
      getNotificationHistory,
      clearNotifications,
      requestPushPermission
    }}>
      {children}
    </NotificationContext.Provider>
  );
};

export const useNotifications = (): NotificationContextType => {
  const context = useContext(NotificationContext);
  if (context === undefined) {
    throw new Error('useNotifications must be used within a NotificationProvider');
  }
  return context;
};
