import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { BarChart3, TrendingUp, TrendingDown, Target, Users, Clock, AlertCircle, FileQuestion } from 'lucide-react';
import { useAnalytics } from "@/hooks/useAnalytics";

export default function QuestionAnalytics() {
  const [selectedPeriod, setSelectedPeriod] = useState('30');
  const [selectedDifficulty, setSelectedDifficulty] = useState('all');
  
  const { questionStats, paperPerformance, overallStats, isLoading } = useAnalytics(
    selectedPeriod,
    selectedDifficulty
  );

  const filteredQuestions = questionStats;

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

  // Show empty state if no data
  if (!isLoading && (!overallStats || overallStats.total_attempts === 0)) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold tracking-tight">Question Analytics</h2>
            <p className="text-muted-foreground">Track question performance and student insights</p>
          </div>
        </div>

        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <FileQuestion className="h-16 w-16 text-muted-foreground mb-4" />
            <h3 className="text-xl font-semibold mb-2">No Analytics Data Yet</h3>
            <p className="text-muted-foreground text-center max-w-md">
              Analytics will appear here once your students start completing tests. Create and schedule tests to get started!
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

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
            <div className="text-2xl font-bold">{overallStats?.total_questions_used || 0}</div>
            <p className="text-xs text-muted-foreground">
              Used in tests
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg Success Rate</CardTitle>
            <Target className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${getSuccessRateColor(overallStats?.avg_success_rate || 0)}`}>
              {overallStats?.avg_success_rate?.toFixed(1) || 0}%
            </div>
            <p className="text-xs text-muted-foreground">
              Across all tests
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Students</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{overallStats?.active_students || 0}</div>
            <p className="text-xs text-muted-foreground">
              Taking tests
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg Completion Time</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {overallStats?.avg_completion_time ? Math.round(overallStats.avg_completion_time / 60) : 0}m
            </div>
            <p className="text-xs text-muted-foreground">
              Per test
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
                        <p className="text-xs text-muted-foreground">{question.subject_name}</p>
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
                        <p className="text-xs text-muted-foreground">{question.subject_name}</p>
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
                  <TableHead>Subject</TableHead>
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
                    <TableCell>{question.subject_name}</TableCell>
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

      {/* Paper Performance Summary */}
      <Card>
        <CardHeader>
          <CardTitle>Paper Performance Summary</CardTitle>
          <CardDescription>Overall paper completion and scoring statistics</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8">Loading paper performance...</div>
          ) : paperPerformance.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No paper attempts yet
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Paper Name</TableHead>
                  <TableHead>Total Attempts</TableHead>
                  <TableHead>Average Score</TableHead>
                  <TableHead>Completion Rate</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paperPerformance.map((paper) => (
                  <TableRow key={paper.paper_id}>
                    <TableCell className="font-medium">{paper.paper_title}</TableCell>
                    <TableCell>{paper.total_attempts}</TableCell>
                    <TableCell>
                      <span className={getSuccessRateColor(paper.avg_score)}>
                        {paper.avg_score.toFixed(1)}%
                      </span>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Progress 
                          value={paper.completion_rate} 
                          className="w-16 h-2"
                        />
                        <span className="text-sm">{paper.completion_rate}%</span>
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