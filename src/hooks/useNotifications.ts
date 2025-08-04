import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';

export const useNotifications = () => {
  const { user } = useAuth();
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    if (user) {
      fetchUnreadCount();
      subscribeToNotifications();
    }
  }, [user]);

  const fetchUnreadCount = async () => {
    if (!user) return;

    try {
      const { count, error } = await supabase
        .from('notifications')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .eq('is_read', false);

      if (error) throw error;
      setUnreadCount(count || 0);
    } catch (error) {
      console.error('Error fetching unread count:', error);
    }
  };

  const subscribeToNotifications = () => {
    if (!user) return;

    const channel = supabase
      .channel('notification_count')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${user.id}`,
        },
        () => {
          fetchUnreadCount();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
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
      const { error } = await supabase
        .from('notifications')
        .insert({
          user_id: userId,
          title,
          message,
          type,
          related_id: relatedId,
        });

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
      const response = await supabase.functions.invoke('send-email-notifications', {
        body: {
          recipient_email: recipientEmail,
          recipient_id: recipientId,
          subject,
          template_name: templateName,
          template_data: templateData,
        },
      });

      if (response.error) throw response.error;
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