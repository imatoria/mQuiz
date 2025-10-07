import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Switch } from '@/components/ui/switch';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
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
  XCircle
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

  useEffect(() => {
    if (user?.id) {
      loadResults();
    }
  }, [user]);

  const loadResults = async () => {
    try {
      setLoading(true);

      // Get children of the current parent
      const { data: children, error: childrenError } = await supabase
        .from('parent_child_relationships')
        .select('child_id')
        .eq('parent_id', user?.id);

      if (childrenError) throw childrenError;

      const childIds = children?.map(c => c.child_id) || [];

      if (childIds.length === 0) {
        setResults([]);
        setLoading(false);
        return;
      }

      // Get all tests created by this parent
      const { data: parentTests, error: testsError } = await supabase
        .from('question_papers')
        .select('id')
        .eq('user_id', user?.id);

      if (testsError) throw testsError;

      const testIds = parentTests?.map(t => t.id) || [];

      if (testIds.length === 0) {
        setResults([]);
        setLoading(false);
        return;
      }

      // Get all paper attempts from parent's children for parent's papers
      const { data: attempts, error: attemptsError } = await supabase
        .from('paper_attempts')
        .select(`
          id,
          score,
          total_questions,
          completed_at,
          answers,
          show_results,
          feedback,
          user_id,
          paper_id,
          question_papers!inner (
            title,
            subjects_parent (subject_name)
          )
        `)
        .in('user_id', childIds)
        .in('paper_id', testIds)
        .not('completed_at', 'is', null)
        .order('completed_at', { ascending: false });

      if (attemptsError) throw attemptsError;

      // Get user profiles separately
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('user_id, full_name, email')
        .in('user_id', childIds);

      if (profilesError) throw profilesError;

      const profileMap = profiles?.reduce((acc, profile) => {
        acc[profile.user_id] = profile;
        return acc;
      }, {} as Record<string, any>) || {};

      const formatted: TestResult[] = attempts?.map(attempt => ({
        id: attempt.id,
        score: attempt.score || 0,
        total_questions: attempt.total_questions || 0,
        completed_at: attempt.completed_at,
        show_results: attempt.show_results || false,
        feedback: attempt.feedback,
        answers: (attempt.answers as Record<string, string>) || {},
        student: {
          id: attempt.user_id,
          full_name: profileMap[attempt.user_id]?.full_name || 'Unknown',
          email: profileMap[attempt.user_id]?.email || ''
        },
        test: {
          title: attempt.question_papers?.title || 'Unknown Test',
          subject: attempt.question_papers?.subjects_parent?.subject_name || 'Unknown Subject',
          question_paper_id: attempt.paper_id || ''
        }
      })) || [];

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

      // Get the paper attempt first to verify parent-child relationship
      const { data: attempt, error: attemptError } = await supabase
        .from('paper_attempts')
        .select(`
          user_id,
          question_papers!inner(user_id)
        `)
        .eq('id', resultId)
        .single();

      if (attemptError) throw attemptError;

      // Verify the paper creator is the current user
      if (attempt?.question_papers?.user_id !== user?.id) {
        throw new Error('Unauthorized: You can only manage results for your own papers');
      }

      const { error } = await supabase
        .from('paper_attempts')
        .update({
          show_results: showResults
        })
        .eq('id', resultId);

      if (error) throw error;

      toast({
        title: "Success",
        description: `Results ${showResults ? 'shown' : 'hidden'} successfully`,
        variant: "default"
      });

      // Update the local state
      setResults(prevResults => 
        prevResults.map(result => 
          result.id === resultId 
            ? { ...result, show_results: showResults }
            : result
        )
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
      const { data: questionsData, error: questionsError } = await supabase
        .from('question_paper_questions')
        .select(`
          questions (
            id,
            question_text,
            option_a,
            option_b,
            option_c,
            option_d,
            correct_answer
          )
        `)
        .eq('question_paper_id', result.test.question_paper_id)
        .order('question_order');

      if (questionsError) throw questionsError;

      if (!questionsData || questionsData.length === 0) {
        toast({
          title: "Error",
          description: "No questions found for this test",
          variant: "destructive"
        });
        return;
      }

      // Parse answers - handle both string and object formats
      let parsedAnswers = result.answers;
      if (typeof result.answers === 'string') {
        try {
          parsedAnswers = JSON.parse(result.answers);
        } catch (e) {
          console.warn('Failed to parse answers as JSON, using as-is');
        }
      }

      const questionResults: QuestionResult[] = questionsData.map((item: any) => {
        const question = item.questions;
        const userAnswer = parsedAnswers.userAnswers?.[question.id] || '';
        const isCorrect = userAnswer && userAnswer.toLowerCase() === question.correct_answer.toLowerCase();
        
        return {
          question_id: question.id,
          question_text: question.question_text,
          option_a: question.option_a,
          option_b: question.option_b,
          option_c: question.option_c,
          option_d: question.option_d,
          correct_answer: question.correct_answer,
          user_answer: userAnswer || '',
          is_correct: isCorrect
        };
      });

      setQuestionResults(questionResults);

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
  if (profile?.role !== 'parent') {
    return (
      <Card>
        <CardContent className="pt-6 text-center">
          <AlertCircle className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-semibold mb-2">Access Denied</h3>
          <p className="text-muted-foreground">
            Result approval is only available for parents/teachers.
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
            <CardContent>
              <div className="border rounded-lg">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-12">#</TableHead>
                      <TableHead>Question</TableHead>
                      <TableHead className="whitespace-nowrap w-32">Student Answer</TableHead>
                      <TableHead className="whitespace-nowrap w-32">Correct Answer</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {questionResults.map((result, index) => (
                      <TableRow key={result.question_id}>
                        <TableCell className="font-medium">{index + 1}</TableCell>
                        <TableCell className="max-w-md">
                          <div className="space-y-2">
                            <p className="text-sm font-medium">{result.question_text}</p>
                            <div className="grid grid-cols-2 gap-2 text-xs text-muted-foreground">
                              <div>A. {result.option_a}</div>
                              <div>B. {result.option_b}</div>
                              <div>C. {result.option_c}</div>
                              <div>D. {result.option_d}</div>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge 
                            variant={result.user_answer ? (result.is_correct ? "success" : "destructive") : "secondary"} 
                            className="whitespace-nowrap"
                          >
                            {result.user_answer ? result.user_answer.toUpperCase() : 'No Answer'}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className="whitespace-nowrap">
                            {result.correct_answer.toUpperCase()}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
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
              {results.map((result) => (
                <TableRow key={result.id}>
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