import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { UnifiedPaperCreator } from './UnifiedPaperCreator';
import { useToast } from '@/hooks/use-toast';
import { Edit, Trash2, Users, Clock, Calendar, FileText, FilePlus, ArrowLeft, Undo2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

type ViewState = 'prepare' | 'previous' | 'edit';

export const PapersManager: React.FC = () => {
  const [refreshKey, setRefreshKey] = React.useState(0);
  const [questionPapers, setQuestionPapers] = React.useState<any[]>([]);
  const [scheduledPapers, setScheduledPapers] = React.useState<any[]>([]);
  const [editingPaper, setEditingPaper] = React.useState<any | null>(null);
  const [currentView, setCurrentView] = React.useState<ViewState>('prepare');
  const [activeTab, setActiveTab] = React.useState('prepare');
  const [deletedPapers, setDeletedPapers] = React.useState<any[]>([]);
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
      .eq('is_deleted', false)
      .order('created_at', { ascending: false });

    setQuestionPapers(papersData || []);
    
    // Separate scheduled papers
    const scheduled = papersData?.filter(p => p.start_time && p.end_time) || [];
    setScheduledPapers(scheduled);

    // Also fetch recently deleted papers for undo functionality
    const { data: deletedData } = await supabase
      .from('question_papers')
      .select(`
        *,
        subjects(name)
      `)
      .eq('user_id', user.user.id)
      .eq('is_deleted', true)
      .gte('deleted_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()) // Last 24 hours
      .order('deleted_at', { ascending: false });

    setDeletedPapers(deletedData || []);
  };

  const handleRefresh = () => setRefreshKey((k) => k + 1);

  const handleEdit = (paper: any) => {
    setEditingPaper(paper);
    setCurrentView('edit');
  };

  const handleBackToPrevious = () => {
    setCurrentView('previous');
    setEditingPaper(null);
    handleRefresh();
  };

  const handlePaperCreated = () => {
    if (currentView === 'edit') {
      // After editing, go back to previous papers
      setCurrentView('previous');
      setActiveTab('previous');
    } else {
      // After creating new paper, go to previous papers
      setActiveTab('previous');
      setCurrentView('previous');
    }
    setEditingPaper(null);
    handleRefresh();
  };

  const handleDelete = async (paperId: string, paperTitle: string) => {
    try {
      const { error } = await supabase
        .from('question_papers')
        .update({ 
          is_deleted: true,
          deleted_at: new Date().toISOString()
        })
        .eq('id', paperId);

      if (error) throw error;

      toast({
        title: "Paper deleted",
        description: `"${paperTitle}" has been deleted. You can undo this action within 24 hours.`,
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

  const handleUndoDelete = async (paperId: string, paperTitle: string) => {
    try {
      const { error } = await supabase
        .from('question_papers')
        .update({ 
          is_deleted: false,
          deleted_at: null
        })
        .eq('id', paperId);

      if (error) throw error;

      toast({
        title: "Paper restored",
        description: `"${paperTitle}" has been restored successfully.`,
      });

      handleRefresh();
    } catch (error: any) {
      toast({
        title: "Restore failed",
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

  const renderCurrentView = () => {
    if (currentView === 'edit' && editingPaper) {
      return (
        <div className="space-y-4">
          <div className="flex items-center justify-between pb-4 border-b">
            <h2 className="text-lg font-semibold">{editingPaper.title}</h2>
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={handleBackToPrevious}
              className="flex items-center gap-2"
            >
              <ArrowLeft className="h-4 w-4" />
              Back
            </Button>
          </div>
          <UnifiedPaperCreator 
            editingPaper={editingPaper} 
            onPaperCreated={handlePaperCreated}
          />
        </div>
      );
    }

    if (currentView === 'previous' || activeTab === 'previous') {
      return (
        <div className="space-y-6">
          {/* Recently Deleted Papers - Undo Section */}
          {deletedPapers.length > 0 && (
            <Card className="border-amber-200 bg-amber-50">
              <CardHeader className="pb-4">
                <CardTitle className="flex items-center gap-2 text-amber-800">
                  <Undo2 className="h-4 w-4" />
                  Recently Deleted Papers
                </CardTitle>
                <CardDescription className="text-amber-700">
                  These papers were deleted within the last 24 hours. You can restore them.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {deletedPapers.map((paper) => (
                    <div key={paper.id} className="flex items-center justify-between p-3 bg-white rounded border border-amber-200">
                      <div>
                        <h4 className="font-medium text-sm text-amber-900">{paper.title}</h4>
                        <p className="text-xs text-amber-700">
                          {paper.subjects?.name} - Class {paper.class_level} • Deleted {formatDateTime(paper.deleted_at)}
                        </p>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleUndoDelete(paper.id, paper.title)}
                        className="text-amber-800 border-amber-300 hover:bg-amber-100"
                      >
                        <Undo2 className="h-3 w-3 mr-1" />
                        Restore
                      </Button>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Previous Papers List */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Previous Papers
              </CardTitle>
              <CardDescription>
                View and manage your previously created papers
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {questionPapers.map((paper) => (
                  <div key={paper.id} className="border rounded-lg p-6 space-y-4 hover:shadow-sm transition-shadow">
                    <div className="flex items-start justify-between">
                      <div className="flex-1 min-w-0 space-y-3">
                        <div>
                          <h4 className="font-semibold text-base mb-2 truncate">{paper.title}</h4>
                          <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground mb-3">
                            <span className="font-medium">{paper.subjects?.name}</span>
                            <span>Class {paper.class_level}</span>
                            <span>{paper.total_questions} questions</span>
                            <span>{paper.time_limit_minutes || 60}m duration</span>
                            <span>Max {paper.max_attempts} attempts</span>
                          </div>
                          <div className="flex items-center gap-4 text-sm text-muted-foreground">
                            <div className="flex items-center gap-1">
                              <Users className="h-4 w-4" />
                              <span>{paper.assign_to_all ? 'All children' : 'Selected children'}</span>
                            </div>
                            <span>{paper.show_results ? 'Auto-approve results' : 'Manual approval required'}</span>
                          </div>
                        </div>
                        
                        {paper.start_time && paper.end_time && (
                          <div className="p-3 bg-muted/30 rounded-md">
                            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                              <Calendar className="h-4 w-4" />
                              <span className="font-medium">Scheduled:</span>
                              <span>{formatDateTime(paper.start_time)} - {formatDateTime(paper.end_time)}</span>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-2 pt-3 border-t">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleEdit(paper)}
                        className="flex items-center gap-2"
                      >
                        <Edit className="h-4 w-4" />
                        Edit
                      </Button>
                      
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button
                            variant="outline"
                            size="sm"
                            className="flex items-center gap-2 text-destructive hover:text-destructive"
                          >
                            <Trash2 className="h-4 w-4" />
                            Delete
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Delete Paper</AlertDialogTitle>
                            <AlertDialogDescription>
                              Are you sure you want to delete "{paper.title}"? You can undo this action within 24 hours.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction
                              onClick={() => handleDelete(paper.id, paper.title)}
                              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                            >
                              Delete
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </div>
                ))}
                {questionPapers.length === 0 && (
                  <p className="text-sm text-muted-foreground text-center py-8">
                    No papers created yet. Create your first paper in the "Prepare Paper" tab.
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      );
    }

    return <UnifiedPaperCreator onPaperCreated={handlePaperCreated} />;
  };

  return (
    <div className="space-y-6">
      {currentView === 'edit' ? (
        renderCurrentView()
      ) : (
        <Tabs value={activeTab} onValueChange={(value) => {
          setActiveTab(value);
          setCurrentView(value as ViewState);
        }} className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="prepare" className="flex items-center gap-2">
              <FilePlus className="h-4 w-4" />
              Prepare Paper
            </TabsTrigger>
            <TabsTrigger value="previous" className="flex items-center gap-2">
              <FileText className="h-4 w-4" />
              Previous Papers
            </TabsTrigger>
          </TabsList>

          <TabsContent value="prepare" className="space-y-6">
            {renderCurrentView()}
          </TabsContent>

          <TabsContent value="previous" className="space-y-6">
            {renderCurrentView()}
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
};
