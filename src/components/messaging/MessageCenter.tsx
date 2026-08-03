import { useState, useEffect } from 'react';
import { dbService } from '@/services/db';
import { useAuth } from '@/hooks/useAuth';
import { Send, MessageSquare, Reply, Trash2, User } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useToast } from '@/hooks/use-toast';
import { formatDistanceToNow } from 'date-fns';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { createNotification, notificationTemplates } from '@/lib/notifications';

interface Message {
  id: string;
  sender_id: string;
  recipient_id: string;
  subject: string;
  content: string;
  is_read: boolean;
  reply_to_message_id?: string;
  created_at: string;
  sender?: {
    full_name: string;
    email: string;
    avatar_url?: string;
  };
  recipient?: {
    full_name: string;
    email: string;
    avatar_url?: string;
  };
}

interface UserProfile {
  id: string;
  user_id: string;
  full_name: string;
  email: string;
  role: string;
  avatar_url?: string;
}

export const MessageCenter = () => {
  const { user, profile } = useAuth();
  const { toast } = useToast();
  const [messages, setMessages] = useState<Message[]>([]);
  const [selectedMessage, setSelectedMessage] = useState<Message | null>(null);
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [newMessage, setNewMessage] = useState({
    recipient_id: '',
    subject: '',
    content: '',
  });
  const [replyContent, setReplyContent] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'inbox' | 'sent' | 'compose'>('inbox');

  useEffect(() => {
    if (user) {
      fetchMessages();
      fetchUsers();
      subscribeToMessages();
    }
  }, [user]);

  const fetchMessages = async () => {
    if (!user) return;

    setIsLoading(true);
    try {
      // First fetch messages
      const { data: messagesData, error: messagesError } = await dbService.getProvider().query(
        'SELECT * FROM messages WHERE sender_id = ? OR recipient_id = ? ORDER BY created_at DESC',
        [user.id, user.id]
      );

      if (messagesError) throw messagesError;

      // Get unique user IDs from messages
      const userIds = new Set<string>();
      messagesData?.forEach(msg => {
        userIds.add(msg.sender_id);
        userIds.add(msg.recipient_id);
      });

      // Fetch profiles for all users involved in messages
      const ids = Array.from(userIds);
      const { data: profilesData, error: profilesError } = ids.length ? await dbService.getProvider().query(
        `SELECT user_id, full_name, email, avatar_url FROM profiles WHERE user_id IN (${ids.map(()=>'?').join(',')})`,
        ids
      ) : { data: [], error: null };

      if (profilesError) throw profilesError;

      // Create a map of profiles
      const profilesMap = new Map(
        profilesData?.map(p => [p.user_id, p]) || []
      );

      // Merge messages with profile data
      const enrichedMessages = messagesData?.map(msg => ({
        ...msg,
        sender: profilesMap.get(msg.sender_id),
        recipient: profilesMap.get(msg.recipient_id),
      })) || [];

      setMessages(enrichedMessages as any);
    } catch (error) {
      console.error('Error fetching messages:', error);
      toast({
        title: 'Error',
        description: 'Failed to load messages',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const fetchUsers = async () => {
    if (!user || !profile) return;

    try {
      let data: any = [];
      let error: any = null;
      if (profile.role === 'teacher') {
        const res = await dbService.getProvider().query('SELECT student_id FROM teacher_student_relationships WHERE teacher_id = ?', [user.id]);
        const studentIds = res.data?.map((rel: any) => rel.student_id) || [];
        if (studentIds.length > 0) {
          const profilesRes = await dbService.getProvider().query(`SELECT * FROM profiles WHERE user_id IN (${studentIds.map(()=>'?').join(',')})`, studentIds);
          data = profilesRes.data;
          error = profilesRes.error;
        }
      } else if (profile.role === 'student') {
        const res = await dbService.getProvider().query('SELECT teacher_id FROM teacher_student_relationships WHERE student_id = ?', [user.id]);
        const teacherIds = res.data?.map((rel: any) => rel.teacher_id) || [];
        if (teacherIds.length > 0) {
          const profilesRes = await dbService.getProvider().query(`SELECT * FROM profiles WHERE user_id IN (${teacherIds.map(()=>'?').join(',')})`, teacherIds);
          data = profilesRes.data;
          error = profilesRes.error;
        }
      } else {
        const res = await dbService.getProvider().query('SELECT * FROM profiles');
        data = res.data;
        error = res.error;
      }
      if (error) throw error;
      setUsers(data as UserProfile[] || []);
    } catch (error) {
      console.error('Error fetching users:', error);
    }
  };

  const subscribeToMessages = () => {
    if (!user) return;
    const interval = setInterval(fetchMessages, 10000);
    return () => clearInterval(interval);
  };

  const sendMessage = async () => {
    if (!user || !newMessage.recipient_id || !newMessage.subject || !newMessage.content) {
      toast({
        title: 'Error',
        description: 'Please fill in all fields',
        variant: 'destructive',
      });
      return;
    }

    try {
      const { error } = await dbService.getProvider().execute(
        'INSERT INTO messages (sender_id, recipient_id, subject, content) VALUES (?, ?, ?, ?)',
        [user.id, newMessage.recipient_id, newMessage.subject, newMessage.content]
      );

      if (error) throw error;

      // Create notification for recipient
      const senderName = profile?.full_name || profile?.email || 'Someone';
      const notificationData = notificationTemplates.messageReceived(senderName, newMessage.subject);
      await createNotification({
        userId: newMessage.recipient_id,
        ...notificationData,
      });

      setNewMessage({ recipient_id: '', subject: '', content: '' });
      setActiveTab('sent');
      await fetchMessages();
      
      toast({
        title: 'Success',
        description: 'Message sent successfully',
      });
    } catch (error) {
      console.error('Error sending message:', error);
      toast({
        title: 'Error',
        description: 'Failed to send message',
        variant: 'destructive',
      });
    }
  };

  const replyToMessage = async () => {
    if (!user || !selectedMessage || !replyContent) return;

    try {
      const { error } = await dbService.getProvider().execute(
        'INSERT INTO messages (sender_id, recipient_id, subject, content, parent_message_id) VALUES (?, ?, ?, ?, ?)',
        [user.id, selectedMessage.sender_id, `Re: ${selectedMessage.subject}`, replyContent, selectedMessage.id]
      );

      if (error) throw error;

      // Create notification for recipient
      const senderName = profile?.full_name || profile?.email || 'Someone';
      const notificationData = notificationTemplates.messageReceived(senderName, `Re: ${selectedMessage.subject}`);
      await createNotification({
        userId: selectedMessage.sender_id,
        ...notificationData,
      });

      setReplyContent('');
      await fetchMessages();
      
      toast({
        title: 'Success',
        description: 'Reply sent successfully',
      });
    } catch (error) {
      console.error('Error sending reply:', error);
      toast({
        title: 'Error',
        description: 'Failed to send reply',
        variant: 'destructive',
      });
    }
  };

  const markAsRead = async (messageId: string) => {
    if (!user) return;

    try {
      const { error } = await dbService.getProvider().execute(
        'UPDATE messages SET is_read = ? WHERE id = ? AND recipient_id = ?',
        [true, messageId, user.id]
      );

      if (error) throw error;

      setMessages(prev => 
        prev.map(msg => 
          msg.id === messageId ? { ...msg, is_read: true } : msg
        )
      );
    } catch (error) {
      console.error('Error marking message as read:', error);
    }
  };

  const deleteMessage = async (messageId: string) => {
    try {
      const { error } = await dbService.getProvider().execute(
        'DELETE FROM messages WHERE id = ?',
        [messageId]
      );

      if (error) throw error;

      setMessages(prev => prev.filter(msg => msg.id !== messageId));
      if (selectedMessage?.id === messageId) {
        setSelectedMessage(null);
      }
      
      toast({
        title: 'Success',
        description: 'Message deleted successfully',
      });
    } catch (error) {
      console.error('Error deleting message:', error);
      toast({
        title: 'Error',
        description: 'Failed to delete message',
        variant: 'destructive',
      });
    }
  };

  const getFilteredMessages = () => {
    if (!user) return [];
    
    switch (activeTab) {
      case 'inbox':
        return messages.filter(msg => msg.recipient_id === user.id);
      case 'sent':
        return messages.filter(msg => msg.sender_id === user.id);
      default:
        return [];
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-[600px]">
      {/* Message List */}
      <Card className="lg:col-span-1">
        <CardHeader className="pb-3">
          <div className="flex space-x-1">
            <Button
              variant={activeTab === 'inbox' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setActiveTab('inbox')}
              className="flex-1"
            >
              Inbox
            </Button>
            <Button
              variant={activeTab === 'sent' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setActiveTab('sent')}
              className="flex-1"
            >
              Sent
            </Button>
            <Button
              variant={activeTab === 'compose' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setActiveTab('compose')}
              className="flex-1"
            >
              Compose
            </Button>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <ScrollArea className="h-[500px]">
            {activeTab === 'compose' ? (
              <div className="p-4 space-y-4">
                <Select
                  value={newMessage.recipient_id}
                  onValueChange={(value) => 
                    setNewMessage(prev => ({ ...prev, recipient_id: value }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select recipient" />
                  </SelectTrigger>
                  <SelectContent>
                    {users.map((user) => (
                      <SelectItem key={user.user_id} value={user.user_id}>
                        {user.full_name || user.email}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                
                <Input
                  placeholder="Subject"
                  value={newMessage.subject}
                  onChange={(e) => 
                    setNewMessage(prev => ({ ...prev, subject: e.target.value }))
                  }
                />
                
                <Textarea
                  placeholder="Message content..."
                  value={newMessage.content}
                  onChange={(e) => 
                    setNewMessage(prev => ({ ...prev, content: e.target.value }))
                  }
                  rows={10}
                />
                
                <Button onClick={sendMessage} className="w-full">
                  <Send className="h-4 w-4 mr-2" />
                  Send Message
                </Button>
              </div>
            ) : (
              <div>
                {getFilteredMessages().map((message) => (
                  <div
                    key={message.id}
                    className={`p-3 border-b cursor-pointer hover:bg-muted/50 transition-colors ${
                      selectedMessage?.id === message.id ? 'bg-muted' : ''
                    } ${
                      !message.is_read && activeTab === 'inbox' ? 'border-l-4 border-l-primary' : ''
                    }`}
                    onClick={() => {
                      setSelectedMessage(message);
                      if (activeTab === 'inbox' && !message.is_read) {
                        markAsRead(message.id);
                      }
                    }}
                  >
                    <div className="flex items-start gap-3">
                      <Avatar className="h-8 w-8">
                        <AvatarImage src={
                          activeTab === 'inbox' 
                            ? message.sender?.avatar_url 
                            : message.recipient?.avatar_url
                        } />
                        <AvatarFallback>
                          <User className="h-4 w-4" />
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm truncate">
                          {activeTab === 'inbox' 
                            ? (message.sender?.full_name || message.sender?.email)
                            : (message.recipient?.full_name || message.recipient?.email)
                          }
                        </p>
                        <p className="text-sm font-medium truncate">{message.subject}</p>
                        <p className="text-xs text-muted-foreground truncate">
                          {message.content}
                        </p>
                        <p className="text-xs text-muted-foreground mt-1">
                          {formatDistanceToNow(new Date(message.created_at))} ago
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </ScrollArea>
        </CardContent>
      </Card>

      {/* Message Detail */}
      <Card className="lg:col-span-2">
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span className="flex items-center gap-2">
              <MessageSquare className="h-5 w-5" />
              {selectedMessage ? selectedMessage.subject : 'Select a message'}
            </span>
            {selectedMessage && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => deleteMessage(selectedMessage.id)}
                className="text-destructive hover:text-destructive"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {selectedMessage ? (
            <div className="space-y-4">
              <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
                <Avatar>
                  <AvatarImage src={
                    activeTab === 'inbox' 
                      ? selectedMessage.sender?.avatar_url 
                      : selectedMessage.recipient?.avatar_url
                  } />
                  <AvatarFallback>
                    <User className="h-4 w-4" />
                  </AvatarFallback>
                </Avatar>
                <div>
                  <p className="font-medium">
                    {activeTab === 'inbox' 
                      ? (selectedMessage.sender?.full_name || selectedMessage.sender?.email)
                      : (selectedMessage.recipient?.full_name || selectedMessage.recipient?.email)
                    }
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {formatDistanceToNow(new Date(selectedMessage.created_at))} ago
                  </p>
                </div>
              </div>
              
              <div className="prose max-w-none">
                <p className="whitespace-pre-wrap">{selectedMessage.content}</p>
              </div>
              
              {activeTab === 'inbox' && (
                <div className="space-y-3 pt-4 border-t">
                  <Textarea
                    placeholder="Write your reply..."
                    value={replyContent}
                    onChange={(e) => setReplyContent(e.target.value)}
                    rows={4}
                  />
                  <Button onClick={replyToMessage} disabled={!replyContent}>
                    <Reply className="h-4 w-4 mr-2" />
                    Reply
                  </Button>
                </div>
              )}
            </div>
          ) : (
            <div className="text-center text-muted-foreground py-8">
              Select a message to view its content
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};