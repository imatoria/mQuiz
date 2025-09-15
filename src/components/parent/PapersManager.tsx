import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { UnifiedPaperCreator } from './UnifiedPaperCreator';
import { TestEditModal } from './TestEditModal';
import { useToast } from '@/hooks/use-toast';
import { Edit, Trash2, Users, Clock, Calendar, FileText } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

export const PapersManager: React.FC = () => {
  const [refreshKey, setRefreshKey] = React.useState(0);
  const [questionPapers, setQuestionPapers] = React.useState<any[]>([]);
  const [scheduledPapers, setScheduledPapers] = React.useState<any[]>([]);
  const [editingTest, setEditingTest] = React.useState<any | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = React.useState(false);
  const { toast } = useToast();

  React.useEffect(() => {
    fetchPapers();
  }, [refreshKey]);

  const fetchPapers = async () => {
    const { data: user } = await supabase.auth.getUser();
    if (!user.user) return;

    const { data: papersData } = await supabase
      .from('question_papers')
      .select(`
        *,
        subjects(name)
      `)
      .eq('user_id', user.user.id)
      .order('created_at', { ascending: false });

    setQuestionPapers(papersData || []);
    
    // Separate scheduled papers
    const scheduled = papersData?.filter(p => p.is_scheduled) || [];
    setScheduledPapers(scheduled);
  };

  const handleRefresh = () => setRefreshKey((k) => k + 1);

  const handleEdit = (test: any) => {
    setEditingTest(test);
    setIsEditModalOpen(true);
  };

  const handleDelete = async (paperId: string, paperTitle: string) => {
    try {
      // First delete paper assignments
      await supabase
        .from('paper_assignments')
        .delete()
        .eq('paper_id', paperId);

      // Then unschedule the paper (set is_scheduled to false)
      const { error } = await supabase
        .from('question_papers')
        .update({ 
          is_scheduled: false,
          start_time: null,
          end_time: null,
          max_attempts: 1,
          assign_to_all: true,
          time_limit_hours: null,
          time_limit_minutes: null
        })
        .eq('id', paperId);

      if (error) throw error;

      toast({
        title: "Test unscheduled",
        description: `"${paperTitle}" has been unscheduled successfully.`,
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

  const getTestStatus = (test: any) => {
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
      <UnifiedPaperCreator />

      <div className="grid md:grid-cols-2 gap-6">
        {/* All Question Papers */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              All Question Papers
            </CardTitle>
            <CardDescription>
              Your generated question papers
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {questionPapers.slice(0, 8).map((paper) => (
                <div key={paper.id} className="flex items-center justify-between p-3 border rounded-lg">
                  <div>
                    <p className="font-medium text-sm">{paper.title}</p>
                    <p className="text-xs text-muted-foreground">
                      {paper.subjects?.name} - Class {paper.class_level} • {paper.total_questions} questions
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant={paper.is_scheduled ? "default" : "outline"}>
                      {paper.is_scheduled ? "Scheduled" : "Draft"}
                    </Badge>
                  </div>
                </div>
              ))}
              {questionPapers.length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-4">
                  No question papers generated yet
                </p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Scheduled Tests */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Scheduled Tests
            </CardTitle>
            <CardDescription>Manage your scheduled tests</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {scheduledPapers.slice(0, 6).map((test) => {
                const status = getTestStatus(test);
                return (
                  <div key={test.id} className="border rounded-lg p-4 space-y-3">
                    <div className="flex items-start justify-between">
                      <div className="flex-1 min-w-0">
                        <h4 className="font-medium text-sm mb-1 truncate">{test.title}</h4>
                         <p className="text-xs text-muted-foreground mb-2">
                            {test.subjects?.name}
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
                            Unschedule
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Unschedule Test</AlertDialogTitle>
                            <AlertDialogDescription>
                              Are you sure you want to unschedule "{test.title}"? This will remove the test scheduling but keep the question paper.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction
                              onClick={() => handleDelete(test.id, test.title)}
                              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                            >
                              Unschedule
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </div>
                );
              })}
              {scheduledPapers.length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-8">No tests scheduled yet</p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

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
