import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Switch } from '@/components/ui/switch';
import { dbService } from '@/services/db';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';
import { recheckQuestionWithAI, generateExplanationWithAI } from '@/services/ai/aiService';
import { 
  Eye, 
  EyeOff,
  Clock, 
  AlertCircle,
  MessageSquare,
  User,
  Calendar,
  ArrowLeft,
  CheckCircle2,
  XCircle,
  Sparkles,
  Loader2,
  RefreshCw,
  CheckCircle
} from 'lucide-react';

interface TestResult {
  id: string;
  score: number;
  total_questions: number;
  completed_at: string;
  show_results: boolean;
  feedback?: string;
  student: {
    id: string;
    full_name: string;
    email: string;
  };
  test: {
    title: string;
    subject: string;
    question_paper_id: string;
  };
  answers: Record<string, string>;
}

interface QuestionResult {
  question_id: string;
  question_text: string;
  option_a: string;
  option_b: string;
  option_c: string;
  option_d: string;
  correct_answer: string;
  user_answer: string;
  is_correct: boolean;
}

export const ResultApproval = () => {
  const [results, setResults] = useState<TestResult[]>([]);
  const [selectedResult, setSelectedResult] = useState<TestResult | null>(null);
  const [questionResults, setQuestionResults] = useState<QuestionResult[]>([]);
  const [viewMode, setViewMode] = useState<'list' | 'detail'>('list');
  const [loading, setLoading] = useState(true);
  const [loadingQuestions, setLoadingQuestions] = useState(false);
  const [processing, setProcessing] = useState(false);
  const { user, profile } = useAuth();
  const { toast } = useToast();

  // Selection & Action States for Recheck and Explanation
  const [selectedQuestionIds, setSelectedQuestionIds] = useState<Set<string>>(new Set());
  const [recheckResults, setRecheckResults] = useState<Record<string, { status: 'verified' | 'flagged'; reason: string; isChanged: boolean }>>({});
  const [explanations, setExplanations] = useState<Record<string, string>>({});

  const [isRechecking, setIsRechecking] = useState(false);
  const [isGeneratingExplanation, setIsGeneratingExplanation] = useState(false);
  const [showOptions, setShowOptions] = useState(false);

  useEffect(() => {
    if (user?.id) {
      loadResults();
    }
  }, [user]);

  const loadResults = async () => {
    try {
      setLoading(true);

      // Get students of the current teacher
      const { data: students, error: studentsError } = await dbService.getProvider().query(
        'SELECT student_id FROM teacher_student_relationships WHERE teacher_id = ?',
        [user?.id]
      );

      if (studentsError) throw studentsError;

      const studentIds = students?.map(c => c.student_id) || [];

      if (studentIds.length === 0) {
        setResults([]);
        setLoading(false);
        return;
      }

      // Get all tests created by this teacher
      const { data: teacherTests, error: testsError } = await dbService.getProvider().query(
        'SELECT id FROM question_papers WHERE user_id = ?',
        [user?.id]
      );

      if (testsError) throw testsError;

      const testIds = teacherTests?.map(t => t.id) || [];

      // Get test attempts for all students
      const { data: attemptsData, error: attemptsError } = await dbService.getProvider().query('SELECT * FROM paper_attempts');

      if (attemptsError) throw attemptsError;

      const { data: papersData } = await dbService.getProvider().query('SELECT * FROM question_papers');
      const { data: subjectsData } = await dbService.getProvider().query('SELECT * FROM subjects');
      const { data: profilesData } = await dbService.getProvider().query('SELECT * FROM profiles');

      const paperMap = new Map((papersData || []).map((p: any) => [p.id, p]));
      const subjMap = new Map((subjectsData || []).map((s: any) => [s.id, s.subject_name]));
      const profileMap = new Map((profilesData || []).map((pr: any) => [pr.user_id || pr.id, pr]));

      const formatted: TestResult[] = (attemptsData || []).map((attempt: any) => {
        const paper = paperMap.get(attempt.paper_id) || {};
        const subjName = paper.subject_id ? subjMap.get(paper.subject_id) || 'General' : 'General';
        const prof = profileMap.get(attempt.user_id) || {};

        return {
          id: attempt.id,
          score: attempt.score || 0,
          total_questions: attempt.total_questions || 0,
          completed_at: attempt.completed_at || attempt.started_at || new Date().toISOString(),
          show_results: attempt.show_results || false,
          feedback: attempt.feedback,
          answers: typeof attempt.answers === 'string' ? JSON.parse(attempt.answers || '{}') : (attempt.answers || {}),
          student: {
            id: attempt.user_id,
            full_name: prof.full_name || 'User',
            email: prof.email || ''
          },
          test: {
            title: paper.title || 'Question Paper',
            subject: subjName,
            question_paper_id: attempt.paper_id || ''
          }
        };
      });

      setResults(formatted);

    } catch (error) {
      console.error('Error loading results:', error);
      toast({
        title: "Error",
        description: "Failed to load results",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleShowResultsToggle = async (resultId: string, showResults: boolean) => {
    try {
      setProcessing(true);

      const { data: attempt, error: attemptError } = await dbService.getProvider().query(
        'SELECT * FROM paper_attempts WHERE id = ? LIMIT 1',
        [resultId]
      );
      const attemptRow = attempt?.[0];

      if (attemptError || !attemptRow) {
        throw new Error('Paper attempt not found');
      }

      const { error } = await dbService.getProvider().execute(
        'UPDATE paper_attempts SET show_results = ? WHERE id = ?',
        [showResults ? 1 : 0, resultId]
      );

      if (error) throw error;

      toast({
        title: "Success",
        description: `Results ${showResults ? 'shown' : 'hidden'} successfully`,
        variant: "default"
      });

      // Update local state for both main list and selected detail view
      setResults(prevResults => 
        prevResults.map(result => 
          result.id === resultId 
            ? { ...result, show_results: showResults }
            : result
        )
      );

      setSelectedResult(prevSelected => 
        prevSelected && prevSelected.id === resultId 
          ? { ...prevSelected, show_results: showResults } 
          : prevSelected
      );

    } catch (error) {
      console.error('Error updating show results status:', error);
      toast({
        title: "Error",
        description: "Failed to update show results status",
        variant: "destructive"
      });
    } finally {
      setProcessing(false);
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 90) return 'text-green-600';
    if (score >= 70) return 'text-blue-600';
    if (score >= 50) return 'text-yellow-600';
    return 'text-red-600';
  };

  const handleViewResult = (result: TestResult) => {
    setSelectedResult(result);
    setViewMode('detail');
    loadQuestionBreakdown(result);
  };

  const handleBackToList = () => {
    setSelectedResult(null);
    setViewMode('list');
    setQuestionResults([]);
  };

  const loadQuestionBreakdown = async (result: TestResult) => {
    if (!result.test.question_paper_id) {
      toast({
        title: "Error",
        description: "Question paper not found for this test",
        variant: "destructive"
      });
      return;
    }

    try {
      setLoadingQuestions(true);

      // Get all questions for this test
      const { data: qpqData, error: qpqError } = await dbService.getProvider().query(
        'SELECT * FROM question_paper_questions WHERE question_paper_id = ?',
        [result.test.question_paper_id]
      );

      if (qpqError) throw qpqError;

      const questionIds = (qpqData || []).map((item: any) => item.question_id || item.questions?.id).filter(Boolean);

      if (questionIds.length === 0) {
        toast({
          title: "Notice",
          description: "No questions mapped to this test paper",
        });
        setQuestionResults([]);
        return;
      }

      let allQuestions = [];
      const placeholders = questionIds.map(() => '?').join(',');
      const { data: questionsData } = await dbService.getProvider().query(
        `SELECT * FROM questions WHERE id IN (${placeholders})`,
        questionIds
      );
      allQuestions = questionsData || [];

      const qMap = new Map((allQuestions || []).map((q: any) => [q.id, q]));

      // Parse answers - handle both string and object formats
      let parsedAnswers = result.answers || {};
      if (typeof result.answers === 'string') {
        try {
          parsedAnswers = JSON.parse(result.answers);
        } catch (e) {
          console.warn('Failed to parse answers as JSON, using as-is');
        }
      }

      const userAnswersMap = parsedAnswers.userAnswers || parsedAnswers || {};

      const questionResults: QuestionResult[] = questionIds.map((qId: string) => {
        const question = qMap.get(qId) || {};
        const qIdKey = question.id || qId;
        const userAnswer = userAnswersMap[qIdKey] || userAnswersMap[qId] || '';
        
        let opts: any[] = [];
        try {
          opts = typeof question.options === 'string' ? JSON.parse(question.options || '[]') : (question.options || []);
        } catch {
          opts = [];
        }

        const optionA = question.option_a || opts[0] || '';
        const optionB = question.option_b || opts[1] || '';
        const optionC = question.option_c || opts[2] || '';
        const optionD = question.option_d || opts[3] || '';
        const correctAnswer = (question.correct_answer || 'a').toLowerCase();
        const isCorrect = Boolean(userAnswer && userAnswer.toString().trim().toLowerCase() === correctAnswer);

        return {
          question_id: qIdKey,
          question_text: question.question_text || 'Question Text',
          option_a: optionA,
          option_b: optionB,
          option_c: optionC,
          option_d: optionD,
          correct_answer: correctAnswer,
          user_answer: userAnswer || '',
          is_correct: isCorrect
        };
      });

      setQuestionResults(questionResults);
      setSelectedQuestionIds(new Set());
      setRecheckResults({});
      setExplanations({});

    } catch (error) {
      console.error('Error loading question breakdown:', error);
      toast({
        title: "Error",
        description: "Failed to load question details",
        variant: "destructive"
      });
    } finally {
      setLoadingQuestions(false);
    }
  };

  const isAllSelected = questionResults.length > 0 && selectedQuestionIds.size === questionResults.length;

  const handleToggleSelectAll = () => {
    if (isAllSelected) {
      setSelectedQuestionIds(new Set());
    } else {
      setSelectedQuestionIds(new Set(questionResults.map(q => q.question_id)));
    }
  };

  const handleToggleSelectQuestion = (qId: string) => {
    setSelectedQuestionIds(prev => {
      const next = new Set(prev);
      if (next.has(qId)) {
        next.delete(qId);
      } else {
        next.add(qId);
      }
      return next;
    });
  };

  const handleRecheckSelected = async () => {
    if (selectedQuestionIds.size === 0) return;
    setIsRechecking(true);

    try {
      const newRecheckResults: Record<string, { status: 'verified' | 'flagged'; reason: string; isChanged: boolean }> = { ...recheckResults };
      let updateCount = 0;
      let changedCount = 0;

      for (const q of questionResults) {
        if (selectedQuestionIds.has(q.question_id)) {
          // Send ONLY Question Text & Options Text to AI without revealing correct_answer to eliminate bias
          const aiResult = await recheckQuestionWithAI(
            q.question_text,
            {
              option_a: q.option_a,
              option_b: q.option_b,
              option_c: q.option_c,
              option_d: q.option_d
            }
          );

          const aiOption = aiResult.correct_option.toLowerCase();
          const existingOption = (q.correct_answer || '').toLowerCase();
          const isChanged = aiOption !== existingOption;

          // If AI determined a new/different answer, update database
          if (isChanged) {
            await dbService.getProvider().execute(
              'UPDATE questions SET correct_answer = ? WHERE id = ?',
              [aiOption, q.question_id]
            );
            q.correct_answer = aiOption;
            changedCount++;
          }

          newRecheckResults[q.question_id] = {
            status: 'verified',
            reason: `AI Verified: Option ${aiOption.toUpperCase()} (${aiResult.reasoning})`,
            isChanged: true
          };
          updateCount++;
        }
      }

      setRecheckResults(newRecheckResults);

      toast({
        title: "AI Re-check Completed",
        description: `AI rechecked ${updateCount} question(s). ${changedCount > 0 ? `Updated ${changedCount} answer key(s) in DB.` : 'All answer keys verified.'}`,
      });
    } catch (error) {
      console.error('AI Recheck error:', error);
      toast({
        title: "Recheck Failed",
        description: "An error occurred while rechecking questions with AI.",
        variant: "destructive"
      });
    } finally {
      setIsRechecking(false);
    }
  };

  const handleGenerateExplanations = async () => {
    if (selectedQuestionIds.size === 0) return;
    setIsGeneratingExplanation(true);

    try {
      const newExplanations: Record<string, string> = { ...explanations };

      for (const q of questionResults) {
        if (selectedQuestionIds.has(q.question_id)) {
          // Request AI explanation with step-by-step reasoning & shortcut trick
          const aiResult = await generateExplanationWithAI(
            q.question_text,
            {
              option_a: q.option_a,
              option_b: q.option_b,
              option_c: q.option_c,
              option_d: q.option_d
            },
            q.correct_answer
          );

          newExplanations[q.question_id] = aiResult.explanation;
        }
      }

      setExplanations(newExplanations);

      toast({
        title: "AI Explanations Generated",
        description: `Generated step-by-step reasoning and shortcut tricks for ${selectedQuestionIds.size} selected question(s).`,
      });
    } catch (error) {
      console.error('Explanation error:', error);
      toast({
        title: "Explanation Failed",
        description: "An error occurred while generating AI explanations.",
        variant: "destructive"
      });
    } finally {
      setIsGeneratingExplanation(false);
    }
  };

  // Show loading state while profile is being fetched
  if (loading) {
    return (
      <div className="space-y-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-muted rounded w-1/3"></div>
          <div className="h-64 bg-muted rounded"></div>
        </div>
      </div>
    );
  }

  // Only check access after loading is complete
  if (profile?.role !== 'teacher') {
    return (
      <Card>
        <CardContent className="pt-6 text-center">
          <AlertCircle className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-semibold mb-2">Access Denied</h3>
          <p className="text-muted-foreground">
            Result approval is only available for teachers.
          </p>
        </CardContent>
      </Card>
    );
  }

  if (viewMode === 'detail' && selectedResult) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold">
              {selectedResult.test.title} - {selectedResult.student.full_name}
            </h2>
            <p className="text-muted-foreground">Test result details</p>
          </div>
          <Button variant="outline" onClick={handleBackToList}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back
          </Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <Card>
            <CardHeader>
              <CardTitle>Student Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Name:</span>
                <span>{selectedResult.student.full_name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Email:</span>
                <span>{selectedResult.student.email}</span>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader>
              <CardTitle>Score</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-center">
                <div className={`text-4xl font-bold ${getScoreColor(selectedResult.score)}`}>
                  {selectedResult.score}%
                </div>
                <p className="text-sm text-muted-foreground mt-2">
                  {Math.round((selectedResult.score / 100) * selectedResult.total_questions)}/{selectedResult.total_questions} correct answers
                </p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Test Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Subject:</span>
                <span>{selectedResult.test.subject}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Completed:</span>
                <span>{new Date(selectedResult.completed_at).toLocaleString()}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground">Results Visible:</span>
                <Switch
                  checked={selectedResult.show_results}
                  onCheckedChange={(checked) => handleShowResultsToggle(selectedResult.id, checked)}
                  disabled={processing}
                />
              </div>
            </CardContent>
          </Card>
        </div>

        {loadingQuestions ? (
          <Card>
            <CardContent className="pt-6">
              <div className="text-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
                <p className="text-muted-foreground">Loading question details...</p>
              </div>
            </CardContent>
          </Card>
        ) : questionResults.length > 0 ? (
          <Card>
            <CardHeader>
              <CardTitle>Questions and Answers</CardTitle>
              <CardDescription>
                Detailed breakdown of each question, answer options, student's response, and correct answer
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Top Action Bar for Recheck and Explanation */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 bg-muted/40 rounded-lg border">
                <div className="flex items-center gap-3">
                  <Badge variant="secondary" className="font-mono text-xs">
                    {selectedQuestionIds.size} of {questionResults.length} Selected
                  </Badge>
                  <div className="flex items-center gap-2 border-l pl-3">
                    <Switch
                      id="toggle-options-approval"
                      checked={showOptions}
                      onCheckedChange={setShowOptions}
                    />
                    <Label htmlFor="toggle-options-approval" className="text-xs cursor-pointer select-none font-medium text-muted-foreground">
                      Show Choices
                    </Label>
                  </div>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleRecheckSelected}
                    disabled={selectedQuestionIds.size === 0 || isRechecking}
                    className="h-8 text-xs gap-1.5"
                  >
                    {isRechecking ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <RefreshCw className="w-3.5 h-3.5 text-primary" />
                    )}
                    Recheck Answer {selectedQuestionIds.size > 0 && `(${selectedQuestionIds.size})`}
                  </Button>
                  
                  <Button
                    variant="default"
                    size="sm"
                    onClick={handleGenerateExplanations}
                    disabled={selectedQuestionIds.size === 0 || isGeneratingExplanation}
                    className="h-8 text-xs gap-1.5 bg-quiz hover:bg-quiz/90"
                  >
                    {isGeneratingExplanation ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <Sparkles className="w-3.5 h-3.5 text-yellow-300" />
                    )}
                    Explanation {selectedQuestionIds.size > 0 && `(${selectedQuestionIds.size})`}
                  </Button>
                </div>
              </div>

              <div className="border rounded-lg overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/30">
                      <TableHead className="w-10 text-center">
                        <Checkbox
                          checked={isAllSelected}
                          onCheckedChange={handleToggleSelectAll}
                          aria-label="Select all questions"
                        />
                      </TableHead>
                      <TableHead className="w-12">#</TableHead>
                      <TableHead>Question</TableHead>
                      <TableHead className="whitespace-nowrap w-32">Student Answer</TableHead>
                      <TableHead className="whitespace-nowrap w-32">Correct Answer</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {questionResults.map((result, index) => {
                      const isRecheckUpdated = Boolean(recheckResults[result.question_id]?.isChanged);
                      const correctLetter = (result.correct_answer || 'a').toLowerCase();

                      return (
                        <TableRow key={`${result.question_id || 'q'}-${index}`}>
                          <TableCell className="text-center align-top pt-4">
                            <Checkbox
                              checked={selectedQuestionIds.has(result.question_id)}
                              onCheckedChange={() => handleToggleSelectQuestion(result.question_id)}
                              aria-label={`Select question ${index + 1}`}
                            />
                          </TableCell>
                          <TableCell className="font-medium align-top pt-4">{index + 1}</TableCell>
                          <TableCell className="max-w-md align-top pt-4">
                            <div className="space-y-2">
                              <p className="text-sm font-medium">{result.question_text}</p>
                              
                              {showOptions && (
                                <div className="grid grid-cols-2 gap-2 text-xs">
                                  <div className={cn(
                                    "p-1.5 rounded border transition-colors",
                                    correctLetter === 'a' && isRecheckUpdated 
                                      ? "bg-green-100 dark:bg-green-950/60 border-green-400 text-green-800 dark:text-green-200 font-medium" 
                                      : "text-muted-foreground bg-muted/20"
                                  )}>
                                    A. {result.option_a}
                                  </div>
                                  <div className={cn(
                                    "p-1.5 rounded border transition-colors",
                                    correctLetter === 'b' && isRecheckUpdated 
                                      ? "bg-green-100 dark:bg-green-950/60 border-green-400 text-green-800 dark:text-green-200 font-medium" 
                                      : "text-muted-foreground bg-muted/20"
                                  )}>
                                    B. {result.option_b}
                                  </div>
                                  <div className={cn(
                                    "p-1.5 rounded border transition-colors",
                                    correctLetter === 'c' && isRecheckUpdated 
                                      ? "bg-green-100 dark:bg-green-950/60 border-green-400 text-green-800 dark:text-green-200 font-medium" 
                                      : "text-muted-foreground bg-muted/20"
                                  )}>
                                    C. {result.option_c}
                                  </div>
                                  <div className={cn(
                                    "p-1.5 rounded border transition-colors",
                                    correctLetter === 'd' && isRecheckUpdated 
                                      ? "bg-green-100 dark:bg-green-950/60 border-green-400 text-green-800 dark:text-green-200 font-medium" 
                                      : "text-muted-foreground bg-muted/20"
                                  )}>
                                    D. {result.option_d}
                                  </div>
                                </div>
                              )}

                              {/* Explanation rendered directly below the options/choices */}
                              {explanations[result.question_id] && (
                                <div className="mt-3 p-3 bg-amber-500/10 border border-amber-500/20 rounded-md text-xs text-foreground whitespace-pre-line leading-relaxed font-sans">
                                  <div className="flex items-center gap-1.5 font-semibold text-amber-600 dark:text-amber-400 mb-1">
                                    <Sparkles className="w-3.5 h-3.5" />
                                    Explanation
                                  </div>
                                  {explanations[result.question_id]}
                                </div>
                              )}
                            </div>
                          </TableCell>
                          <TableCell className="align-top pt-4">
                            <Badge 
                              variant={result.user_answer ? (result.is_correct ? "success" : "destructive") : "secondary"} 
                              className="whitespace-nowrap"
                            >
                              {result.user_answer ? result.user_answer.toUpperCase() : 'No Answer'}
                            </Badge>
                          </TableCell>
                          <TableCell className="align-top pt-4">
                            <Badge 
                              variant="outline" 
                              className={cn(
                                "whitespace-nowrap font-mono",
                                isRecheckUpdated && "bg-green-100 text-green-800 border-green-400 font-bold dark:bg-green-950/60 dark:text-green-200"
                              )}
                            >
                              {result.correct_answer.toUpperCase()}
                              {isRecheckUpdated && " ✓"}
                            </Badge>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        ) : null}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">Result Management</h2>
        <p className="text-muted-foreground">
          Manage result visibility for your students' test attempts
        </p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Results</CardTitle>
            <Clock className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {results.length}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Results Shown</CardTitle>
            <Eye className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {results.filter(r => r.show_results).length}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Results Hidden</CardTitle>
            <EyeOff className="h-4 w-4 text-gray-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {results.filter(r => !r.show_results).length}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Results Table */}
      <Card>
        <CardHeader>
          <CardTitle>Test Results Management</CardTitle>
          <CardDescription>Manage result visibility and feedback for your students</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Student</TableHead>
                <TableHead>Test</TableHead>
                <TableHead>Score</TableHead>
                <TableHead>Completed</TableHead>
                <TableHead>Show Results</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {results.map((result, idx) => (
                <TableRow key={`${result.id}-${idx}`}>
                  <TableCell>
                    <div className="flex items-center space-x-2">
                      <User className="w-4 h-4 text-muted-foreground" />
                      <div>
                        <div className="font-medium">{result.student.full_name}</div>
                        <div className="text-sm text-muted-foreground">{result.student.email}</div>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div>
                      <div className="font-medium">{result.test.title}</div>
                      <div className="text-sm text-muted-foreground">{result.test.subject}</div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className={`font-bold ${getScoreColor(result.score)}`}>
                      {result.score}%
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {Math.round((result.score / 100) * result.total_questions)}/{result.total_questions} correct
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center space-x-1 text-sm text-muted-foreground">
                      <Calendar className="w-3 h-3" />
                      <span>{new Date(result.completed_at).toLocaleDateString()}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Switch
                      checked={result.show_results}
                      onCheckedChange={(checked) => handleShowResultsToggle(result.id, checked)}
                      disabled={processing}
                    />
                  </TableCell>
                  <TableCell>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleViewResult(result)}
                    >
                      <Eye className="w-4 h-4 mr-1" />
                      View
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>

          {results.length === 0 && (
            <div className="text-center py-8">
              <Clock className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">No Results Found</h3>
              <p className="text-muted-foreground">
                No test results available to manage at this time.
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};