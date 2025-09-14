import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Checkbox } from '@/components/ui/checkbox';
import { Calendar, Clock, Users, Loader2, Eye } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { supabase } from '@/integrations/supabase/client';

interface ScheduledTest {
  id: string;
  title: string;
  start_time: string;
  end_time: string;
  max_attempts: number;
  assign_to_all: boolean;
  question_paper_id: string;
  time_limit_hours?: number;
  time_limit_minutes?: number;
  show_results?: boolean;
  question_papers?: {
    title: string;
    total_questions: number;
    time_limit_minutes: number;
    subjects?: { name: string };
  };
}

interface TestEditModalProps {
  test: ScheduledTest | null;
  isOpen: boolean;
  onClose: () => void;
  onTestUpdated: () => void;
}

export const TestEditModal = ({ test, isOpen, onClose, onTestUpdated }: TestEditModalProps) => {
  const [title, setTitle] = useState('');
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');
  const [maxAttempts, setMaxAttempts] = useState('1');
  const [assignToAll, setAssignToAll] = useState(true);
  const [selectedChildren, setSelectedChildren] = useState<string[]>([]);
  const [timeLimitHours, setTimeLimitHours] = useState('1');
  const [timeLimitMinutes, setTimeLimitMinutes] = useState('0');
  const [showResults, setShowResults] = useState(false);
  const [children, setChildren] = useState<any[]>([]);
  const [isUpdating, setIsUpdating] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (test && isOpen) {
      setTitle(test.title);
      setStartTime(new Date(test.start_time).toISOString().slice(0, 16));
      setEndTime(new Date(test.end_time).toISOString().slice(0, 16));
      setMaxAttempts(test.max_attempts.toString());
      setTimeLimitHours((test.time_limit_hours || 1).toString());
      setTimeLimitMinutes((test.time_limit_minutes || 0).toString());
      setShowResults(test.show_results || false);
      setAssignToAll(test.assign_to_all);
      fetchChildren();
      if (!test.assign_to_all) {
        fetchTestAssignments();
      }
    }
  }, [test, isOpen]);

  const fetchChildren = async () => {
    try {
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
          .in('user_id', childIds);

        if (childrenError) throw childrenError;
        
        const formattedChildren = childrenData?.map(child => ({
          id: child.user_id,
          name: child.full_name || child.email || 'Unnamed Child',
          email: child.email || ''
        })) || [];

        setChildren(formattedChildren);
      } else {
        setChildren([]);
      }
    } catch (error: any) {
      console.error('Error fetching children:', error);
      setChildren([]);
    }
  };

  const fetchTestAssignments = async () => {
    if (!test) return;

    try {
      const { data: assignments, error } = await supabase
        .from('test_assignments')
        .select('assigned_to_user_id')
        .eq('scheduled_test_id', test.id);

      if (error) throw error;

      const assignedIds = assignments?.map(a => a.assigned_to_user_id) || [];
      setSelectedChildren(assignedIds);
    } catch (error: any) {
      console.error('Error fetching test assignments:', error);
    }
  };

  const handleChildSelection = (childId: string, checked: boolean) => {
    if (checked) {
      setSelectedChildren([...selectedChildren, childId]);
    } else {
      setSelectedChildren(selectedChildren.filter(id => id !== childId));
    }
  };

  const handleUpdate = async () => {
    if (!test || !title || !startTime || !endTime || !maxAttempts || !timeLimitHours) {
      toast({
        title: "Missing information",
        description: "Please fill in all required fields.",
        variant: "destructive",
      });
      return;
    }

    if (!assignToAll && selectedChildren.length === 0) {
      toast({
        title: "No children selected",
        description: "Please select at least one child or assign to all.",
        variant: "destructive",
      });
      return;
    }

    const startDate = new Date(startTime);
    const endDate = new Date(endTime);

    if (startDate >= endDate) {
      toast({
        title: "Invalid time range",
        description: "End time must be after start time.",
        variant: "destructive",
      });
      return;
    }

    setIsUpdating(true);

    try {
      // Update scheduled test
      const { error: testError } = await supabase
        .from('scheduled_tests')
        .update({
          title,
          start_time: startDate.toISOString(),
          end_time: endDate.toISOString(),
          max_attempts: parseInt(maxAttempts),
          assign_to_all: assignToAll,
          time_limit_hours: parseInt(timeLimitHours),
          time_limit_minutes: parseInt(timeLimitMinutes),
          show_results: showResults
        })
        .eq('id', test.id);

      if (testError) throw testError;

      // Handle assignments
      if (assignToAll) {
        // Delete existing specific assignments if switching to assign all
        await supabase
          .from('test_assignments')
          .delete()
          .eq('scheduled_test_id', test.id);
      } else {
        // Delete existing assignments
        await supabase
          .from('test_assignments')
          .delete()
          .eq('scheduled_test_id', test.id);

        // Create new assignments
        if (selectedChildren.length > 0) {
          const assignments = selectedChildren.map(childId => ({
            scheduled_test_id: test.id,
            assigned_to_user_id: childId
          }));

          const { error: assignError } = await supabase
            .from('test_assignments')
            .insert(assignments);

          if (assignError) throw assignError;
        }
      }

      toast({
        title: "Test updated successfully",
        description: `"${title}" has been updated.`,
      });

      onTestUpdated();
      onClose();

    } catch (error: any) {
      toast({
        title: "Update failed",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsUpdating(false);
    }
  };

  const handleClose = () => {
    onClose();
    // Reset form when closing
    setTitle('');
    setStartTime('');
    setEndTime('');
    setMaxAttempts('1');
    setTimeLimitHours('1');
    setTimeLimitMinutes('0');
    setShowResults(false);
    setAssignToAll(true);
    setSelectedChildren([]);
  };

  if (!test) return null;

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Edit Test
          </DialogTitle>
          <DialogDescription>
            Update the details for "{test.title}"
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="text-sm text-muted-foreground bg-muted p-3 rounded-md">
            <div className="font-medium mb-1">Question Paper: {test.question_papers?.title}</div>
            <div className="flex items-center gap-2 mb-1">
              <Clock className="h-4 w-4" />
              Duration: {test.time_limit_hours || 1}h {test.time_limit_minutes || 0}m
            </div>
            <div>Questions: {test.question_papers?.total_questions}</div>
          </div>

          <div>
            <Label htmlFor="edit-title">Test Title</Label>
            <Input
              id="edit-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Enter test title"
            />
          </div>

          <div className="grid grid-cols-1 gap-4">
            <div>
              <Label htmlFor="edit-startTime">Start Time</Label>
              <Input
                id="edit-startTime"
                type="datetime-local"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
              />
            </div>

            <div>
              <Label htmlFor="edit-endTime">End Time</Label>
              <Input
                id="edit-endTime"
                type="datetime-local"
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
                min={startTime}
              />
            </div>
          </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label htmlFor="edit-attempts">Maximum Attempts</Label>
            <Select value={maxAttempts} onValueChange={setMaxAttempts}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {[1, 2, 3, 5, 10].map((num) => (
                  <SelectItem key={num} value={num.toString()}>
                    {num} attempt{num > 1 ? 's' : ''}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label>Test Duration</Label>
            <div className="flex gap-2">
              <div className="flex-1">
                <Select value={timeLimitHours} onValueChange={setTimeLimitHours}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Array.from({ length: 13 }, (_, i) => (
                      <SelectItem key={i} value={i.toString()}>
                        {i} hour{i !== 1 ? 's' : ''}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex-1">
                <Select value={timeLimitMinutes} onValueChange={setTimeLimitMinutes}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Array.from({ length: 12 }, (_, i) => i * 5).map((minutes) => (
                      <SelectItem key={minutes} value={minutes.toString()}>
                        {minutes} min{minutes !== 1 ? 's' : ''}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
        </div>

          <div className="space-y-3">
            <div className="flex items-center space-x-2">
              <Switch
                id="edit-showResults"
                checked={showResults}
                onCheckedChange={setShowResults}
              />
              <Label htmlFor="edit-showResults" className="flex items-center gap-2">
                <Eye className="h-4 w-4" />
                Show Results Immediately
              </Label>
            </div>

            <div className="flex items-center space-x-2">
              <Switch
                id="edit-assignToAll"
                checked={assignToAll}
                onCheckedChange={setAssignToAll}
              />
              <Label htmlFor="edit-assignToAll" className="flex items-center gap-2">
                <Users className="h-4 w-4" />
                Assign to all children
              </Label>
            </div>

            {!assignToAll && (
              <div>
                <Label>Select Children</Label>
                <div className="space-y-2 mt-2 max-h-32 overflow-y-auto">
                  {children.map((child) => (
                    <div key={child.id} className="flex items-center space-x-2">
                      <Checkbox
                        id={`edit-${child.id}`}
                        checked={selectedChildren.includes(child.id)}
                        onCheckedChange={(checked) => handleChildSelection(child.id, checked as boolean)}
                      />
                      <Label htmlFor={`edit-${child.id}`} className="text-sm">
                        {child.name}
                      </Label>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose}>
            Cancel
          </Button>
          <Button 
            onClick={handleUpdate} 
            disabled={!title || !startTime || !endTime || !maxAttempts || !timeLimitHours || isUpdating}
          >
            {isUpdating ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Updating...
              </>
            ) : (
              'Update Test'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};