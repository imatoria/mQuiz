import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Switch } from '@/components/ui/switch';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { ChildAcademicProfile } from './ChildAcademicProfile';
import { 
  Plus, 
  UserPlus, 
  Mail, 
  Trash2, 
  Users, 
  AlertCircle,
  CheckCircle,
  Clock,
  Key,
  Settings,
  GraduationCap
} from 'lucide-react';

interface Child {
  id: string;
  user_id: string;
  email: string | null;
  full_name: string | null;
  is_approved: boolean;
  created_at: string;
  class_name?: string;
  subject_names?: string[];
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
  const [selectedChildForProfile, setSelectedChildForProfile] = useState<Child | null>(null);
  const [togglingChildId, setTogglingChildId] = useState<string | null>(null);
  const [fetchingAcademicInfo, setFetchingAcademicInfo] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    fetchChildren();
  }, []);

  const fetchChildren = async () => {
    try {
      const { data: user } = await supabase.auth.getUser();
      if (!user.user) {
        console.log('ChildrenManagement: No authenticated user');
        return;
      }

      console.log('ChildrenManagement: Fetching children for parent:', user.user.id);

      // Get children associated with this parent
      const { data: relationships, error: relError } = await supabase
        .from('parent_child_relationships')
        .select(`
          child_id
        `)
        .eq('parent_id', user.user.id);

      console.log('ChildrenManagement: Relationships query result:', { relationships, relError });

      if (relError) throw relError;

      if (relationships && relationships.length > 0) {
        const childIds = relationships.map(rel => rel.child_id);
        console.log('ChildrenManagement: Found child IDs:', childIds);
        
        console.log('ChildrenManagement: About to query profiles with childIds:', childIds);
        
        const { data: childrenData, error: childrenError } = await supabase
          .from('profiles')
          .select('*')
          .in('user_id', childIds);

        console.log('ChildrenManagement: Children profiles query result:', { childrenData, childrenError });
        console.log('ChildrenManagement: Current user ID:', user.user.id);

        if (childrenError) throw childrenError;
        
        // Fetch academic info for each child
        setFetchingAcademicInfo(true);
        const childrenWithAcademicInfo = await Promise.all(
          (childrenData || []).map(async (child) => {
            const currentYear = new Date().getFullYear().toString();
            
            // Fetch class assignment
            const { data: classData } = await supabase
              .from('child_class_assignments')
              .select('class_parent_id, classes_parent(class_name)')
              .eq('child_id', child.user_id)
              .eq('parent_id', user.user.id)
              .eq('is_current', true)
              .eq('academic_year', currentYear)
              .maybeSingle();

            // Fetch subject assignments
            const { data: subjectsData } = await supabase
              .from('child_subject_assignments')
              .select('subject_parent_id, subjects_parent(subject_name)')
              .eq('child_id', child.user_id)
              .eq('parent_id', user.user.id)
              .eq('is_current', true)
              .eq('academic_year', currentYear);

            return {
              ...child,
              class_name: classData?.classes_parent?.class_name,
              subject_names: subjectsData?.map(s => s.subjects_parent?.subject_name).filter(Boolean) as string[] || []
            };
          })
        );
        setFetchingAcademicInfo(false);
        
        setChildren(childrenWithAcademicInfo);
      } else {
        console.log('ChildrenManagement: No relationships found');
        setChildren([]);
      }
    } catch (error: any) {
      console.error('ChildrenManagement: Error fetching children:', error);
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
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Not authenticated');

      const { data, error } = await supabase.functions.invoke('create-child-account', {
        body: {
          email: newChildEmail,
          fullName: newChildName
        }
      });

      if (error) throw error;
      if (data.error) throw new Error(data.error);

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


  const handleToggleActive = async (childId: string, currentStatus: boolean) => {
    setTogglingChildId(childId);
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ is_approved: !currentStatus })
        .eq('user_id', childId);

      if (error) throw error;

      toast({
        title: "Status updated",
        description: `Child account is now ${!currentStatus ? 'active' : 'inactive'}`,
      });

      fetchChildren();
    } catch (error: any) {
      toast({
        title: "Failed to update status",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setTogglingChildId(null);
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="space-y-2">
              <Skeleton className="h-8 w-64" />
              <Skeleton className="h-4 w-96" />
            </div>
            <Skeleton className="h-10 w-32" />
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="border rounded-lg p-4">
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center space-x-4">
                  <Skeleton className="h-12 w-12 rounded-full" />
                  <div className="space-y-2">
                    <Skeleton className="h-5 w-48" />
                    <Skeleton className="h-4 w-64" />
                  </div>
                </div>
                <Skeleton className="h-6 w-20 rounded-full" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-none shadow-lg bg-gradient-to-br from-background to-accent/5">
      <CardHeader className="pb-4">
        <div className="flex flex-col md:flex-row gap-4 justify-between items-start md:items-center">
          <div className="space-y-1">
            <CardTitle className="flex items-center text-2xl font-bold bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
              <Users className="w-6 h-6 mr-3 text-primary" />
              Children Management
            </CardTitle>
            <CardDescription className="text-base">
              Manage and monitor your children's academic profiles
            </CardDescription>
          </div>
          
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button className="shadow-md hover:shadow-lg transition-all duration-300 hover:scale-105">
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
      
      <CardContent className="pt-2">
        {children.length === 0 ? (
          <div className="text-center py-16 px-4">
            <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-gradient-to-br from-primary/20 to-accent/20 flex items-center justify-center">
              <Users className="w-10 h-10 text-primary" />
            </div>
            <h3 className="text-xl font-semibold mb-2">No children added yet</h3>
            <p className="text-muted-foreground max-w-sm mx-auto">
              Start by adding your children to create and assign personalized tests.
            </p>
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-1 xl:grid-cols-2">
            {children.map((child) => (
              <div 
                key={child.id} 
                className="group relative overflow-hidden rounded-xl border bg-card hover:shadow-xl transition-all duration-300 hover:scale-[1.02]"
              >
                <div className="relative p-5 flex flex-col h-full">
                  <div className="space-y-4 flex-1">
                    {/* Header Section */}
                    <div className="flex items-start gap-4">
                      <div className="relative">
                        <div className="w-14 h-14 bg-gradient-to-br from-primary to-primary/60 rounded-2xl flex items-center justify-center text-white font-bold text-xl shadow-lg">
                          {child.full_name?.charAt(0) || child.email?.charAt(0) || '?'}
                        </div>
                        {child.is_approved && (
                          <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-green-500 rounded-full border-2 border-card flex items-center justify-center">
                            <CheckCircle className="w-3 h-3 text-white" />
                          </div>
                        )}
                      </div>
                      
                      <div className="flex-1 min-w-0">
                        <h4 className="font-semibold text-lg truncate">{child.full_name || 'Unnamed Child'}</h4>
                        <p className="text-sm text-muted-foreground flex items-center gap-1 truncate">
                          <Mail className="w-3.5 h-3.5 flex-shrink-0" />
                          {child.email}
                        </p>
                        
                        <div className="flex items-center gap-2 mt-2">
                          {togglingChildId === child.user_id ? (
                            <div className="flex items-center gap-2 text-xs text-muted-foreground">
                              <Clock className="w-3.5 h-3.5 animate-spin" />
                              <span>Updating...</span>
                            </div>
                          ) : (
                            <>
                              <span className="text-xs font-medium text-muted-foreground">
                                {child.is_approved ? 'Active' : 'Inactive'}
                              </span>
                              <Switch
                                checked={child.is_approved}
                                onCheckedChange={() => handleToggleActive(child.user_id, child.is_approved)}
                                className="scale-90"
                                disabled={togglingChildId !== null}
                              />
                            </>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Academic Info Section */}
                    {fetchingAcademicInfo ? (
                      <div className="flex items-center gap-2 pt-3 border-t text-xs text-muted-foreground">
                        <Clock className="w-3.5 h-3.5 animate-spin" />
                        <span>Loading academic info...</span>
                      </div>
                    ) : (child.class_name || (child.subject_names && child.subject_names.length > 0)) && (
                      <div className="space-y-2 pt-3 border-t">
                        {child.class_name && (
                          <div className="flex items-center gap-2">
                            <GraduationCap className="w-4 h-4 text-primary flex-shrink-0" />
                            <Badge variant="outline" className="text-xs font-medium">
                              {child.class_name}
                            </Badge>
                          </div>
                        )}
                        {child.subject_names && child.subject_names.length > 0 && (
                          <div className="flex flex-wrap gap-1.5">
                            {child.subject_names.map((subject, index) => (
                              <Badge key={index} variant="secondary" className="text-xs">
                                {subject}
                              </Badge>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Action Buttons - Pinned to bottom */}
                  <div className="flex gap-2 pt-4 mt-auto">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setSelectedChildForProfile(child)}
                      className="flex-1 hover:bg-primary hover:text-primary-foreground transition-colors"
                    >
                      <Settings className="w-4 h-4 mr-2" />
                      Manage Profile
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleRemoveChild(child.user_id, child.full_name || child.email || 'Child')}
                      className="text-destructive hover:bg-destructive hover:text-destructive-foreground transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>

      {selectedChildForProfile && (
        <ChildAcademicProfile
          isOpen={Boolean(selectedChildForProfile)}
          onClose={() => setSelectedChildForProfile(null)}
          childId={selectedChildForProfile.user_id}
          childName={selectedChildForProfile.full_name || selectedChildForProfile.email || 'Child'}
          onUpdate={() => {
            setFetchingAcademicInfo(true);
            fetchChildren();
          }}
        />
      )}
    </Card>
  );
};
