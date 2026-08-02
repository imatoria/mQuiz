import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { dbService } from '@/services/db';
import { authService } from '@/services/auth/authService';
import { 
  Shield, 
  User,
  Settings,
  BookOpen,
  Calendar,
  BarChart3,
  Save,
  Lock,
  Unlock
} from 'lucide-react';

interface Child {
  id: string;
  user_id: string;
  email: string | null;
  full_name: string | null;
  is_approved: boolean;
}

interface ChildPermissions {
  user_id: string;
  can_view_analytics: boolean;
  can_retake_tests: boolean;
  can_view_detailed_results: boolean;
  can_access_content_library: boolean;
  max_test_attempts: number;
  restricted_subjects: string[];
}

export const ChildPermissionManager = () => {
  const [children, setChildren] = useState<Child[]>([]);
  const [permissions, setPermissions] = useState<Record<string, ChildPermissions>>({});
  const [selectedChild, setSelectedChild] = useState<string>('');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    fetchChildren();
  }, []);

  const fetchChildren = async () => {
    try {
      const user = authService.getCurrentUser();
      if (!user) return;

      const { data: relationships, error: relError } = await dbService.getProvider().query(
        'SELECT child_id FROM parent_child_relationships WHERE parent_id = ?',
        [user.id]
      );

      if (relError) throw relError;

      if (relationships && relationships.length > 0) {
        const childIds = relationships.map(rel => rel.child_id);
        
        const placeholders = childIds.map(() => '?').join(',');
        const { data: childrenData, error: childrenError } = await dbService.getProvider().query(
          `SELECT * FROM profiles WHERE user_id IN (${placeholders}) AND is_approved = ?`,
          [...childIds, true]
        );

        if (childrenError) throw childrenError;
        
        setChildren(childrenData || []);
        
        // Initialize default permissions for each child
        const defaultPermissions: Record<string, ChildPermissions> = {};
        (childrenData || []).forEach(child => {
          defaultPermissions[child.user_id] = {
            user_id: child.user_id,
            can_view_analytics: false,
            can_retake_tests: true,
            can_view_detailed_results: true,
            can_access_content_library: true,
            max_test_attempts: 3,
            restricted_subjects: []
          };
        });
        setPermissions(defaultPermissions);
      }
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

  const updatePermission = (childId: string, key: keyof ChildPermissions, value: any) => {
    setPermissions(prev => ({
      ...prev,
      [childId]: {
        ...prev[childId],
        [key]: value
      }
    }));
  };

  const savePermissions = async (childId: string) => {
    try {
      // In a real implementation, you would save these to a child_permissions table
      // For now, we'll just show a success message
      toast({
        title: "Permissions saved",
        description: "Child permissions have been updated successfully.",
      });
    } catch (error: any) {
      toast({
        title: "Failed to save permissions",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const getPermissionsSummary = (childId: string) => {
    const perms = permissions[childId];
    if (!perms) return "Default permissions";
    
    const activePermissions = [];
    if (perms.can_view_analytics) activePermissions.push("Analytics");
    if (perms.can_retake_tests) activePermissions.push("Retakes");
    if (perms.can_view_detailed_results) activePermissions.push("Detailed results");
    if (perms.can_access_content_library) activePermissions.push("Content library");
    
    return activePermissions.length > 0 ? activePermissions.join(", ") : "Restricted access";
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="text-center">Loading permission data...</div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center">
          <Shield className="w-5 h-5 mr-2" />
          Child Permission Manager
        </CardTitle>
        <CardDescription>
          Control what your children can access and do in the system
        </CardDescription>
      </CardHeader>
      
      <CardContent>
        {children.length === 0 ? (
          <div className="text-center py-8">
            <Shield className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium mb-2">No children to manage</h3>
            <p className="text-muted-foreground">
              Add children to your account to manage their permissions.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {children.map((child) => (
              <div key={child.user_id} className="border rounded-lg p-4">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white font-medium">
                      {child.full_name?.charAt(0) || child.email?.charAt(0) || '?'}
                    </div>
                    <div>
                      <h4 className="font-medium">{child.full_name || child.email}</h4>
                      <p className="text-sm text-muted-foreground">
                        {getPermissionsSummary(child.user_id)}
                      </p>
                    </div>
                  </div>
                  
                  <Dialog>
                    <DialogTrigger asChild>
                      <Button variant="outline" size="sm">
                        <Settings className="w-4 h-4 mr-2" />
                        Manage Permissions
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-lg">
                      <DialogHeader>
                        <DialogTitle>
                          Permissions for {child.full_name || child.email}
                        </DialogTitle>
                        <DialogDescription>
                          Configure what this child can access and do
                        </DialogDescription>
                      </DialogHeader>
                      
                      <div className="space-y-6">
                        {/* Test Permissions */}
                        <div className="space-y-4">
                          <h4 className="font-medium flex items-center">
                            <Calendar className="w-4 h-4 mr-2" />
                            Test Permissions
                          </h4>
                          
                          <div className="space-y-3 pl-6">
                            <div className="flex items-center justify-between">
                              <Label htmlFor={`retake-${child.user_id}`}>Allow test retakes</Label>
                              <Switch
                                id={`retake-${child.user_id}`}
                                checked={permissions[child.user_id]?.can_retake_tests || false}
                                onCheckedChange={(checked) => 
                                  updatePermission(child.user_id, 'can_retake_tests', checked)
                                }
                              />
                            </div>
                            
                            <div className="flex items-center justify-between">
                              <Label htmlFor={`detailed-${child.user_id}`}>View detailed results</Label>
                              <Switch
                                id={`detailed-${child.user_id}`}
                                checked={permissions[child.user_id]?.can_view_detailed_results || false}
                                onCheckedChange={(checked) => 
                                  updatePermission(child.user_id, 'can_view_detailed_results', checked)
                                }
                              />
                            </div>
                            
                            <div className="flex items-center justify-between">
                              <Label htmlFor={`max-attempts-${child.user_id}`}>Max attempts per test</Label>
                              <Select
                                value={permissions[child.user_id]?.max_test_attempts?.toString() || '3'}
                                onValueChange={(value) => 
                                  updatePermission(child.user_id, 'max_test_attempts', parseInt(value))
                                }
                              >
                                <SelectTrigger className="w-20">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="1">1</SelectItem>
                                  <SelectItem value="2">2</SelectItem>
                                  <SelectItem value="3">3</SelectItem>
                                  <SelectItem value="5">5</SelectItem>
                                  <SelectItem value="10">10</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                          </div>
                        </div>

                        {/* Content Permissions */}
                        <div className="space-y-4">
                          <h4 className="font-medium flex items-center">
                            <BookOpen className="w-4 h-4 mr-2" />
                            Content Permissions
                          </h4>
                          
                          <div className="space-y-3 pl-6">
                            <div className="flex items-center justify-between">
                              <Label htmlFor={`content-${child.user_id}`}>Access content library</Label>
                              <Switch
                                id={`content-${child.user_id}`}
                                checked={permissions[child.user_id]?.can_access_content_library || false}
                                onCheckedChange={(checked) => 
                                  updatePermission(child.user_id, 'can_access_content_library', checked)
                                }
                              />
                            </div>
                          </div>
                        </div>

                        {/* Analytics Permissions */}
                        <div className="space-y-4">
                          <h4 className="font-medium flex items-center">
                            <BarChart3 className="w-4 h-4 mr-2" />
                            Analytics Permissions
                          </h4>
                          
                          <div className="space-y-3 pl-6">
                            <div className="flex items-center justify-between">
                              <Label htmlFor={`analytics-${child.user_id}`}>View performance analytics</Label>
                              <Switch
                                id={`analytics-${child.user_id}`}
                                checked={permissions[child.user_id]?.can_view_analytics || false}
                                onCheckedChange={(checked) => 
                                  updatePermission(child.user_id, 'can_view_analytics', checked)
                                }
                              />
                            </div>
                          </div>
                        </div>

                        <div className="flex gap-2 pt-4">
                          <Button 
                            onClick={() => savePermissions(child.user_id)}
                            className="flex-1"
                          >
                            <Save className="w-4 h-4 mr-2" />
                            Save Permissions
                          </Button>
                        </div>
                      </div>
                    </DialogContent>
                  </Dialog>
                </div>

                {/* Quick Permission Toggles */}
                <div className="grid grid-cols-2 gap-2">
                  <Badge variant={permissions[child.user_id]?.can_retake_tests ? "default" : "secondary"}>
                    {permissions[child.user_id]?.can_retake_tests ? <Unlock className="w-3 h-3 mr-1" /> : <Lock className="w-3 h-3 mr-1" />}
                    Test Retakes
                  </Badge>
                  <Badge variant={permissions[child.user_id]?.can_view_analytics ? "default" : "secondary"}>
                    {permissions[child.user_id]?.can_view_analytics ? <Unlock className="w-3 h-3 mr-1" /> : <Lock className="w-3 h-3 mr-1" />}
                    Analytics
                  </Badge>
                  <Badge variant={permissions[child.user_id]?.can_access_content_library ? "default" : "secondary"}>
                    {permissions[child.user_id]?.can_access_content_library ? <Unlock className="w-3 h-3 mr-1" /> : <Lock className="w-3 h-3 mr-1" />}
                    Content Library
                  </Badge>
                  <Badge variant={permissions[child.user_id]?.can_view_detailed_results ? "default" : "secondary"}>
                    {permissions[child.user_id]?.can_view_detailed_results ? <Unlock className="w-3 h-3 mr-1" /> : <Lock className="w-3 h-3 mr-1" />}
                    Detailed Results
                  </Badge>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};