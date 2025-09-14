import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Switch } from '@/components/ui/switch';
import { Calendar, Clock, Users, Loader2 } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { supabase } from '@/integrations/supabase/client';

interface TestSchedulerProps {
  onTestScheduled: () => void;
}

export const TestScheduler = ({ onTestScheduled }: TestSchedulerProps) => {
  const [selectedPaper, setSelectedPaper] = useState('');
  const [title, setTitle] = useState('');
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');
  const [maxAttempts, setMaxAttempts] = useState('1');
  const [assignToAll, setAssignToAll] = useState(true);
  const [selectedChildren, setSelectedChildren] = useState<string[]>([]);
  const [timeLimitHours, setTimeLimitHours] = useState('1');
  const [timeLimitMinutes, setTimeLimitMinutes] = useState('0');
  const [questionPapers, setQuestionPapers] = useState<any[]>([]);
  const [children, setChildren] = useState<any[]>([]);
  const [isScheduling, setIsScheduling] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    fetchQuestionPapers();
    fetchChildren();
  }, []);

  const fetchQuestionPapers = async () => {
    const { data: user } = await supabase.auth.getUser();
    if (!user.user) return;

    const { data } = await supabase
      .from('question_papers')
      .select(`
        *,
        subjects(name)
      `)
      .eq('user_id', user.user.id)
      .order('created_at', { ascending: false });

    setQuestionPapers(data || []);
  };

  const fetchChildren = async () => {
    try {
      const { data: user } = await supabase.auth.getUser();
      if (!user.user) return;

      // Get children associated with this parent
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

  const handleChildSelection = (childId: string, checked: boolean) => {
    if (checked) {
      setSelectedChildren([...selectedChildren, childId]);
    } else {
      setSelectedChildren(selectedChildren.filter(id => id !== childId));
    }
  };

  const handleSchedule = async () => {
    if (!selectedPaper || !title || !startTime || !endTime || !maxAttempts || !timeLimitHours) {
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

    if (startDate < new Date()) {
      toast({
        title: "Invalid start time",
        description: "Start time cannot be in the past.",
        variant: "destructive",
      });
      return;
    }

    setIsScheduling(true);

    try {
      const { data: user } = await supabase.auth.getUser();
      if (!user.user) throw new Error('Not authenticated');

      // Create scheduled test
      const { data: testData, error: testError } = await supabase
        .from('scheduled_tests')
        .insert({
          question_paper_id: selectedPaper,
          creator_id: user.user.id,
          title,
          start_time: startDate.toISOString(),
          end_time: endDate.toISOString(),
          max_attempts: parseInt(maxAttempts),
          assign_to_all: assignToAll,
          time_limit_hours: parseInt(timeLimitHours),
          time_limit_minutes: parseInt(timeLimitMinutes)
        })
        .select()
        .single();

      if (testError) throw testError;

      // If not assigning to all, create specific assignments
      if (!assignToAll && selectedChildren.length > 0) {
        const assignments = selectedChildren.map(childId => ({
          scheduled_test_id: testData.id,
          assigned_to_user_id: childId
        }));

        const { error: assignError } = await supabase
          .from('test_assignments')
          .insert(assignments);

        if (assignError) throw assignError;
      }

      toast({
        title: "Test scheduled successfully",
        description: `"${title}" has been scheduled for ${assignToAll ? 'all children' : `${selectedChildren.length} children`}.`,
      });

      // Reset form
      setSelectedPaper('');
      setTitle('');
      setStartTime('');
      setEndTime('');
      setMaxAttempts('1');
      setTimeLimitHours('1');
      setTimeLimitMinutes('0');
      setAssignToAll(true);
      setSelectedChildren([]);
      onTestScheduled();

    } catch (error: any) {
      toast({
        title: "Scheduling failed",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsScheduling(false);
    }
  };

  const selectedPaperData = questionPapers.find(p => p.id === selectedPaper);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Calendar className="h-5 w-5" />
          Schedule Test
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <Label htmlFor="paper">Question Paper</Label>
          <Select value={selectedPaper} onValueChange={setSelectedPaper}>
            <SelectTrigger>
              <SelectValue placeholder="Select question paper" />
            </SelectTrigger>
            <SelectContent>
              {questionPapers.map((paper) => (
                <SelectItem key={paper.id} value={paper.id}>
                  {paper.title} - {paper.subjects?.name} (Class {paper.class_level})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {selectedPaperData && (
          <div className="text-sm text-muted-foreground bg-muted p-3 rounded-md">
            <div className="flex items-center gap-2 mb-1">
              <Clock className="h-4 w-4" />
              Time: {selectedPaperData.time_limit_minutes} minutes
            </div>
            <div>Questions: {selectedPaperData.total_questions}</div>
          </div>
        )}

        <div>
          <Label htmlFor="title">Test Title</Label>
          <Input
            id="title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Enter test title"
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label htmlFor="startTime">Start Time</Label>
            <Input
              id="startTime"
              type="datetime-local"
              value={startTime}
              onChange={(e) => setStartTime(e.target.value)}
              min={new Date().toISOString().slice(0, 16)}
            />
          </div>

          <div>
            <Label htmlFor="endTime">End Time</Label>
            <Input
              id="endTime"
              type="datetime-local"
              value={endTime}
              onChange={(e) => setEndTime(e.target.value)}
              min={startTime || new Date().toISOString().slice(0, 16)}
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label htmlFor="attempts">Maximum Attempts</Label>
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
              id="assignToAll"
              checked={assignToAll}
              onCheckedChange={setAssignToAll}
            />
            <Label htmlFor="assignToAll" className="flex items-center gap-2">
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
                      id={child.id}
                      checked={selectedChildren.includes(child.id)}
                      onCheckedChange={(checked) => handleChildSelection(child.id, checked as boolean)}
                    />
                    <Label htmlFor={child.id} className="text-sm">
                      {child.name}
                    </Label>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <Button 
          onClick={handleSchedule} 
          disabled={!selectedPaper || !title || !startTime || !endTime || !maxAttempts || !timeLimitHours || isScheduling}
          className="w-full"
        >
          {isScheduling ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Scheduling...
            </>
          ) : (
            'Schedule Test'
          )}
        </Button>
      </CardContent>
    </Card>
  );
};