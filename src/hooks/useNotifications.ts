import { useState, useEffect } from 'react';
import { dbService } from '@/services/db';
import { useAuth } from './useAuth';

export const useNotifications = () => {
  const { user } = useAuth();
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    if (user) {
      fetchUnreadCount();
      const unsubscribe = subscribeToNotifications();
      return () => {
        if (unsubscribe) unsubscribe();
      };
    }
  }, [user]);

  const fetchUnreadCount = async () => {
    if (!user) return;

    try {
      const { data, error } = await dbService.getProvider().query(
        'SELECT id FROM notifications WHERE user_id = ? AND is_read = 0',
        [user.id]
      );

      if (error) throw error;
      setUnreadCount(data?.length || 0);
    } catch (error) {
      console.error('Error fetching unread count:', error);
    }
  };

  const subscribeToNotifications = () => {
    if (!user) return;

    // Simulate realtime updates via polling for local SQLite
    const interval = setInterval(() => {
      fetchUnreadCount();
    }, 10000); // 10 seconds

    return () => {
      clearInterval(interval);
    };
  };

  const createNotification = async (
    userId: string, 
    title: string, 
    message: string, 
    type: 'test_assignment' | 'test_result' | 'deadline' | 'announcement' | 'message',
    relatedId?: string
  ) => {
    try {
      const { error } = await dbService.getProvider().execute(
        'INSERT INTO notifications',
        [{
          id: crypto.randomUUID(),
          user_id: userId,
          title,
          message,
          type,
          related_id: relatedId,
          is_read: 0
        }]
      );

      if (error) throw error;
      return { success: true };
    } catch (error) {
      console.error('Error creating notification:', error);
      return { success: false, error };
    }
  };

  const sendEmailNotification = async (
    recipientEmail: string,
    recipientId: string,
    subject: string,
    templateName: string,
    templateData: Record<string, any> = {}
  ) => {
    try {
      console.log(`[Mock Email] Sending email to ${recipientEmail} with subject: ${subject}`);
      return { success: true };
    } catch (error) {
      console.error('Error sending email notification:', error);
      return { success: false, error };
    }
  };

  return {
    unreadCount,
    createNotification,
    sendEmailNotification,
    fetchUnreadCount,
  };
};