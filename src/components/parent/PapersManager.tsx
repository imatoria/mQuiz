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
import { supabase } from '@/integrations/supabase/client';

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
      navigate('/parent/papers/prepare', { replace: true });
    }
  }, [tab, subtab, navigate]);

  const handleSubTabChange = (value: string) => {
    navigate(`/parent/papers/${value}`);
  };

  React.useEffect(() => {
    fetchPapers();
  }, [user, refreshKey]);

  const fetchPapers = async () => {
    if (!user) return;

    const { data: papersData } = await supabase
      .from('question_papers')
      .select('*')
      .eq('is_deleted', false);

    const { data: allClasses } = await supabase.from('classes').select('*');
    const { data: allSubjects } = await supabase.from('subjects').select('*');

    const classMap = new Map((allClasses || []).map((c: any) => [c.id, c.class_name]));
    const subjMap = new Map((allSubjects || []).map((s: any) => [s.id, s.subject_name]));

    const formattedPapers = (papersData || []).map((paper: any) => {
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

    // Also fetch recently deleted papers for undo functionality
    const { data: deletedData } = await supabase
      .from('question_papers')
      .select('*')
      .eq('is_deleted', true);

    const formattedDeleted = (deletedData || []).map((paper: any) => {
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
    navigate('/parent/papers/edit');
  };

  const handleBackToPrevious = () => {
    setEditingPaper(null);
    navigate('/parent/papers/previous');
    handleRefresh();
  };

  const handlePaperCreated = () => {
    setEditingPaper(null);
    navigate('/parent/papers/previous');
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

  const handlePrint = async (paper: any) => {
    try {
      // Fetch questions for this paper
      const { data: paperQuestions, error } = await supabase
        .from('question_paper_questions')
        .select(`
          question_order,
          questions (
            question_text,
            option_a,
            option_b,
            option_c,
            option_d,
            correct_answer,
            difficulty,
            topic
          )
        `)
        .eq('question_paper_id', paper.id)
        .order('question_order');

      if (error) throw error;

      // Create print window content
      const printWindow = window.open('', '_blank');
      if (!printWindow) {
        toast({
          title: "Print blocked",
          description: "Please allow pop-ups to print the paper.",
          variant: "destructive",
        });
        return;
      }

      const printContent = `
        <!DOCTYPE html>
        <html>
        <head>
          <title>${paper.title}</title>
          <style>
            body {
              font-family: Arial, sans-serif;
              padding: 40px;
              max-width: 800px;
              margin: 0 auto;
            }
            .header {
              text-align: center;
              margin-bottom: 30px;
              border-bottom: 2px solid #333;
              padding-bottom: 20px;
            }
            .title {
              font-size: 24px;
              font-weight: bold;
              margin-bottom: 10px;
            }
            .info {
              font-size: 14px;
              color: #666;
              margin: 5px 0;
            }
            .question {
              margin-bottom: 25px;
              page-break-inside: avoid;
            }
            .question-text {
              margin-bottom: 12px;
              line-height: 1.6;
            }
            .question-number {
              font-weight: bold;
              margin-right: 8px;
              display: inline;
            }
            .options {
              display: grid;
              grid-template-columns: 1fr 1fr;
              gap: 10px 20px;
              margin-top: 10px;
            }
            .option {
              padding: 8px 12px;
              border: 1px solid #ddd;
              border-radius: 4px;
              line-height: 1.5;
            }
            @media print {
              body {
                padding: 20px;
              }
              .question {
                page-break-inside: avoid;
              }
            }
          </style>
        </head>
        <body>
          <div class="header">
            <div class="title">${paper.title}</div>
            <div class="info">Subject: ${paper.subjects?.subject_name || 'N/A'} | Class: ${paper.classes?.class_name || 'N/A'}</div>
            <div class="info">Total Questions: ${paper.total_questions} | Duration: ${paper.time_limit_minutes} minutes</div>
          </div>
          
          ${paperQuestions?.map((pq: any, index: number) => {
            const q = pq.questions;
            return `
              <div class="question">
                <div class="question-text">
                  <span class="question-number">Q${index + 1}.</span>
                  ${q.question_text}
                </div>
                <div class="options">
                  <div class="option">A) ${q.option_a}</div>
                  <div class="option">B) ${q.option_b}</div>
                  <div class="option">C) ${q.option_c}</div>
                  <div class="option">D) ${q.option_d}</div>
                </div>
              </div>
            `;
          }).join('') || '<p>No questions found</p>'}
        </body>
        </html>
      `;

      printWindow.document.write(printContent);
      printWindow.document.close();
      
      // Wait for content to load then print
      printWindow.onload = () => {
        printWindow.print();
      };
    } catch (error: any) {
      toast({
        title: "Print failed",
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
                          {paper.subjects?.subject_name || 'Unknown'} - {paper.classes?.class_name || 'Unknown'} • Deleted {formatDateTime(paper.deleted_at)}
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
                            <span className="font-medium">{paper.subjects?.subject_name || 'Unknown'}</span>
                            <span>{paper.classes?.class_name || 'Unknown'}</span>
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
                      
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handlePrint(paper)}
                        className="flex items-center gap-2"
                      >
                        <Printer className="h-4 w-4" />
                        Print
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
        <Tabs value={activeTab} onValueChange={handleSubTabChange} className="w-full">
          <TabsList className="w-full">
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
