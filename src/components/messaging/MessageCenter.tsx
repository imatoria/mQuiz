import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
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
  parent_message_id?: string;
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
      const { data, error } = await supabase
        .from('messages')
        .select(`
          *,
          sender:profiles!sender_id(full_name, email, avatar_url),
          recipient:profiles!recipient_id(full_name, email, avatar_url)
        `)
        .or(`sender_id.eq.${user.id},recipient_id.eq.${user.id}`)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setMessages((data as any) || []);
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
      let query = supabase.from('profiles').select('*');
      
      // Parents can message children, children can message parents
      if (profile.role === 'parent') {
        const { data: children } = await supabase
          .from('parent_child_relationships')
          .select('child_id')
          .eq('parent_id', user.id);
        
        const childIds = children?.map(rel => rel.child_id) || [];
        if (childIds.length > 0) {
          query = query.in('user_id', childIds);
        }
      } else if (profile.role === 'child') {
        const { data: parents } = await supabase
          .from('parent_child_relationships')
          .select('parent_id')
          .eq('child_id', user.id);
        
        const parentIds = parents?.map(rel => rel.parent_id) || [];
        if (parentIds.length > 0) {
          query = query.in('user_id', parentIds);
        }
      }

      const { data, error } = await query;
      if (error) throw error;
      setUsers(data as UserProfile[] || []);
    } catch (error) {
      console.error('Error fetching users:', error);
    }
  };

  const subscribeToMessages = () => {
    if (!user) return;

    const channel = supabase
      .channel('messages')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `recipient_id=eq.${user.id}`,
        },
        () => {
          fetchMessages();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
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
      const { error } = await supabase
        .from('messages')
        .insert({
          sender_id: user.id,
          recipient_id: newMessage.recipient_id,
          subject: newMessage.subject,
          content: newMessage.content,
        });

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
      const { error } = await supabase
        .from('messages')
        .insert({
          sender_id: user.id,
          recipient_id: selectedMessage.sender_id,
          subject: `Re: ${selectedMessage.subject}`,
          content: replyContent,
          parent_message_id: selectedMessage.id,
        });

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
      const { error } = await supabase
        .from('messages')
        .update({ is_read: true })
        .eq('id', messageId)
        .eq('recipient_id', user.id);

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
      const { error } = await supabase
        .from('messages')
        .delete()
        .eq('id', messageId);

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