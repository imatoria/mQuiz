import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { 
  Users, 
  Calendar,
  Clock,
  UserCheck,
  Settings,
  Plus,
  Trash2,
  CheckCircle,
  AlertCircle
} from 'lucide-react';

interface Child {
  id: string;
  user_id: string;
  email: string | null;
  full_name: string | null;
  is_approved: boolean;
}

interface ScheduledTest {
  id: string;
  title: string;
  start_time: string;
  end_time: string;
  max_attempts: number;
  assign_to_all: boolean;
  question_paper_id: string;
}

interface TestAssignment {
  id: string;
  scheduled_test_id: string;
  assigned_to_user_id: string;
  scheduled_test: ScheduledTest;
}

export const TestAssignmentManager = () => {
  const [children, setChildren] = useState<Child[]>([]);
  const [scheduledTests, setScheduledTests] = useState<ScheduledTest[]>([]);
  const [assignments, setAssignments] = useState<TestAssignment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedTest, setSelectedTest] = useState<string>('');
  const [selectedChildren, setSelectedChildren] = useState<string[]>([]);
  const { toast } = useToast();

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      await Promise.all([
        fetchChildren(),
        fetchScheduledTests(),
        fetchAssignments()
      ]);
    } catch (error: any) {
      toast({
        title: "Error loading data",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const fetchChildren = async () => {
    const { data: user } = await supabase.auth.getUser();
    if (!user.user) return;

    const { data: relationships, error: relError } = await supabase
      .from('parent_child_relationships')
      .select('child_id')
      .eq('parent_id', user.user.id);

    if (relError) throw relError;

    if (relationships && relationships.length > 0) {
      const childIds = relationships.map(rel => rel.child_id);
      
      const { data: childrenData, error: childrenError } = await supabase
        .from('profiles')
        .select('*')
        .in('user_id', childIds)
        .eq('is_approved', true);

      if (childrenError) throw childrenError;
      setChildren(childrenData || []);
    }
  };

  const fetchScheduledTests = async () => {
    const { data: user } = await supabase.auth.getUser();
    if (!user.user) return;

    const { data, error } = await supabase
      .from('scheduled_tests')
      .select('*')
      .eq('creator_id', user.user.id)
      .order('created_at', { ascending: false });

    if (error) throw error;
    setScheduledTests(data || []);
  };

  const fetchAssignments = async () => {
    const { data: user } = await supabase.auth.getUser();
    if (!user.user) return;

    const { data, error } = await supabase
      .from('test_assignments')
      .select(`
        *,
        scheduled_test:scheduled_tests(*)
      `)
      .eq('scheduled_tests.creator_id', user.user.id);

    if (error) throw error;
    setAssignments(data || []);
  };

  const handleCreateAssignment = async () => {
    if (!selectedTest || selectedChildren.length === 0) {
      toast({
        title: "Missing information",
        description: "Please select a test and at least one child.",
        variant: "destructive",
      });
      return;
    }

    try {
      const assignmentData = selectedChildren.map(childId => ({
        scheduled_test_id: selectedTest,
        assigned_to_user_id: childId
      }));

      const { error } = await supabase
        .from('test_assignments')
        .insert(assignmentData);

      if (error) throw error;

      toast({
        title: "Assignments created",
        description: `Test assigned to ${selectedChildren.length} children successfully.`,
      });

      setIsDialogOpen(false);
      setSelectedTest('');
      setSelectedChildren([]);
      fetchAssignments();

    } catch (error: any) {
      toast({
        title: "Failed to create assignments",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleRemoveAssignment = async (assignmentId: string) => {
    try {
      const { error } = await supabase
        .from('test_assignments')
        .delete()
        .eq('id', assignmentId);

      if (error) throw error;

      toast({
        title: "Assignment removed",
        description: "Test assignment has been removed successfully.",
      });

      fetchAssignments();

    } catch (error: any) {
      toast({
        title: "Failed to remove assignment",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleToggleAssignToAll = async (testId: string, currentValue: boolean) => {
    try {
      const { error } = await supabase
        .from('scheduled_tests')
        .update({ assign_to_all: !currentValue })
        .eq('id', testId);

      if (error) throw error;

      toast({
        title: "Assignment updated",
        description: `Test ${!currentValue ? 'assigned to all children' : 'assignment mode changed to selective'}.`,
      });

      fetchScheduledTests();
      fetchAssignments();

    } catch (error: any) {
      toast({
        title: "Failed to update assignment",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const getChildName = (userId: string) => {
    const child = children.find(c => c.user_id === userId);
    return child?.full_name || child?.email || 'Unknown Child';
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="text-center">Loading assignment data...</div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center">
                <Settings className="w-5 h-5 mr-2" />
                Test Assignment Manager
              </CardTitle>
              <CardDescription>
                Assign tests to specific children and manage permissions
              </CardDescription>
            </div>
            
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="w-4 h-4 mr-2" />
                  Assign Test
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-md">
                <DialogHeader>
                  <DialogTitle>Assign Test to Children</DialogTitle>
                  <DialogDescription>
                    Select a test and children to create assignments.
                  </DialogDescription>
                </DialogHeader>
                
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="test-select">Select Test</Label>
                    <Select value={selectedTest} onValueChange={setSelectedTest}>
                      <SelectTrigger>
                        <SelectValue placeholder="Choose a test" />
                      </SelectTrigger>
                      <SelectContent>
                        {scheduledTests.map((test) => (
                          <SelectItem key={test.id} value={test.id}>
                            {test.title}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label>Select Children</Label>
                    <div className="space-y-2 mt-2 max-h-40 overflow-y-auto">
                      {children.map((child) => (
                        <div key={child.user_id} className="flex items-center space-x-2">
                          <input
                            type="checkbox"
                            id={child.user_id}
                            checked={selectedChildren.includes(child.user_id)}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setSelectedChildren([...selectedChildren, child.user_id]);
                              } else {
                                setSelectedChildren(selectedChildren.filter(id => id !== child.user_id));
                              }
                            }}
                            className="rounded border-gray-300"
                          />
                          <Label htmlFor={child.user_id} className="text-sm">
                            {child.full_name || child.email}
                          </Label>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="flex gap-2 pt-4">
                    <Button onClick={handleCreateAssignment} className="flex-1">
                      <UserCheck className="w-4 h-4 mr-2" />
                      Create Assignments
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
      </Card>

      {/* Scheduled Tests with Assignment Options */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Calendar className="w-5 h-5 mr-2" />
            Test Assignment Settings
          </CardTitle>
          <CardDescription>
            Configure how tests are assigned to children
          </CardDescription>
        </CardHeader>
        <CardContent>
          {scheduledTests.length === 0 ? (
            <div className="text-center py-8">
              <Calendar className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium mb-2">No scheduled tests</h3>
              <p className="text-muted-foreground">
                Create scheduled tests to manage assignments.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {scheduledTests.map((test) => (
                <div key={test.id} className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex-1">
                    <h4 className="font-medium">{test.title}</h4>
                    <div className="flex items-center gap-4 text-sm text-muted-foreground mt-1">
                      <span className="flex items-center">
                        <Clock className="w-3 h-3 mr-1" />
                        {new Date(test.start_time).toLocaleDateString()}
                      </span>
                      <span>Max attempts: {test.max_attempts}</span>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-4">
                    <div className="flex items-center space-x-2">
                      <Switch
                        id={`assign-all-${test.id}`}
                        checked={test.assign_to_all}
                        onCheckedChange={() => handleToggleAssignToAll(test.id, test.assign_to_all)}
                      />
                      <Label htmlFor={`assign-all-${test.id}`} className="text-sm">
                        Assign to all children
                      </Label>
                    </div>
                    
                    {test.assign_to_all ? (
                      <Badge variant="default">
                        <CheckCircle className="w-3 h-3 mr-1" />
                        Auto-assigned
                      </Badge>
                    ) : (
                      <Badge variant="secondary">
                        <AlertCircle className="w-3 h-3 mr-1" />
                        Selective
                      </Badge>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Current Assignments */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Users className="w-5 h-5 mr-2" />
            Current Assignments
          </CardTitle>
          <CardDescription>
            Manage individual test assignments
          </CardDescription>
        </CardHeader>
        <CardContent>
          {assignments.length === 0 ? (
            <div className="text-center py-8">
              <Users className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium mb-2">No assignments</h3>
              <p className="text-muted-foreground">
                Create test assignments to see them here.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {assignments.map((assignment) => (
                <div key={assignment.id} className="flex items-center justify-between p-4 border rounded-lg">
                  <div>
                    <h4 className="font-medium">{assignment.scheduled_test.title}</h4>
                    <p className="text-sm text-muted-foreground">
                      Assigned to: {getChildName(assignment.assigned_to_user_id)}
                    </p>
                  </div>
                  
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleRemoveAssignment(assignment.id)}
                    className="text-red-600 hover:text-red-700"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};