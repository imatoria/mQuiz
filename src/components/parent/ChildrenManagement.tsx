import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { 
  Plus, 
  UserPlus, 
  Mail, 
  Trash2, 
  Users, 
  AlertCircle,
  CheckCircle,
  Clock,
  Key
} from 'lucide-react';

interface Child {
  id: string;
  user_id: string;
  email: string | null;
  full_name: string | null;
  is_approved: boolean;
  created_at: string;
}

interface ChildrenManagementProps {
  onChildrenUpdate?: () => void;
}

export const ChildrenManagement = ({ onChildrenUpdate }: ChildrenManagementProps) => {
  const [children, setChildren] = useState<Child[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isAddingChild, setIsAddingChild] = useState(false);
  const [newChildEmail, setNewChildEmail] = useState('');
  const [newChildName, setNewChildName] = useState('');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    fetchChildren();
  }, []);

  const fetchChildren = async () => {
    try {
      const { data: user } = await supabase.auth.getUser();
      if (!user.user) return;

      // Get children associated with this parent
      const { data: relationships, error: relError } = await supabase
        .from('parent_child_relationships')
        .select(`
          child_id,
          profiles!parent_child_relationships_child_id_fkey(
            id,
            user_id,
            email,
            full_name,
            is_approved,
            created_at
          )
        `)
        .eq('parent_id', user.user.id);

      if (relError) throw relError;

      const childrenData = relationships?.map(rel => rel.profiles).filter(Boolean) || [];
      setChildren(childrenData as Child[]);
    } catch (error: any) {
      toast({
        title: "Error fetching children",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddChild = async () => {
    if (!newChildEmail || !newChildName) {
      toast({
        title: "Missing information",
        description: "Please provide both email and name for the child.",
        variant: "destructive",
      });
      return;
    }

    setIsAddingChild(true);

    try {
      const { data: user } = await supabase.auth.getUser();
      if (!user.user) throw new Error('Not authenticated');

      // Check if user already exists
      const { data: existingProfile } = await supabase
        .from('profiles')
        .select('*')
        .eq('email', newChildEmail)
        .single();

      let childUserId: string;

      if (existingProfile) {
        // User exists, check if they're already a child
        if (existingProfile.role !== 'child') {
          throw new Error('This user is not registered as a child account.');
        }
        childUserId = existingProfile.user_id;
      } else {
        // Create invitation for new child account
        // In a real implementation, you'd send an invitation email
        // For now, we'll create a placeholder profile that needs to be activated
        const tempPassword = Math.random().toString(36).slice(-8);
        
        const { data: authData, error: authError } = await supabase.auth.admin.createUser({
          email: newChildEmail,
          password: tempPassword,
          email_confirm: true,
          user_metadata: {
            full_name: newChildName,
            role: 'child'
          }
        });

        if (authError) throw authError;
        childUserId = authData.user.id;
      }

      // Create parent-child relationship
      const { error: relationshipError } = await supabase
        .from('parent_child_relationships')
        .insert({
          parent_id: user.user.id,
          child_id: childUserId
        });

      if (relationshipError) throw relationshipError;

      toast({
        title: "Child added successfully",
        description: `${newChildName} has been added to your children list.`,
      });

      // Reset form and refresh
      setNewChildEmail('');
      setNewChildName('');
      setIsDialogOpen(false);
      fetchChildren();
      onChildrenUpdate?.();

    } catch (error: any) {
      toast({
        title: "Failed to add child",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsAddingChild(false);
    }
  };

  const handleRemoveChild = async (childId: string, childName: string) => {
    if (!confirm(`Are you sure you want to remove ${childName} from your children list?`)) {
      return;
    }

    try {
      const { data: user } = await supabase.auth.getUser();
      if (!user.user) throw new Error('Not authenticated');

      const { error } = await supabase
        .from('parent_child_relationships')
        .delete()
        .eq('parent_id', user.user.id)
        .eq('child_id', childId);

      if (error) throw error;

      toast({
        title: "Child removed",
        description: `${childName} has been removed from your children list.`,
      });

      fetchChildren();
      onChildrenUpdate?.();

    } catch (error: any) {
      toast({
        title: "Failed to remove child",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const getStatusBadge = (child: Child) => {
    if (child.is_approved) {
      return <Badge variant="default" className="bg-green-100 text-green-800"><CheckCircle className="w-3 h-3 mr-1" />Active</Badge>;
    } else {
      return <Badge variant="secondary"><Clock className="w-3 h-3 mr-1" />Pending</Badge>;
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="text-center">Loading children...</div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center">
              <Users className="w-5 h-5 mr-2" />
              Children Management
            </CardTitle>
            <CardDescription>
              Manage your children's accounts and access
            </CardDescription>
          </div>
          
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="w-4 h-4 mr-2" />
                Add Child
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add New Child</DialogTitle>
                <DialogDescription>
                  Add a child account to manage their tests and progress.
                </DialogDescription>
              </DialogHeader>
              
              <div className="space-y-4">
                <div>
                  <Label htmlFor="childName">Child's Full Name</Label>
                  <Input
                    id="childName"
                    value={newChildName}
                    onChange={(e) => setNewChildName(e.target.value)}
                    placeholder="Enter child's full name"
                  />
                </div>
                
                <div>
                  <Label htmlFor="childEmail">Child's Email</Label>
                  <Input
                    id="childEmail"
                    type="email"
                    value={newChildEmail}
                    onChange={(e) => setNewChildEmail(e.target.value)}
                    placeholder="Enter child's email address"
                  />
                </div>

                <Alert>
                  <Key className="h-4 w-4" />
                  <AlertDescription>
                    If the child doesn't have an account, we'll create one and send login instructions to their email.
                  </AlertDescription>
                </Alert>

                <div className="flex gap-2 pt-4">
                  <Button 
                    onClick={handleAddChild} 
                    disabled={isAddingChild || !newChildEmail || !newChildName}
                    className="flex-1"
                  >
                    {isAddingChild ? (
                      <>
                        <Clock className="w-4 h-4 mr-2 animate-spin" />
                        Adding...
                      </>
                    ) : (
                      <>
                        <UserPlus className="w-4 h-4 mr-2" />
                        Add Child
                      </>
                    )}
                  </Button>
                  <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                    Cancel
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      
      <CardContent>
        {children.length === 0 ? (
          <div className="text-center py-8">
            <Users className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium mb-2">No children added yet</h3>
            <p className="text-muted-foreground mb-4">
              Add your children to start creating and assigning tests.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {children.map((child) => (
              <div key={child.id} className="flex items-center justify-between p-4 border rounded-lg">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white font-medium">
                    {child.full_name?.charAt(0) || child.email?.charAt(0) || '?'}
                  </div>
                  <div>
                    <p className="font-medium">{child.full_name || 'Unnamed Child'}</p>
                    <p className="text-sm text-muted-foreground flex items-center">
                      <Mail className="w-3 h-3 mr-1" />
                      {child.email}
                    </p>
                  </div>
                </div>
                
                <div className="flex items-center gap-2">
                  {getStatusBadge(child)}
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleRemoveChild(child.user_id, child.full_name || child.email || 'Child')}
                    className="text-red-600 hover:text-red-700"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};
