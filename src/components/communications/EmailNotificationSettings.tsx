import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Mail, Send, Clock, AlertCircle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { formatDistanceToNow } from 'date-fns';

interface EmailQueue {
  id: string;
  recipient_email: string;
  subject: string;
  template_name: string;
  status: 'pending' | 'sent' | 'failed';
  attempts: number;
  scheduled_for: string;
  sent_at?: string;
  error_message?: string;
  created_at: string;
}

interface EmailSettings {
  test_assignment_notifications: boolean;
  test_result_notifications: boolean;
  deadline_reminders: boolean;
  announcement_notifications: boolean;
  message_notifications: boolean;
}

export const EmailNotificationSettings = () => {
  const { user, profile } = useAuth();
  const { toast } = useToast();
  const [emailSettings, setEmailSettings] = useState<EmailSettings>({
    test_assignment_notifications: true,
    test_result_notifications: true,
    deadline_reminders: true,
    announcement_notifications: true,
    message_notifications: true,
  });
  const [emailQueue, setEmailQueue] = useState<EmailQueue[]>([]);
  const [testEmail, setTestEmail] = useState({
    recipient: '',
    subject: '',
    content: '',
  });
  const [isLoading, setIsLoading] = useState(false);

  const isAdmin = profile?.role === 'admin';

  useEffect(() => {
    if (user) {
      loadEmailSettings();
      if (isAdmin) {
        loadEmailQueue();
      }
    }
  }, [user, isAdmin]);

  const loadEmailSettings = async () => {
    // In a real implementation, you would load user's email preferences from a settings table
    // For now, we'll use localStorage as a simple example
    try {
      const stored = localStorage.getItem(`email_settings_${user?.id}`);
      if (stored) {
        setEmailSettings(JSON.parse(stored));
      }
    } catch (error) {
      console.error('Error loading email settings:', error);
    }
  };

  const saveEmailSettings = async (newSettings: EmailSettings) => {
    try {
      localStorage.setItem(`email_settings_${user?.id}`, JSON.stringify(newSettings));
      setEmailSettings(newSettings);
      toast({
        title: 'Success',
        description: 'Email notification settings saved',
      });
    } catch (error) {
      console.error('Error saving email settings:', error);
      toast({
        title: 'Error',
        description: 'Failed to save settings',
        variant: 'destructive',
      });
    }
  };

  const loadEmailQueue = async () => {
    if (!isAdmin) return;

    try {
      const { data, error } = await supabase
        .from('email_queue')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) throw error;
      setEmailQueue(data as EmailQueue[] || []);
    } catch (error) {
      console.error('Error loading email queue:', error);
      toast({
        title: 'Error',
        description: 'Failed to load email queue',
        variant: 'destructive',
      });
    }
  };

  const sendTestEmail = async () => {
    if (!testEmail.recipient || !testEmail.subject || !testEmail.content) {
      toast({
        title: 'Error',
        description: 'Please fill in all fields',
        variant: 'destructive',
      });
      return;
    }

    setIsLoading(true);
    try {
      // Add to email queue
      const { error } = await supabase
        .from('email_queue')
        .insert({
          recipient_email: testEmail.recipient,
          recipient_id: user!.id,
          subject: testEmail.subject,
          template_name: 'test_email',
          template_data: { content: testEmail.content },
        });

      if (error) throw error;

      setTestEmail({ recipient: '', subject: '', content: '' });
      toast({
        title: 'Success',
        description: 'Test email queued for delivery',
      });

      if (isAdmin) {
        loadEmailQueue();
      }
    } catch (error) {
      console.error('Error sending test email:', error);
      toast({
        title: 'Error',
        description: 'Failed to queue test email',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const retryFailedEmail = async (emailId: string) => {
    try {
      const { error } = await supabase
        .from('email_queue')
        .update({
          status: 'pending',
          scheduled_for: new Date().toISOString(),
        })
        .eq('id', emailId);

      if (error) throw error;

      toast({
        title: 'Success',
        description: 'Email queued for retry',
      });

      loadEmailQueue();
    } catch (error) {
      console.error('Error retrying email:', error);
      toast({
        title: 'Error',
        description: 'Failed to retry email',
        variant: 'destructive',
      });
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'sent':
        return 'bg-green-500/10 text-green-500 border-green-200';
      case 'failed':
        return 'bg-red-500/10 text-red-500 border-red-200';
      case 'pending':
        return 'bg-yellow-500/10 text-yellow-500 border-yellow-200';
      default:
        return 'bg-gray-500/10 text-gray-500 border-gray-200';
    }
  };

  return (
    <div className="space-y-6">
      {/* Email Notification Preferences */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Mail className="h-5 w-5" />
            Email Notification Preferences
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="flex items-center justify-between">
              <Label htmlFor="test-assignment">Test Assignment Notifications</Label>
              <Switch
                id="test-assignment"
                checked={emailSettings.test_assignment_notifications}
                onCheckedChange={(checked) => 
                  saveEmailSettings({ ...emailSettings, test_assignment_notifications: checked })
                }
              />
            </div>
            
            <div className="flex items-center justify-between">
              <Label htmlFor="test-result">Test Result Notifications</Label>
              <Switch
                id="test-result"
                checked={emailSettings.test_result_notifications}
                onCheckedChange={(checked) => 
                  saveEmailSettings({ ...emailSettings, test_result_notifications: checked })
                }
              />
            </div>
            
            <div className="flex items-center justify-between">
              <Label htmlFor="deadline">Deadline Reminders</Label>
              <Switch
                id="deadline"
                checked={emailSettings.deadline_reminders}
                onCheckedChange={(checked) => 
                  saveEmailSettings({ ...emailSettings, deadline_reminders: checked })
                }
              />
            </div>
            
            <div className="flex items-center justify-between">
              <Label htmlFor="announcement">Announcement Notifications</Label>
              <Switch
                id="announcement"
                checked={emailSettings.announcement_notifications}
                onCheckedChange={(checked) => 
                  saveEmailSettings({ ...emailSettings, announcement_notifications: checked })
                }
              />
            </div>
            
            <div className="flex items-center justify-between">
              <Label htmlFor="message">Message Notifications</Label>
              <Switch
                id="message"
                checked={emailSettings.message_notifications}
                onCheckedChange={(checked) => 
                  saveEmailSettings({ ...emailSettings, message_notifications: checked })
                }
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Test Email */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Send className="h-5 w-5" />
            Send Test Email
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="recipient">Recipient Email</Label>
              <Input
                id="recipient"
                type="email"
                placeholder="test@example.com"
                value={testEmail.recipient}
                onChange={(e) => setTestEmail(prev => ({ ...prev, recipient: e.target.value }))}
              />
            </div>
            
            <div>
              <Label htmlFor="subject">Subject</Label>
              <Input
                id="subject"
                placeholder="Test email subject"
                value={testEmail.subject}
                onChange={(e) => setTestEmail(prev => ({ ...prev, subject: e.target.value }))}
              />
            </div>
          </div>
          
          <div>
            <Label htmlFor="content">Content</Label>
            <Textarea
              id="content"
              placeholder="Test email content..."
              value={testEmail.content}
              onChange={(e) => setTestEmail(prev => ({ ...prev, content: e.target.value }))}
              rows={4}
            />
          </div>
          
          <Button onClick={sendTestEmail} disabled={isLoading}>
            <Send className="h-4 w-4 mr-2" />
            {isLoading ? 'Sending...' : 'Send Test Email'}
          </Button>
        </CardContent>
      </Card>

      {/* Email Queue (Admin Only) */}
      {isAdmin && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5" />
              Email Queue
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-96">
              {emailQueue.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  No emails in queue
                </div>
              ) : (
                <div className="space-y-3">
                  {emailQueue.map((email) => (
                    <div key={email.id} className="flex items-start justify-between p-3 border rounded-lg">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <Badge className={getStatusColor(email.status)}>
                            {email.status.toUpperCase()}
                          </Badge>
                          <span className="text-sm text-muted-foreground">
                            to {email.recipient_email}
                          </span>
                        </div>
                        <p className="font-medium">{email.subject}</p>
                        <p className="text-sm text-muted-foreground">
                          {email.template_name} • {' '}
                          {formatDistanceToNow(new Date(email.created_at))} ago
                        </p>
                        {email.error_message && (
                          <div className="flex items-center gap-1 mt-2 text-sm text-red-500">
                            <AlertCircle className="h-3 w-3" />
                            {email.error_message}
                          </div>
                        )}
                      </div>
                      {email.status === 'failed' && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => retryFailedEmail(email.id)}
                        >
                          Retry
                        </Button>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </ScrollArea>
          </CardContent>
        </Card>
      )}
    </div>
  );
};