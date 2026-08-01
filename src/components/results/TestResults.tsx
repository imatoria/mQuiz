import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { ViolationReporting } from './ViolationReporting';
import { 
  Trophy, 
  TrendingUp, 
  TrendingDown, 
  Calendar,
  Clock,
  CheckCircle2,
  XCircle,
  BarChart3,
  Eye,
  EyeOff,
  Award,
  ShieldAlert
} from 'lucide-react';

interface TestAttempt {
  id: string;
  score: number;
  total_questions: number;
  completed_at: string;
  answers: Record<string, string>;
  show_results: boolean;
  question_papers?: {
    id: string;
    title: string;
    subjects_parent?: { subject_name: string };
  };
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

export const TestResults = () => {
  const [attempts, setAttempts] = useState<TestAttempt[]>([]);
  const [selectedAttempt, setSelectedAttempt] = useState<TestAttempt | null>(null);
  const [questionResults, setQuestionResults] = useState<QuestionResult[]>([]);
  const [loading, setLoading] = useState(true);
  const [showBreakdown, setShowBreakdown] = useState(false);
  const { user } = useAuth();
  const { toast } = useToast();

  useEffect(() => {
    if (user?.id) {
      loadTestResults();
    }
  }, [user?.id]);

  const loadTestResults = async () => {
    if (!user?.id) {
      setLoading(false);
      return;
    }

    try {
      const { data: attemptsData, error } = await supabase
        .from('paper_attempts')
        .select('*')
        .eq('user_id', user.id);

      if (error) throw error;

      const { data: papersData } = await supabase.from('question_papers').select('*');
      const { data: subjectsData } = await supabase.from('subjects_parent').select('*');

      const paperMap = new Map((papersData || []).map((p: any) => [p.id, p]));
      const subjMap = new Map((subjectsData || []).map((s: any) => [s.id, s.subject_name]));

      const formattedAttempts: TestAttempt[] = (attemptsData || []).map((attempt: any) => {
        const paper = paperMap.get(attempt.paper_id);
        const subjName = paper ? (subjMap.get(paper.subject_parent_id) || 'General') : 'General';
        
        let parsedAnswers = attempt.answers || {};
        if (typeof attempt.answers === 'string') {
          try {
            parsedAnswers = JSON.parse(attempt.answers);
          } catch {
            parsedAnswers = {};
          }
        }

        return {
          id: attempt.id,
          score: attempt.score || 0,
          total_questions: attempt.total_questions || 0,
          completed_at: attempt.completed_at || attempt.started_at || new Date().toISOString(),
          answers: parsedAnswers,
          show_results: attempt.show_results ?? true,
          question_papers: {
            id: paper?.id || attempt.paper_id,
            title: paper?.title || 'Question Paper',
            subjects_parent: {
              subject_name: subjName
            }
          }
        };
      });

      setAttempts(formattedAttempts);
    } catch (error) {
      console.error('Error loading test results:', error);
      toast({
        title: "Error",
        description: "Failed to load test results",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const loadQuestionBreakdown = async (attemptId: string, answers: Record<string, string>) => {
    try {
      const attempt = attempts.find(a => a.id === attemptId);
      if (!attempt) {
        toast({
          title: "Error",
          description: "Test attempt not found",
          variant: "destructive"
        });
        return;
      }

      const questionPaperId = attempt.question_papers?.id;
      
      if (!questionPaperId) {
        toast({
          title: "Error",
          description: "Question paper not found for this test",
          variant: "destructive"
        });
        return;
      }

      const { data: qpqData } = await supabase
        .from('question_paper_questions')
        .select('*')
        .eq('question_paper_id', questionPaperId);

      const { data: allQuestions } = await supabase.from('questions').select('*');
      const questionMap = new Map((allQuestions || []).map((q: any) => [q.id, q]));

      let parsedAnswers = answers;
      if (typeof answers === 'string') {
        try {
          parsedAnswers = JSON.parse(answers);
        } catch (e) {
          console.warn('Failed to parse answers as JSON, using as-is');
        }
      }

      const userAnswersObj = (parsedAnswers as any)?.userAnswers || parsedAnswers || {};

      const results: QuestionResult[] = (qpqData || []).map((item: any) => {
        const question = questionMap.get(item.question_id) || {};
        const userAnswer = userAnswersObj[question.id] || '';
        const isCorrect = userAnswer && userAnswer.toLowerCase() === (question.correct_answer || '').toLowerCase();
        
        let opts: any[] = [];
        try {
          opts = typeof question.options === 'string' ? JSON.parse(question.options || '[]') : (question.options || []);
        } catch {
          opts = [];
        }

        return {
          question_id: question.id || item.question_id,
          question_text: question.question_text || 'Question Text',
          option_a: opts[0] || 'Option A',
          option_b: opts[1] || 'Option B',
          option_c: opts[2] || 'Option C',
          option_d: opts[3] || 'Option D',
          correct_answer: question.correct_answer || '',
          user_answer: userAnswer || '',
          is_correct: isCorrect
        };
      });

      setQuestionResults(results);
      setShowBreakdown(true);
    } catch (error) {
      console.error('Error loading question breakdown:', error);
      toast({
        title: "Error",
        description: "Failed to load question details",
        variant: "destructive"
      });
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 90) return 'text-green-600';
    if (score >= 70) return 'text-blue-600';
    if (score >= 50) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getGrade = (score: number) => {
    if (score >= 90) return 'A+';
    if (score >= 85) return 'A';
    if (score >= 80) return 'B+';
    if (score >= 75) return 'B';
    if (score >= 70) return 'C+';
    if (score >= 65) return 'C';
    if (score >= 60) return 'D+';
    if (score >= 55) return 'D';
    return 'F';
  };

  const calculateAverage = () => {
    const approvedAttempts = attempts.filter(attempt => attempt.show_results);
    if (approvedAttempts.length === 0) return 0;
    return Math.round(approvedAttempts.reduce((sum, attempt) => sum + attempt.score, 0) / approvedAttempts.length);
  };

  const getPerformanceTrend = () => {
    const approvedAttempts = attempts.filter(attempt => attempt.show_results);
    if (approvedAttempts.length < 2) return null;
    const recent = approvedAttempts.slice(0, 3).reverse();
    const older = approvedAttempts.slice(3, 6).reverse();
    
    if (older.length === 0) return null;
    
    const recentAvg = recent.reduce((sum, a) => sum + a.score, 0) / recent.length;
    const olderAvg = older.reduce((sum, a) => sum + a.score, 0) / older.length;
    
    return recentAvg > olderAvg ? 'improving' : recentAvg < olderAvg ? 'declining' : 'stable';
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-muted rounded w-1/3"></div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-32 bg-muted rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Performance Overview */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Average Score</CardTitle>
            <Trophy className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {attempts.filter(a => a.show_results).length > 0 ? `${calculateAverage()}%` : 'N/A'}
            </div>
            <p className="text-xs text-muted-foreground">
              {attempts.filter(a => a.show_results).length > 0 ? `Grade: ${getGrade(calculateAverage())}` : 'No approved results'}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Tests Completed</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{attempts.length}</div>
            <p className="text-xs text-muted-foreground">
              Total attempts
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Performance Trend</CardTitle>
            {getPerformanceTrend() === 'improving' ? (
              <TrendingUp className="h-4 w-4 text-green-600" />
            ) : getPerformanceTrend() === 'declining' ? (
              <TrendingDown className="h-4 w-4 text-red-600" />
            ) : (
              <BarChart3 className="h-4 w-4 text-muted-foreground" />
            )}
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold capitalize">
              {getPerformanceTrend() || 'N/A'}
            </div>
            <p className="text-xs text-muted-foreground">
              Recent performance
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Test Results */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>{showBreakdown ? 'Test Results Breakdown' : 'Test Results'}</span>
            {showBreakdown && (
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => {
                  setShowBreakdown(false);
                  setSelectedAttempt(null);
                }}
              >
                ← Back to Results
              </Button>
            )}
          </CardTitle>
          {!showBreakdown && (
            <CardDescription>
              View your test performance and detailed breakdowns
            </CardDescription>
          )}
        </CardHeader>
        <CardContent>
          {!showBreakdown ? (
            // Results List
            <div className="space-y-4">
              {attempts.map((attempt) => (
                <Card key={attempt.id} className={`${attempt.show_results ? 'cursor-pointer hover:bg-muted/50' : ''} transition-colors`}
                      onClick={() => {
                        if (attempt.show_results) {
                          setSelectedAttempt(attempt);
                          loadQuestionBreakdown(attempt.id, attempt.answers);
                        }
                      }}>
                  <CardContent className="pt-6">
                    <div className="flex items-center justify-between">
                      <div className="space-y-1">
                        <h4 className="font-semibold">{attempt.question_papers?.title || 'Question Paper'}</h4>
                        <p className="text-sm text-muted-foreground">
                          {attempt.question_papers?.subjects_parent?.subject_name || 'General'}
                        </p>
                        <div className="flex items-center text-xs text-muted-foreground">
                          <Clock className="w-3 h-3 mr-1" />
                          {new Date(attempt.completed_at).toLocaleDateString()}
                        </div>
                      </div>
                      <div className="text-right space-y-2">
                        {attempt.show_results ? (
                          <>
                            <div className={`text-2xl font-bold ${getScoreColor(attempt.score)}`}>
                              {attempt.score}%
                            </div>
                            <Badge variant={attempt.score >= 70 ? "default" : "destructive"}>
                              {getGrade(attempt.score)}
                            </Badge>
                            <div className="text-xs text-muted-foreground">
                              {Math.round((attempt.score / 100) * attempt.total_questions)}/{attempt.total_questions} correct
                            </div>
                          </>
                        ) : (
                          <>
                            <div className="flex items-center text-muted-foreground">
                              <EyeOff className="w-4 h-4 mr-1" />
                              <span className="text-sm">Pending Approval</span>
                            </div>
                            <Badge variant="secondary">
                              Results Pending
                            </Badge>
                            <div className="text-xs text-muted-foreground">
                              {attempt.total_questions} questions
                            </div>
                          </>
                        )}
                      </div>
                    </div>
                    <Progress 
                      value={attempt.show_results ? attempt.score : 0} 
                      className="mt-4 h-2"
                    />
                  </CardContent>
                </Card>
              ))}

              {attempts.length === 0 && (
                <div className="text-center py-8">
                  <Award className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-semibold mb-2">No Test Results</h3>
                  <p className="text-muted-foreground">
                    Complete a test to see your results here.
                  </p>
                </div>
              )}
            </div>
          ) : (
            // Breakdown with Tabs
            selectedAttempt && (
              <Tabs defaultValue="breakdown" className="w-full">
                <TabsList className="w-full">
                  <TabsTrigger value="breakdown">Test Breakdown</TabsTrigger>
                  <TabsTrigger value="violations">
                    <ShieldAlert className="h-4 w-4 mr-2" />
                    Security Violations
                  </TabsTrigger>
                </TabsList>
                
                <TabsContent value="breakdown" className="mt-4">
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <h3 className="text-lg font-semibold">{selectedAttempt.question_papers?.title || 'Question Paper'}</h3>
                      <p className="text-muted-foreground">
                        Score: {selectedAttempt.score}% ({Math.round((selectedAttempt.score / 100) * selectedAttempt.total_questions)}/{selectedAttempt.total_questions} correct)
                      </p>
                    </div>

                    <div className="border rounded-lg">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead className="w-12">#</TableHead>
                            <TableHead>Question</TableHead>
                            <TableHead className="whitespace-nowrap w-24">Your Answer</TableHead>
                            {selectedAttempt?.show_results && (
                              <TableHead className="whitespace-nowrap w-24">Correct Answer</TableHead>
                            )}
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {questionResults.map((result, index) => (
                            <TableRow key={result.question_id || index}>
                              <TableCell className="font-medium">{index + 1}</TableCell>
                              <TableCell className="max-w-md">
                                <div className="space-y-2">
                                  <p className="text-sm">{result.question_text}</p>
                                  <div className="grid grid-cols-2 gap-2 text-xs">
                                    <div>A. {result.option_a}</div>
                                    <div>B. {result.option_b}</div>
                                    <div>C. {result.option_c}</div>
                                    <div>D. {result.option_d}</div>
                                  </div>
                                </div>
                              </TableCell>
                              <TableCell>
                                <Badge variant={(selectedAttempt?.show_results && result.user_answer) ? (result.is_correct ? "default" : "destructive") : "secondary"} className="whitespace-nowrap">
                                  {result.user_answer ? result.user_answer.toUpperCase() : 'No Answer'}
                                </Badge>
                              </TableCell>
                              {selectedAttempt?.show_results && (
                                <TableCell>
                                  <Badge variant="outline">
                                    {result.correct_answer}
                                  </Badge>
                                </TableCell>
                              )}
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  </div>
                </TabsContent>
                
                <TabsContent value="violations" className="mt-4">
                  <ViolationReporting attemptId={selectedAttempt.id} />
                </TabsContent>
              </Tabs>
            )
          )}
        </CardContent>
      </Card>
    </div>
  );
};