import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { dbService } from '@/services/db';
import { authService } from '@/services/auth/authService';

import { useToast } from '@/components/ui/use-toast';
import { Edit, Trash2, Users, Clock, Calendar } from 'lucide-react';

interface ScheduledTest {
  id: string;
  title: string;
  start_time: string;
  end_time: string;
  max_attempts: number;
  assign_to_all: boolean;
  time_limit_hours?: number;
  time_limit_minutes?: number;
  show_results?: boolean;
  total_questions: number;
  subjects?: { subject_name: string };
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
    const user = authService.getCurrentUser();
    if (!user) return;

    const { data: testsData } = await dbService.getProvider().query(`
      SELECT 
        qp.*,
        s.subject_name
      FROM question_papers qp
      LEFT JOIN subjects s ON qp.subject_id = s.id
      WHERE qp.user_id = ? 
        AND qp.start_time IS NOT NULL 
        AND qp.end_time IS NOT NULL
      ORDER BY qp.created_at DESC
    `, [user.id]);

    const formattedData = (testsData || []).map((test: any) => ({
      ...test,
      subjects: { subject_name: test.subject_name }
    }));

    setScheduledTests(formattedData);
  };

  const handleRefresh = () => setRefreshKey((k) => k + 1);

  const handleEdit = (test: ScheduledTest) => {
    setEditingTest(test);
    setIsEditModalOpen(true);
  };

  const handleDelete = async (testId: string, testTitle: string) => {
    try {
      // First delete paper assignments
      await dbService.getProvider().execute(
        'DELETE FROM paper_assignments WHERE paper_id = ?',
        [testId]
      );

      // Then unschedule the paper (remove scheduling)
      const { error } = await dbService.getProvider().execute(
        'UPDATE question_papers SET start_time = NULL, end_time = NULL, max_attempts = 1, assign_to_all = 1 WHERE id = ?',
        [testId]
      );

      if (error) throw error;

      toast({
        title: "Test deleted",
        description: `"${testTitle}" has been deleted successfully.`,
      });

      handleRefresh();
    } catch (error: any) {
      console.error('Error:', error);
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
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Scheduled Papers</CardTitle>
          <CardDescription>Manage your scheduled question papers</CardDescription>
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
                          {test.subjects?.subject_name}
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
    </div>
  );
};
