import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Progress } from "@/components/ui/progress";
import { BarChart3, TrendingUp, TrendingDown, Target, Users, Clock } from 'lucide-react';
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface QuestionStats {
  question_id: string;
  question_text: string;
  document_title: string;
  difficulty: string;
  total_attempts: number;
  correct_attempts: number;
  success_rate: number;
  avg_time_spent?: number;
}

interface TestPerformance {
  test_id: string;
  test_title: string;
  total_attempts: number;
  avg_score: number;
  completion_rate: number;
}

export default function QuestionAnalytics() {
  const [questionStats, setQuestionStats] = useState<QuestionStats[]>([]);
  const [testPerformance, setTestPerformance] = useState<TestPerformance[]>([]);
  const [selectedPeriod, setSelectedPeriod] = useState('30');
  const [selectedDifficulty, setSelectedDifficulty] = useState('all');
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    fetchAnalytics();
  }, [selectedPeriod, selectedDifficulty]);

  const fetchAnalytics = async () => {
    try {
      setIsLoading(true);
      
      // Mock data for question analytics since we need paper_attempts data structure
      const mockQuestionStats: QuestionStats[] = [
        {
          question_id: '1',
          question_text: 'What is the capital of France?',
          document_title: 'Geography Basics',
          difficulty: 'easy',
          total_attempts: 150,
          correct_attempts: 135,
          success_rate: 90,
          avg_time_spent: 45
        },
        {
          question_id: '2',
          question_text: 'Explain the process of photosynthesis',
          document_title: 'Biology Fundamentals',
          difficulty: 'medium',
          total_attempts: 120,
          correct_attempts: 84,
          success_rate: 70,
          avg_time_spent: 120
        },
        {
          question_id: '3',
          question_text: 'Solve the quadratic equation: x² + 5x + 6 = 0',
          document_title: 'Algebra Advanced',
          difficulty: 'difficult',
          total_attempts: 80,
          correct_attempts: 32,
          success_rate: 40,
          avg_time_spent: 180
        },
        {
          question_id: '4',
          question_text: 'What year did World War II end?',
          document_title: 'Modern History',
          difficulty: 'easy',
          total_attempts: 200,
          correct_attempts: 180,
          success_rate: 90,
          avg_time_spent: 30
        },
        {
          question_id: '5',
          question_text: 'Describe the water cycle',
          document_title: 'Environmental Science',
          difficulty: 'medium',
          total_attempts: 100,
          correct_attempts: 65,
          success_rate: 65,
          avg_time_spent: 90
        }
      ];

      const mockTestPerformance: TestPerformance[] = [
        {
          test_id: '1',
          test_title: 'Geography Quiz',
          total_attempts: 45,
          avg_score: 78.5,
          completion_rate: 95
        },
        {
          test_id: '2',
          test_title: 'Biology Exam',
          total_attempts: 32,
          avg_score: 68.2,
          completion_rate: 88
        },
        {
          test_id: '3',
          test_title: 'Math Assessment',
          total_attempts: 28,
          avg_score: 55.7,
          completion_rate: 75
        }
      ];

      setQuestionStats(mockQuestionStats);
      setTestPerformance(mockTestPerformance);
    } catch (error) {
      console.error('Error fetching analytics:', error);
      toast({
        title: "Error",
        description: "Failed to fetch analytics data.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const filteredQuestions = questionStats.filter(q => 
    selectedDifficulty === 'all' || q.difficulty === selectedDifficulty
  );

  const getSuccessRateColor = (rate: number) => {
    if (rate >= 80) return 'text-green-600';
    if (rate >= 60) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getSuccessRateVariant = (rate: number) => {
    if (rate >= 80) return 'default';
    if (rate >= 60) return 'secondary';
    return 'destructive';
  };

  const overallStats = {
    totalQuestions: filteredQuestions.length,
    avgSuccessRate: filteredQuestions.reduce((sum, q) => sum + q.success_rate, 0) / filteredQuestions.length || 0,
    totalAttempts: filteredQuestions.reduce((sum, q) => sum + q.total_attempts, 0),
    mostDifficult: filteredQuestions.sort((a, b) => a.success_rate - b.success_rate)[0],
    easiest: filteredQuestions.sort((a, b) => b.success_rate - a.success_rate)[0]
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Question Analytics</h2>
          <p className="text-muted-foreground">Track question performance and student insights</p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex gap-4">
        <Select value={selectedPeriod} onValueChange={setSelectedPeriod}>
          <SelectTrigger className="w-48">
            <SelectValue placeholder="Select period" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="7">Last 7 days</SelectItem>
            <SelectItem value="30">Last 30 days</SelectItem>
            <SelectItem value="90">Last 3 months</SelectItem>
            <SelectItem value="all">All time</SelectItem>
          </SelectContent>
        </Select>

        <Select value={selectedDifficulty} onValueChange={setSelectedDifficulty}>
          <SelectTrigger className="w-48">
            <SelectValue placeholder="Filter by difficulty" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All difficulties</SelectItem>
            <SelectItem value="easy">Easy</SelectItem>
            <SelectItem value="medium">Medium</SelectItem>
            <SelectItem value="difficult">Difficult</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Overview Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Questions</CardTitle>
            <BarChart3 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{overallStats.totalQuestions}</div>
            <p className="text-xs text-muted-foreground">
              Analyzed questions
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg Success Rate</CardTitle>
            <Target className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${getSuccessRateColor(overallStats.avgSuccessRate)}`}>
              {overallStats.avgSuccessRate.toFixed(1)}%
            </div>
            <p className="text-xs text-muted-foreground">
              Across all questions
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Attempts</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{overallStats.totalAttempts}</div>
            <p className="text-xs text-muted-foreground">
              Student responses
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg Time</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {(filteredQuestions.reduce((sum, q) => sum + (q.avg_time_spent || 0), 0) / filteredQuestions.length || 0).toFixed(0)}s
            </div>
            <p className="text-xs text-muted-foreground">
              Per question
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Performance Insights */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingDown className="w-4 h-4 text-red-500" />
              Most Challenging Questions
            </CardTitle>
            <CardDescription>Questions with lowest success rates</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="text-center py-4">Loading...</div>
            ) : (
              <div className="space-y-3">
                {filteredQuestions
                  .sort((a, b) => a.success_rate - b.success_rate)
                  .slice(0, 3)
                  .map((question, index) => (
                    <div key={question.question_id} className="flex items-center gap-3">
                      <div className="w-6 h-6 rounded-full bg-red-100 text-red-600 text-xs flex items-center justify-center font-semibold">
                        {index + 1}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{question.question_text}</p>
                        <p className="text-xs text-muted-foreground">{question.document_title}</p>
                      </div>
                      <Badge variant="destructive" className="text-xs">
                        {question.success_rate}%
                      </Badge>
                    </div>
                  ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-green-500" />
              Best Performing Questions
            </CardTitle>
            <CardDescription>Questions with highest success rates</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="text-center py-4">Loading...</div>
            ) : (
              <div className="space-y-3">
                {filteredQuestions
                  .sort((a, b) => b.success_rate - a.success_rate)
                  .slice(0, 3)
                  .map((question, index) => (
                    <div key={question.question_id} className="flex items-center gap-3">
                      <div className="w-6 h-6 rounded-full bg-green-100 text-green-600 text-xs flex items-center justify-center font-semibold">
                        {index + 1}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{question.question_text}</p>
                        <p className="text-xs text-muted-foreground">{question.document_title}</p>
                      </div>
                      <Badge variant="default" className="text-xs">
                        {question.success_rate}%
                      </Badge>
                    </div>
                  ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Detailed Question Performance Table */}
      <Card>
        <CardHeader>
          <CardTitle>Question Performance Details</CardTitle>
          <CardDescription>
            Detailed analytics for all questions
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8">Loading question analytics...</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Question</TableHead>
                  <TableHead>Document</TableHead>
                  <TableHead>Difficulty</TableHead>
                  <TableHead>Attempts</TableHead>
                  <TableHead>Success Rate</TableHead>
                  <TableHead>Avg Time</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredQuestions.map((question) => (
                  <TableRow key={question.question_id}>
                    <TableCell className="max-w-md">
                      <div className="truncate" title={question.question_text}>
                        {question.question_text}
                      </div>
                    </TableCell>
                    <TableCell>{question.document_title}</TableCell>
                    <TableCell>
                      <Badge variant="outline">
                        {question.difficulty}
                      </Badge>
                    </TableCell>
                    <TableCell>{question.total_attempts}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Progress 
                          value={question.success_rate} 
                          className="w-16 h-2"
                        />
                        <span className={`text-sm font-medium ${getSuccessRateColor(question.success_rate)}`}>
                          {question.success_rate}%
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>
                      {question.avg_time_spent ? `${question.avg_time_spent}s` : '-'}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Test Performance Summary */}
      <Card>
        <CardHeader>
          <CardTitle>Test Performance Summary</CardTitle>
          <CardDescription>Overall test completion and scoring statistics</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8">Loading test performance...</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Test Name</TableHead>
                  <TableHead>Total Attempts</TableHead>
                  <TableHead>Average Score</TableHead>
                  <TableHead>Completion Rate</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {testPerformance.map((test) => (
                  <TableRow key={test.test_id}>
                    <TableCell className="font-medium">{test.test_title}</TableCell>
                    <TableCell>{test.total_attempts}</TableCell>
                    <TableCell>
                      <span className={getSuccessRateColor(test.avg_score)}>
                        {test.avg_score.toFixed(1)}%
                      </span>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Progress 
                          value={test.completion_rate} 
                          className="w-16 h-2"
                        />
                        <span className="text-sm">{test.completion_rate}%</span>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}