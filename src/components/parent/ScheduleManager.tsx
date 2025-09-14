import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { supabase } from '@/integrations/supabase/client';
import { TestScheduler } from './TestScheduler';
import { TestEditModal } from './TestEditModal';
import { useToast } from '@/components/ui/use-toast';
import { Edit, Trash2, Users, Clock, Calendar } from 'lucide-react';

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

export const ScheduleManager = () => {
  const [scheduledTests, setScheduledTests] = useState<ScheduledTest[]>([]);
  const [refreshKey, setRefreshKey] = useState(0);
  const [editingTest, setEditingTest] = useState<ScheduledTest | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    fetchScheduledTests();
  }, [refreshKey]);

  const fetchScheduledTests = async () => {
    const { data: user } = await supabase.auth.getUser();
    if (!user.user) return;

    const { data: testsData } = await supabase
      .from('scheduled_tests')
      .select(`
        *,
        question_papers(
          title, 
          total_questions, 
          time_limit_minutes,
          subjects(name)
        )
      `)
      .eq('creator_id', user.user.id)
      .order('created_at', { ascending: false });

    setScheduledTests(testsData || []);
  };

  const handleRefresh = () => setRefreshKey((k) => k + 1);

  const handleEdit = (test: ScheduledTest) => {
    setEditingTest(test);
    setIsEditModalOpen(true);
  };

  const handleDelete = async (testId: string, testTitle: string) => {
    try {
      // First delete test assignments
      await supabase
        .from('test_assignments')
        .delete()
        .eq('scheduled_test_id', testId);

      // Then delete the test
      const { error } = await supabase
        .from('scheduled_tests')
        .delete()
        .eq('id', testId);

      if (error) throw error;

      toast({
        title: "Test deleted",
        description: `"${testTitle}" has been deleted successfully.`,
      });

      handleRefresh();
    } catch (error: any) {
      toast({
        title: "Delete failed",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const getTestStatus = (test: ScheduledTest) => {
    const now = new Date();
    const startTime = new Date(test.start_time);
    const endTime = new Date(test.end_time);

    if (endTime < now) return { label: 'Completed', variant: 'secondary' as const };
    if (startTime > now) return { label: 'Scheduled', variant: 'outline' as const };
    return { label: 'Active', variant: 'default' as const };
  };

  const formatDateTime = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div className="grid md:grid-cols-2 gap-6">
      <TestScheduler onTestScheduled={handleRefresh} />

      <Card>
        <CardHeader>
          <CardTitle>Scheduled Tests</CardTitle>
          <CardDescription>Manage your upcoming and past tests</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {scheduledTests.slice(0, 10).map((test) => {
              const status = getTestStatus(test);
              return (
                <div key={test.id} className="border rounded-lg p-4 space-y-3">
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      <h4 className="font-medium text-sm mb-1 truncate">{test.title}</h4>
                       <p className="text-xs text-muted-foreground mb-2">
                         {test.question_papers?.subjects?.name} • {test.question_papers?.title}
                         {test.show_results ? ' • Auto-approve results' : ' • Manual approval required'}
                       </p>
                      
                      <div className="grid grid-cols-1 gap-1 text-xs text-muted-foreground">
                        <div className="flex items-center gap-2">
                          <Calendar className="h-3 w-3" />
                          <span>{formatDateTime(test.start_time)} - {formatDateTime(test.end_time)}</span>
                        </div>
                        <div className="flex items-center gap-4">
                          <div className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            <span>
                              {test.time_limit_hours || 1}h {test.time_limit_minutes || 0}m duration
                            </span>
                          </div>
                          <div className="flex items-center gap-1">
                            <Users className="h-3 w-3" />
                            <span>{test.assign_to_all ? 'All children' : 'Selected children'}</span>
                          </div>
                          <span>Max: {test.max_attempts} attempts</span>
                        </div>
                      </div>
                    </div>
                    
                    <Badge variant={status.variant} className="ml-2 shrink-0">
                      {status.label}
                    </Badge>
                  </div>

                  <div className="flex items-center gap-2 pt-2 border-t">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleEdit(test)}
                      className="flex items-center gap-1"
                    >
                      <Edit className="h-3 w-3" />
                      Edit
                    </Button>
                    
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button
                          variant="outline"
                          size="sm"
                          className="flex items-center gap-1 text-destructive hover:text-destructive"
                        >
                          <Trash2 className="h-3 w-3" />
                          Delete
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Delete Test</AlertDialogTitle>
                          <AlertDialogDescription>
                            Are you sure you want to delete "{test.title}"? This action cannot be undone and will remove all associated test assignments.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction
                            onClick={() => handleDelete(test.id, test.title)}
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                          >
                            Delete
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </div>
              );
            })}
            {scheduledTests.length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-8">No tests scheduled yet</p>
            )}
          </div>
        </CardContent>
      </Card>

      <TestEditModal
        test={editingTest}
        isOpen={isEditModalOpen}
        onClose={() => {
          setIsEditModalOpen(false);
          setEditingTest(null);
        }}
        onTestUpdated={handleRefresh}
      />
    </div>
  );
};
