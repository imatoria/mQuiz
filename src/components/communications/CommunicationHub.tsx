import { useSearchParams } from 'react-router-dom';
import { MessageSquare, Bell, Megaphone, Mail } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { NotificationCenter } from '../notifications/NotificationCenter';
import { MessageCenter } from '../messaging/MessageCenter';
import { AnnouncementSystem } from '../announcements/AnnouncementSystem';
import { EmailNotificationSettings } from './EmailNotificationSettings';

export const CommunicationHub = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  
  // Read communication subtab from URL or default to 'messages'
  const activeTab = searchParams.get('comm') || 'messages';

  // Update URL when changing communication tabs
  const handleCommTabChange = (value: string) => {
    setSearchParams({ comm: value });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <MessageSquare className="h-6 w-6" />
          <h1 className="text-2xl md:text-3xl font-bold">Communication Center</h1>
        </div>
        <NotificationCenter />
      </div>

      <Tabs value={activeTab} onValueChange={handleCommTabChange}>
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="messages" className="flex items-center gap-2">
            <MessageSquare className="h-4 w-4" />
            Messages
          </TabsTrigger>
          <TabsTrigger value="announcements" className="flex items-center gap-2">
            <Megaphone className="h-4 w-4" />
            Announcements
          </TabsTrigger>
          <TabsTrigger value="notifications" className="flex items-center gap-2">
            <Bell className="h-4 w-4" />
            Notifications
          </TabsTrigger>
          <TabsTrigger value="email" className="flex items-center gap-2">
            <Mail className="h-4 w-4" />
            Email Settings
          </TabsTrigger>
        </TabsList>

        <TabsContent value="messages">
          <Card>
            <CardHeader>
              <CardTitle>Messages</CardTitle>
            </CardHeader>
            <CardContent>
              <MessageCenter />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="announcements">
          <AnnouncementSystem />
        </TabsContent>

        <TabsContent value="notifications">
          <Card>
            <CardHeader>
              <CardTitle>Notification History</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">
                Your notifications are managed through the notification center in the top navigation.
                All recent notifications appear there with real-time updates.
              </p>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="email">
          <EmailNotificationSettings />
        </TabsContent>
      </Tabs>
    </div>
  );
};