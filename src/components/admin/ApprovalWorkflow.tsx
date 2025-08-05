import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useNotifications } from '@/hooks/useNotifications';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { 
  Clock, 
  CheckCircle, 
  XCircle, 
  User, 
  Mail, 
  Calendar,
  Shield,
  AlertCircle,
  Crown,
  Users,
  Baby
} from 'lucide-react';

interface PendingUser {
  id: string;
  user_id: string;
  email: string | null;
  full_name: string | null;
  role: string;
  created_at: string;
}

export const ApprovalWorkflow = () => {
  const [pendingUsers, setPendingUsers] = useState<PendingUser[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [processingUser, setProcessingUser] = useState<string | null>(null);
  const { toast } = useToast();
  const { createNotification, sendEmailNotification } = useNotifications();

  useEffect(() => {
    fetchPendingUsers();
    
    // Subscribe to real-time updates for new user registrations
    const channel = supabase
      .channel('pending_users')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'profiles',
          filter: 'is_approved=eq.false',
        },
        () => {
          fetchPendingUsers();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const fetchPendingUsers = async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('is_approved', false)
        .order('created_at', { ascending: true });

      if (error) throw error;
      setPendingUsers(data || []);
    } catch (error: any) {
      toast({
        title: 'Error',
        description: 'Failed to load pending users',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleApproval = async (user: PendingUser, approved: boolean) => {
    setProcessingUser(user.id);
    
    try {
      // Update user approval status
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ 
          is_approved: approved,
          updated_at: new Date().toISOString()
        })
        .eq('id', user.id);

      if (updateError) throw updateError;

      // Create notification for the user
      await createNotification(
        user.user_id,
        approved ? 'Account Approved' : 'Account Rejected',
        approved 
          ? 'Your account has been approved and you now have full access to the system.'
          : 'Your account application has been rejected. Please contact support for more information.',
        'announcement'
      );

      // Send email notification if email is available
      if (user.email) {
        await sendEmailNotification(
          user.email,
          user.user_id,
          approved ? 'Account Approved - Knowledge Builder' : 'Account Status Update - Knowledge Builder',
          approved ? 'approval_notification' : 'rejection_notification',
          {
            user_name: user.full_name || user.email,
            approved,
            role: user.role,
            login_url: window.location.origin
          }
        );
      }

      // Remove from pending list
      setPendingUsers(prev => prev.filter(u => u.id !== user.id));

      toast({
        title: approved ? 'User Approved' : 'User Rejected',
        description: `${user.full_name || user.email} has been ${approved ? 'approved' : 'rejected'}.`,
      });

    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setProcessingUser(null);
    }
  };

  const getRoleIcon = (role: string) => {
    switch (role) {
      case 'admin': return <Crown className="h-4 w-4" />;
      case 'parent': return <Users className="h-4 w-4" />;
      case 'child': return <Baby className="h-4 w-4" />;
      default: return <User className="h-4 w-4" />;
    }
  };

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'admin': return 'bg-purple-100 text-purple-800 border-purple-200';
      case 'parent': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'child': return 'bg-green-100 text-green-800 border-green-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getRoleDescription = (role: string) => {
    switch (role) {
      case 'admin': return 'Full system access and user management';
      case 'parent': return 'Create question papers and manage children';
      case 'child': return 'Take tests and view results';
      default: return 'Standard user access';
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="text-center">Loading pending approvals...</div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Clock className="h-5 w-5" />
          Pending User Approvals
        </CardTitle>
      </CardHeader>
      <CardContent>
        {pendingUsers.length === 0 ? (
          <div className="text-center py-8">
            <CheckCircle className="h-12 w-12 mx-auto text-green-500 mb-4" />
            <h3 className="text-lg font-medium mb-2">All caught up!</h3>
            <p className="text-muted-foreground">
              No pending user approvals at this time.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {pendingUsers.map((user) => (
              <Card key={user.id} className="border-l-4 border-l-orange-500">
                <CardContent className="pt-6">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-3">
                        <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center">
                          {user.full_name?.[0] || user.email?.[0]?.toUpperCase() || 'U'}
                        </div>
                        <div>
                          <h3 className="font-semibold">{user.full_name || 'Unknown User'}</h3>
                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <Mail className="h-3 w-3" />
                            {user.email}
                          </div>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                        <div>
                          <div className="flex items-center gap-2 mb-2">
                            <Shield className="h-4 w-4 text-muted-foreground" />
                            <span className="text-sm font-medium">Requested Role:</span>
                          </div>
                          <Badge className={`${getRoleColor(user.role)} flex items-center gap-1 w-fit`}>
                            {getRoleIcon(user.role)}
                            {user.role.charAt(0).toUpperCase() + user.role.slice(1)}
                          </Badge>
                          <p className="text-xs text-muted-foreground mt-1">
                            {getRoleDescription(user.role)}
                          </p>
                        </div>

                        <div>
                          <div className="flex items-center gap-2 mb-2">
                            <Calendar className="h-4 w-4 text-muted-foreground" />
                            <span className="text-sm font-medium">Registration Date:</span>
                          </div>
                          <p className="text-sm">
                            {new Date(user.created_at).toLocaleDateString('en-US', {
                              year: 'numeric',
                              month: 'long',
                              day: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit'
                            })}
                          </p>
                        </div>
                      </div>

                      {user.role === 'admin' && (
                        <div className="flex items-start gap-2 p-3 bg-amber-50 border border-amber-200 rounded-lg mb-4">
                          <AlertCircle className="h-4 w-4 text-amber-600 mt-0.5" />
                          <div className="text-sm">
                            <p className="font-medium text-amber-800">Administrator Access Request</p>
                            <p className="text-amber-700">
                              This user is requesting administrator privileges. 
                              Ensure you verify their identity before approval.
                            </p>
                          </div>
                        </div>
                      )}
                    </div>

                    <div className="flex gap-2 ml-4">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleApproval(user, false)}
                        disabled={processingUser === user.id}
                        className="text-red-600 hover:text-red-700 hover:bg-red-50"
                      >
                        <XCircle className="h-4 w-4 mr-1" />
                        Reject
                      </Button>
                      <Button
                        size="sm"
                        onClick={() => handleApproval(user, true)}
                        disabled={processingUser === user.id}
                        className="bg-green-600 hover:bg-green-700 text-white"
                      >
                        <CheckCircle className="h-4 w-4 mr-1" />
                        Approve
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};