import { dbService } from '@/services/db';

interface NotificationData {
  userId: string;
  title: string;
  message: string;
  type: 'test_assignment' | 'test_result' | 'deadline' | 'announcement' | 'message';
  relatedId?: string;
}

export const createNotification = async (data: NotificationData) => {
  try {
    const { error } = await dbService.getProvider().execute(
      'INSERT INTO notifications',
      [{
        id: crypto.randomUUID(),
        user_id: data.userId,
        title: data.title,
        message: data.message,
        type: data.type,
        related_id: data.relatedId,
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

export const createBulkNotifications = async (notifications: NotificationData[]) => {
  try {
    const operations = notifications.map(notif => ({
      sql: 'INSERT INTO notifications',
      params: [{
        id: crypto.randomUUID(),
        user_id: notif.userId,
        title: notif.title,
        message: notif.message,
        type: notif.type,
        related_id: notif.relatedId,
        is_read: 0
      }]
    }));

    const { error } = await dbService.getProvider().batch(operations);

    if (error) throw error;
    return { success: true };
  } catch (error) {
    console.error('Error creating bulk notifications:', error);
    return { success: false, error };
  }
};

// Predefined notification templates
export const notificationTemplates = {
  messageReceived: (senderName: string, subject: string) => ({
    title: 'New Message',
    message: `You have a new message from ${senderName}: ${subject}`,
    type: 'message' as const,
  }),
  
  testAssigned: (testTitle: string) => ({
    title: 'Test Assignment',
    message: `You have been assigned a new test: ${testTitle}`,
    type: 'test_assignment' as const,
  }),
  
  testCompleted: (studentName: string, testTitle: string) => ({
    title: 'Test Completed',
    message: `${studentName} has completed the test: ${testTitle}`,
    type: 'test_result' as const,
  }),
  
  announcementCreated: (title: string) => ({
    title: 'New Announcement',
    message: `A new announcement has been posted: ${title}`,
    type: 'announcement' as const,
  }),
  
  testDeadlineReminder: (testTitle: string, timeRemaining: string) => ({
    title: 'Test Deadline Reminder',
    message: `Reminder: Test "${testTitle}" is due in ${timeRemaining}`,
    type: 'deadline' as const,
  }),
};