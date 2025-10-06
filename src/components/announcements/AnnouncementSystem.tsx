import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Megaphone, Plus, Calendar, Users, AlertCircle, Eye, EyeOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { formatDistanceToNow } from 'date-fns';

interface Announcement {
  id: string;
  creator_id: string;
  title: string;
  content: string;
  target_audience: 'all' | 'parents' | 'children' | 'specific_users';
  priority: 'low' | 'normal' | 'high' | 'urgent';
  is_active: boolean;
  expires_at?: string;
  created_at: string;
  creator?: {
    full_name: string;
    email: string;
  };
  read_status?: {
    is_read: boolean;
    read_at?: string;
  };
}

const getPriorityColor = (priority: string) => {
  switch (priority) {
    case 'urgent':
      return 'bg-red-500/10 text-red-500 border-red-200';
    case 'high':
      return 'bg-orange-500/10 text-orange-500 border-orange-200';
    case 'normal':
      return 'bg-blue-500/10 text-blue-500 border-blue-200';
    case 'low':
      return 'bg-gray-500/10 text-gray-500 border-gray-200';
    default:
      return 'bg-gray-500/10 text-gray-500 border-gray-200';
  }
};

export const AnnouncementSystem = () => {
  const { user, profile } = useAuth();
  const { toast } = useToast();
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [selectedAnnouncement, setSelectedAnnouncement] = useState<Announcement | null>(null);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [newAnnouncement, setNewAnnouncement] = useState({
    title: '',
    content: '',
    target_audience: 'all' as const,
    priority: 'normal' as const,
    expires_at: '',
  });

  const canCreateAnnouncements = profile?.role === 'admin' || profile?.role === 'parent';

  useEffect(() => {
    if (user) {
      fetchAnnouncements();
      subscribeToAnnouncements();
    }
  }, [user]);

  const fetchAnnouncements = async () => {
    if (!user) return;

    setIsLoading(true);
    try {
      // Fetch announcements
      const { data: announcementsData, error: announcementsError } = await supabase
        .from('announcements')
        .select('*')
        .eq('is_active', true)
        .or('expires_at.is.null,expires_at.gt.now()')
        .order('created_at', { ascending: false });

      if (announcementsError) throw announcementsError;

      // Get unique creator IDs
      const creatorIds = new Set<string>();
      announcementsData?.forEach(ann => {
        creatorIds.add(ann.creator_id);
      });

      // Fetch profiles for all creators
      const { data: profilesData, error: profilesError } = await supabase
        .from('profiles')
        .select('user_id, full_name, email')
        .in('user_id', Array.from(creatorIds));

      if (profilesError) throw profilesError;

      // Create a map of profiles
      const profilesMap = new Map(
        profilesData?.map(p => [p.user_id, p]) || []
      );

      // Fetch read status for current user
      const { data: readStatusData, error: readStatusError } = await supabase
        .from('announcement_recipients')
        .select('announcement_id, is_read, read_at')
        .eq('user_id', user.id);

      if (readStatusError) throw readStatusError;

      // Create a map of read statuses
      const readStatusMap = new Map(
        readStatusData?.map(rs => [rs.announcement_id, { is_read: rs.is_read, read_at: rs.read_at }]) || []
      );

      // Merge announcements with profile data and read status
      const enrichedAnnouncements = announcementsData?.map(ann => ({
        ...ann,
        creator: profilesMap.get(ann.creator_id),
        read_status: readStatusMap.get(ann.id),
      })) || [];

      setAnnouncements(enrichedAnnouncements as any);
    } catch (error) {
      console.error('Error fetching announcements:', error);
      toast({
        title: 'Error',
        description: 'Failed to load announcements',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const subscribeToAnnouncements = () => {
    if (!user) return;

    const channel = supabase
      .channel('announcements')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'announcements',
        },
        () => {
          fetchAnnouncements();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  };

  const createAnnouncement = async () => {
    if (!user || !canCreateAnnouncements) return;

    if (!newAnnouncement.title || !newAnnouncement.content) {
      toast({
        title: 'Error',
        description: 'Please fill in all required fields',
        variant: 'destructive',
      });
      return;
    }

    try {
      const { data, error } = await supabase
        .from('announcements')
        .insert({
          creator_id: user.id,
          title: newAnnouncement.title,
          content: newAnnouncement.content,
          target_audience: newAnnouncement.target_audience,
          priority: newAnnouncement.priority,
          expires_at: newAnnouncement.expires_at || null,
        })
        .select()
        .single();

      if (error) throw error;

      // Create notification for all targeted users
      await createAnnouncementNotifications(data.id, newAnnouncement.target_audience);

      setNewAnnouncement({
        title: '',
        content: '',
        target_audience: 'all',
        priority: 'normal',
        expires_at: '',
      });
      setIsCreateDialogOpen(false);
      await fetchAnnouncements();
      
      toast({
        title: 'Success',
        description: 'Announcement created successfully',
      });
    } catch (error) {
      console.error('Error creating announcement:', error);
      toast({
        title: 'Error',
        description: 'Failed to create announcement',
        variant: 'destructive',
      });
    }
  };

  const createAnnouncementNotifications = async (announcementId: string, targetAudience: string) => {
    try {
      let targetUsers: string[] = [];

      if (targetAudience === 'all') {
        const { data } = await supabase
          .from('profiles')
          .select('user_id')
          .neq('user_id', user!.id);
        targetUsers = data?.map(p => p.user_id) || [];
      } else if (targetAudience === 'parents' || targetAudience === 'children') {
        const { data } = await supabase
          .from('profiles')
          .select('user_id')
          .eq('role', targetAudience === 'parents' ? 'parent' : 'child')
          .neq('user_id', user!.id);
        targetUsers = data?.map(p => p.user_id) || [];
      }

      if (targetUsers.length > 0) {
        const notifications = targetUsers.map(userId => ({
          user_id: userId,
          title: 'New Announcement',
          message: newAnnouncement.title,
          type: 'announcement' as const,
          related_id: announcementId,
        }));

        await supabase.from('notifications').insert(notifications);
      }
    } catch (error) {
      console.error('Error creating notifications:', error);
    }
  };

  const markAsRead = async (announcementId: string) => {
    if (!user) return;

    try {
      const { error } = await supabase
        .from('announcement_recipients')
        .upsert({
          announcement_id: announcementId,
          user_id: user.id,
          is_read: true,
          read_at: new Date().toISOString(),
        });

      if (error) throw error;

      setAnnouncements(prev => 
        prev.map(ann => 
          ann.id === announcementId 
            ? { ...ann, read_status: { is_read: true, read_at: new Date().toISOString() } }
            : ann
        )
      );
    } catch (error) {
      console.error('Error marking announcement as read:', error);
    }
  };

  const toggleAnnouncementStatus = async (announcementId: string, isActive: boolean) => {
    try {
      const { error } = await supabase
        .from('announcements')
        .update({ is_active: !isActive })
        .eq('id', announcementId);

      if (error) throw error;

      await fetchAnnouncements();
      
      toast({
        title: 'Success',
        description: `Announcement ${isActive ? 'deactivated' : 'activated'} successfully`,
      });
    } catch (error) {
      console.error('Error toggling announcement status:', error);
      toast({
        title: 'Error',
        description: 'Failed to update announcement status',
        variant: 'destructive',
      });
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Megaphone className="h-6 w-6" />
          <h2 className="text-2xl font-bold">Announcements</h2>
        </div>
        {canCreateAnnouncements && (
          <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                New Announcement
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>Create New Announcement</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <Input
                  placeholder="Announcement title"
                  value={newAnnouncement.title}
                  onChange={(e) => 
                    setNewAnnouncement(prev => ({ ...prev, title: e.target.value }))
                  }
                />
                
                <Textarea
                  placeholder="Announcement content..."
                  value={newAnnouncement.content}
                  onChange={(e) => 
                    setNewAnnouncement(prev => ({ ...prev, content: e.target.value }))
                  }
                  rows={6}
                />
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium">Target Audience</label>
                    <Select
                      value={newAnnouncement.target_audience}
                      onValueChange={(value: any) => 
                        setNewAnnouncement(prev => ({ ...prev, target_audience: value }))
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Everyone</SelectItem>
                        <SelectItem value="parents">Parents Only</SelectItem>
                        <SelectItem value="children">Students Only</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div>
                    <label className="text-sm font-medium">Priority</label>
                    <Select
                      value={newAnnouncement.priority}
                      onValueChange={(value: any) => 
                        setNewAnnouncement(prev => ({ ...prev, priority: value }))
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="low">Low</SelectItem>
                        <SelectItem value="normal">Normal</SelectItem>
                        <SelectItem value="high">High</SelectItem>
                        <SelectItem value="urgent">Urgent</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                
                <div>
                  <label className="text-sm font-medium">Expiry Date (Optional)</label>
                  <Input
                    type="datetime-local"
                    value={newAnnouncement.expires_at}
                    onChange={(e) => 
                      setNewAnnouncement(prev => ({ ...prev, expires_at: e.target.value }))
                    }
                  />
                </div>
                
                <div className="flex gap-2 pt-4">
                  <Button onClick={createAnnouncement} className="flex-1">
                    Create Announcement
                  </Button>
                  <Button 
                    variant="outline" 
                    onClick={() => setIsCreateDialogOpen(false)}
                    className="flex-1"
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        )}
      </div>

      <div className="space-y-4">
        {isLoading ? (
          <div className="text-center py-8">Loading announcements...</div>
        ) : announcements.length === 0 ? (
          <Card>
            <CardContent className="text-center py-8">
              <Megaphone className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground">No announcements yet</p>
            </CardContent>
          </Card>
        ) : (
          announcements.map((announcement) => (
            <Card key={announcement.id} className={`transition-all ${
              announcement.read_status?.is_read ? 'opacity-75' : 'border-l-4 border-l-primary'
            }`}>
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <Badge className={getPriorityColor(announcement.priority)}>
                        {announcement.priority.toUpperCase()}
                      </Badge>
                      <Badge variant="outline" className="flex items-center gap-1">
                        <Users className="h-3 w-3" />
                        {announcement.target_audience === 'all' ? 'Everyone' : 
                         announcement.target_audience === 'parents' ? 'Parents' : 'Students'}
                      </Badge>
                      {announcement.expires_at && (
                        <Badge variant="outline" className="flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          Expires {formatDistanceToNow(new Date(announcement.expires_at))}
                        </Badge>
                      )}
                    </div>
                    <CardTitle className="text-lg">{announcement.title}</CardTitle>
                    <p className="text-sm text-muted-foreground">
                      By {announcement.creator?.full_name || announcement.creator?.email} • {' '}
                      {formatDistanceToNow(new Date(announcement.created_at))} ago
                    </p>
                  </div>
                  <div className="flex gap-2">
                    {!announcement.read_status?.is_read && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => markAsRead(announcement.id)}
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                    )}
                    {canCreateAnnouncements && announcement.creator_id === user?.id && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => toggleAnnouncementStatus(announcement.id, announcement.is_active)}
                      >
                        {announcement.is_active ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </Button>
                    )}
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="prose max-w-none">
                  <p className="whitespace-pre-wrap">{announcement.content}</p>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
};