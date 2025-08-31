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
  Award
} from 'lucide-react';

interface TestAttempt {
  id: string;
  score: number;
  total_questions: number;
  completed_at: string;
  answers: Record<string, string>;
  scheduled_test: {
    title: string;
    question_papers: {
      title: string;
      subjects: { name: string };
    };
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
  const [showAnswers, setShowAnswers] = useState(false);
  const { user, profile } = useAuth();
  const { toast } = useToast();

  useEffect(() => {
    if (user?.id) {
      loadTestResults();
    }
  }, [user?.id]);

  const loadTestResults = async () => {
    if (!user?.id) {
      console.log('User not available, skipping test results load');
      setLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase
        .from('test_attempts')
        .select(`
          id,
          score,
          total_questions,
          completed_at,
          answers,
          scheduled_test:scheduled_tests (
            title,
            question_papers (
              title,
              subjects (name)
            )
          )
        `)
        .eq('user_id', user.id)
        .not('completed_at', 'is', null)
        .order('completed_at', { ascending: false });

      if (error) throw error;
      setAttempts(data?.map(attempt => ({
        ...attempt,
        answers: attempt.answers as Record<string, string> || {}
      })) || []);
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
      if (!attempt) return;

      // Get all questions for this test
      const { data: questionsData, error } = await supabase
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
        .eq('question_paper_id', (attempt.scheduled_test.question_papers as any)?.id);

      if (error) throw error;

      const results: QuestionResult[] = questionsData.map((item: any) => {
        const question = item.questions;
        const userAnswer = answers[question.id] || '';
        return {
          question_id: question.id,
          question_text: question.question_text,
          option_a: question.option_a,
          option_b: question.option_b,
          option_c: question.option_c,
          option_d: question.option_d,
          correct_answer: question.correct_answer,
          user_answer: userAnswer,
          is_correct: userAnswer === question.correct_answer
        };
      });

      setQuestionResults(results);
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
    if (attempts.length === 0) return 0;
    return Math.round(attempts.reduce((sum, attempt) => sum + attempt.score, 0) / attempts.length);
  };

  const getPerformanceTrend = () => {
    if (attempts.length < 2) return null;
    const recent = attempts.slice(0, 3).reverse();
    const older = attempts.slice(3, 6).reverse();
    
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
            <div className="text-2xl font-bold">{calculateAverage()}%</div>
            <p className="text-xs text-muted-foreground">
              Grade: {getGrade(calculateAverage())}
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
          <CardTitle>Test Results</CardTitle>
          <CardDescription>
            View your test performance and detailed breakdowns
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="list" className="space-y-4">
            <TabsList>
              <TabsTrigger value="list">Results List</TabsTrigger>
              <TabsTrigger value="details" disabled={!selectedAttempt}>
                Question Breakdown
              </TabsTrigger>
            </TabsList>

            <TabsContent value="list" className="space-y-4">
              <div className="space-y-4">
                {attempts.map((attempt) => (
                  <Card key={attempt.id} className="cursor-pointer hover:bg-muted/50 transition-colors"
                        onClick={() => {
                          setSelectedAttempt(attempt);
                          loadQuestionBreakdown(attempt.id, attempt.answers);
                        }}>
                    <CardContent className="pt-6">
                      <div className="flex items-center justify-between">
                        <div className="space-y-1">
                          <h4 className="font-semibold">{attempt.scheduled_test.title}</h4>
                          <p className="text-sm text-muted-foreground">
                            {attempt.scheduled_test.question_papers.subjects.name} • 
                            {attempt.scheduled_test.question_papers.title}
                          </p>
                          <div className="flex items-center text-xs text-muted-foreground">
                            <Clock className="w-3 h-3 mr-1" />
                            {new Date(attempt.completed_at).toLocaleDateString()}
                          </div>
                        </div>
                        <div className="text-right space-y-2">
                          <div className={`text-2xl font-bold ${getScoreColor(attempt.score)}`}>
                            {attempt.score}%
                          </div>
                          <Badge variant={attempt.score >= 70 ? "default" : "destructive"}>
                            {getGrade(attempt.score)}
                          </Badge>
                          <div className="text-xs text-muted-foreground">
                            {Math.round((attempt.score / 100) * attempt.total_questions)}/{attempt.total_questions} correct
                          </div>
                        </div>
                      </div>
                      <Progress 
                        value={attempt.score} 
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
            </TabsContent>

            <TabsContent value="details" className="space-y-4">
              {selectedAttempt && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-lg font-semibold">{selectedAttempt.scheduled_test.title}</h3>
                      <p className="text-muted-foreground">Question-by-question breakdown</p>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setShowAnswers(!showAnswers)}
                      >
                        {showAnswers ? <EyeOff className="w-4 h-4 mr-2" /> : <Eye className="w-4 h-4 mr-2" />}
                        {showAnswers ? 'Hide' : 'Show'} Answers
                      </Button>
                    </div>
                  </div>

                  <div className="border rounded-lg">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="w-12">#</TableHead>
                          <TableHead>Question</TableHead>
                          <TableHead className="w-24">Your Answer</TableHead>
                          {showAnswers && <TableHead className="w-24">Correct Answer</TableHead>}
                          <TableHead className="w-16">Result</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {questionResults.map((result, index) => (
                          <TableRow key={result.question_id}>
                            <TableCell className="font-medium">{index + 1}</TableCell>
                            <TableCell className="max-w-md">
                              <div className="space-y-2">
                                <p className="text-sm">{result.question_text}</p>
                                {showAnswers && (
                                  <div className="grid grid-cols-2 gap-2 text-xs">
                                    <div>A. {result.option_a}</div>
                                    <div>B. {result.option_b}</div>
                                    <div>C. {result.option_c}</div>
                                    <div>D. {result.option_d}</div>
                                  </div>
                                )}
                              </div>
                            </TableCell>
                            <TableCell>
                              <Badge variant={result.is_correct ? "default" : "destructive"}>
                                {result.user_answer || 'No Answer'}
                              </Badge>
                            </TableCell>
                            {showAnswers && (
                              <TableCell>
                                <Badge variant="outline">
                                  {result.correct_answer}
                                </Badge>
                              </TableCell>
                            )}
                            <TableCell>
                              {result.is_correct ? (
                                <CheckCircle2 className="w-5 h-5 text-green-600" />
                              ) : (
                                <XCircle className="w-5 h-5 text-red-600" />
                              )}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </div>
              )}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
};