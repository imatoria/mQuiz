import React, { useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { UnifiedPaperCreator } from './UnifiedPaperCreator';
import { useToast } from '@/hooks/use-toast';
import { Edit, Trash2, Users, Clock, Calendar, FileText, FilePlus, ArrowLeft, Undo2, Printer } from 'lucide-react';
import { dbService } from '@/services/db';
import { useAuth } from '@/hooks/useAuth';

type ViewState = 'prepare' | 'previous' | 'edit';

export const PapersManager: React.FC = () => {
  const { user } = useAuth();
  const { tab, subtab } = useParams();
  const navigate = useNavigate();
  const [refreshKey, setRefreshKey] = React.useState(0);
  const [questionPapers, setQuestionPapers] = React.useState<any[]>([]);
  const [scheduledPapers, setScheduledPapers] = React.useState<any[]>([]);
  const [editingPaper, setEditingPaper] = React.useState<any | null>(null);
  const [deletedPapers, setDeletedPapers] = React.useState<any[]>([]);
  const { toast } = useToast();

  // Read subtab from URL or default to 'prepare'
  const activeTab = subtab || 'prepare';
  const currentView: ViewState = subtab === 'edit' ? 'edit' : (activeTab as ViewState);

  // Redirect to default subtab if not set
  useEffect(() => {
    if (tab === 'papers' && !subtab) {
      navigate('/teacher/papers/prepare', { replace: true });
    }
  }, [tab, subtab, navigate]);

  const handleSubTabChange = (value: string) => {
    navigate(`/teacher/papers/${value}`);
  };

  React.useEffect(() => {
    fetchPapers();
  }, [user, refreshKey]);

  const fetchPapers = async () => {
    if (!user) return;

    // Fetch teacher's profile ID to match user_id or teacher profile id
    const { data: profiles } = await dbService.getProvider().query(
      'SELECT id, user_id FROM profiles WHERE user_id = ? OR id = ?',
      [user.id, user.id]
    );

    const teacherUserIds = new Set<string>();
    if (user.id) teacherUserIds.add(user.id);
    (profiles || []).forEach((p: any) => {
      if (p.id) teacherUserIds.add(p.id);
      if (p.user_id) teacherUserIds.add(p.user_id);
    });

    const { data: allPapersData } = await dbService.getProvider().query('SELECT * FROM question_papers');
    const { data: allClasses } = await dbService.getProvider().query('SELECT * FROM classes');
    const { data: allSubjects } = await dbService.getProvider().query('SELECT * FROM subjects');

    const classMap = new Map((allClasses || []).map((c: any) => [c.id, c.class_name]));
    const subjMap = new Map((allSubjects || []).map((s: any) => [s.id, s.subject_name]));

    // Filter active papers created by this teacher
    const teacherActivePapers = (allPapersData || []).filter((paper: any) => {
      const isOwner = teacherUserIds.has(paper.user_id) || !paper.user_id;
      const isNotDeleted = !paper.is_deleted || paper.is_deleted === 0 || paper.is_deleted === false || paper.is_deleted === '0';
      return isOwner && isNotDeleted;
    });

    const formattedPapers = teacherActivePapers.map((paper: any) => {
      const className = paper.class_id ? classMap.get(paper.class_id) || 'Class 10' : 'Class 10';
      const subjName = paper.subject_id ? subjMap.get(paper.subject_id) || 'General' : 'General';
      return {
        ...paper,
        subjects: { subject_name: subjName },
        classes: { class_name: className }
      };
    });

    setQuestionPapers(formattedPapers);
    
    // Separate scheduled papers
    const scheduled = formattedPapers.filter((p: any) => p.start_time && p.end_time);
    setScheduledPapers(scheduled);

    // Filter recently deleted papers created by this teacher
    const teacherDeletedPapers = (allPapersData || []).filter((paper: any) => {
      const isOwner = teacherUserIds.has(paper.user_id) || !paper.user_id;
      const isDeleted = paper.is_deleted === 1 || paper.is_deleted === true || paper.is_deleted === '1';
      return isOwner && isDeleted;
    });

    const formattedDeleted = teacherDeletedPapers.map((paper: any) => {
      const className = paper.class_id ? classMap.get(paper.class_id) || 'Class 10' : 'Class 10';
      const subjName = paper.subject_id ? subjMap.get(paper.subject_id) || 'General' : 'General';
      return {
        ...paper,
        subjects: { subject_name: subjName },
        classes: { class_name: className }
      };
    });

    setDeletedPapers(formattedDeleted);
  };

  const handleRefresh = () => setRefreshKey((k) => k + 1);

  const handleEdit = (paper: any) => {
    setEditingPaper(paper);
    navigate('/teacher/papers/edit');
  };

  const handleBackToPrevious = () => {
    setEditingPaper(null);
    navigate('/teacher/papers/previous');
    handleRefresh();
  };

  const handlePaperCreated = () => {
    setEditingPaper(null);
    navigate('/teacher/papers/previous');
    handleRefresh();
  };

  const handleDelete = async (paperId: string, paperTitle: string) => {
    try {
      const { error } = await dbService.getProvider().execute(
        'UPDATE question_papers SET is_deleted = 1, deleted_at = ? WHERE id = ?',
        [new Date().toISOString(), paperId]
      );

      if (error) throw error;

      toast({
        title: "Paper deleted",
        description: `"${paperTitle}" has been deleted. You can undo this action within 24 hours.`,
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

  const handleUndoDelete = async (paperId: string, paperTitle: string) => {
    try {
      const { error } = await dbService.getProvider().execute(
        'UPDATE question_papers SET is_deleted = 0, deleted_at = NULL WHERE id = ?',
        [paperId]
      );

      if (error) throw error;

      toast({
        title: "Paper restored",
        description: `"${paperTitle}" has been restored successfully.`,
      });

      handleRefresh();
    } catch (error: any) {
      console.error('Error:', error);
      toast({
        title: "Restore failed",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const formatScheduleTime = (startTime: string, endTime: string) => {
    if (!startTime || !endTime) return 'Not scheduled';
    try {
      const start = new Date(startTime);
      const end = new Date(endTime);
      return `${start.toLocaleDateString()} ${start.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} - ${end.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
    } catch (e) {
      return 'Invalid date';
    }
  };

  const isPaperActive = (startTime: string, endTime: string) => {
    if (!startTime || !endTime) return false;
    const now = new Date();
    const start = new Date(startTime);
    const end = new Date(endTime);
    return now >= start && now <= end;
  };

  const isPaperUpcoming = (startTime: string) => {
    if (!startTime) return false;
    const now = new Date();
    const start = new Date(startTime);
    return start > now;
  };

  const isPaperCompleted = (endTime: string) => {
    if (!endTime) return false;
    const now = new Date();
    const end = new Date(endTime);
    return now > end;
  };

  return (
    <div className="space-y-6">
      {/* Header with Navigation */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b pb-4">
        <div>
          <h2 className="text-2xl md:text-3xl font-bold text-foreground">Question Papers</h2>
          <p className="text-sm md:text-base text-muted-foreground mt-1">
            {currentView === 'prepare' && "Create and configure new question papers for your classes."}
            {currentView === 'previous' && "View and manage your previously created question papers."}
            {currentView === 'edit' && "Edit and update your existing question paper configuration."}
          </p>
        </div>
        <div className="flex items-center space-x-2">
          {currentView === 'edit' ? (
            <Button
              variant="outline"
              onClick={handleBackToPrevious}
              className="flex items-center gap-2"
            >
              <ArrowLeft className="w-4 h-4" />
              Back to Previous Papers
            </Button>
          ) : (
            <Tabs value={activeTab} onValueChange={handleSubTabChange} className="w-auto">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="prepare" className="flex items-center gap-2">
                  <FilePlus className="w-4 h-4" />
                  Prepare Paper
                </TabsTrigger>
                <TabsTrigger value="previous" className="flex items-center gap-2">
                  <FileText className="w-4 h-4" />
                  Previous Papers ({questionPapers.length})
                </TabsTrigger>
              </TabsList>
            </Tabs>
          )}
        </div>
      </div>

      {/* View Content */}
      {currentView === 'prepare' && (
        <UnifiedPaperCreator onPaperCreated={handlePaperCreated} />
      )}

      {currentView === 'edit' && editingPaper && (
        <UnifiedPaperCreator
          editingPaper={editingPaper}
          onPaperCreated={handlePaperCreated}
        />
      )}

      {currentView === 'previous' && (
        <div className="space-y-6">
          {/* Main Papers List */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span>All Question Papers</span>
                <Badge variant="outline">{questionPapers.length} Papers</Badge>
              </CardTitle>
              <CardDescription>
                Manage your created question papers, edit configurations, or print papers.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {questionPapers.length === 0 ? (
                <div className="text-center py-8">
                  <FileText className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-foreground mb-2">No Question Papers Found</h3>
                  <p className="text-muted-foreground mb-4">
                    You haven't created any question papers yet. Click "Prepare Paper" to create your first paper.
                  </p>
                  <Button onClick={() => handleSubTabChange('prepare')}>
                    <FilePlus className="w-4 h-4 mr-2" />
                    Prepare First Paper
                  </Button>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {questionPapers.map((paper) => (
                    <Card key={paper.id} className="flex flex-col justify-between">
                      <CardHeader className="pb-3">
                        <div className="flex items-start justify-between">
                          <div>
                            <CardTitle className="text-lg font-semibold">{paper.title}</CardTitle>
                            <CardDescription className="mt-1">
                              {paper.subjects?.subject_name} • {paper.classes?.class_name}
                            </CardDescription>
                          </div>
                          {paper.start_time && paper.end_time && (
                            <Badge
                              variant={
                                isPaperActive(paper.start_time, paper.end_time)
                                  ? "default"
                                  : isPaperUpcoming(paper.start_time)
                                  ? "secondary"
                                  : "outline"
                              }
                            >
                              {isPaperActive(paper.start_time, paper.end_time)
                                ? "Active"
                                : isPaperUpcoming(paper.start_time)
                                ? "Upcoming"
                                : "Completed"}
                            </Badge>
                          )}
                        </div>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <div className="grid grid-cols-2 gap-2 text-sm text-muted-foreground">
                          <div className="flex items-center">
                            <FileText className="w-4 h-4 mr-1" />
                            {paper.total_questions || 0} Questions
                          </div>
                          <div className="flex items-center">
                            <Clock className="w-4 h-4 mr-1" />
                            {paper.time_limit_minutes || 60} mins
                          </div>
                        </div>

                        {paper.start_time && paper.end_time && (
                          <div className="text-xs text-muted-foreground flex items-center bg-muted p-2 rounded">
                            <Calendar className="w-3.5 h-3.5 mr-1 flex-shrink-0" />
                            <span className="truncate">{formatScheduleTime(paper.start_time, paper.end_time)}</span>
                          </div>
                        )}

                        <div className="flex items-center justify-between pt-2 border-t">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleEdit(paper)}
                          >
                            <Edit className="w-4 h-4 mr-1" />
                            Edit
                          </Button>
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button variant="ghost" size="sm" className="text-destructive hover:text-destructive">
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Delete Question Paper?</AlertDialogTitle>
                                <AlertDialogDescription>
                                  Are you sure you want to delete "{paper.title}"? This paper will be moved to recently deleted and can be restored within 24 hours.
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
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Recently Deleted Papers Section */}
          {deletedPapers.length > 0 && (
            <Card className="border-amber-200 bg-amber-50/50">
              <CardHeader>
                <CardTitle className="text-lg flex items-center text-amber-900">
                  <Undo2 className="w-5 h-5 mr-2" />
                  Recently Deleted Papers ({deletedPapers.length})
                </CardTitle>
                <CardDescription className="text-amber-800">
                  Papers deleted within the last 24 hours. You can restore them before they are permanently removed.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {deletedPapers.map((paper) => (
                    <div
                      key={paper.id}
                      className="flex items-center justify-between p-3 bg-background rounded-lg border border-amber-200"
                    >
                      <div>
                        <p className="font-medium text-foreground">{paper.title}</p>
                        <p className="text-xs text-muted-foreground">
                          {paper.subjects?.subject_name} • {paper.classes?.class_name} • Deleted
                        </p>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleUndoDelete(paper.id, paper.title)}
                        className="flex items-center gap-1"
                      >
                        <Undo2 className="w-3.5 h-3.5" />
                        Restore
                      </Button>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      )}
    </div>
  );
};
