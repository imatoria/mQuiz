import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { TrendingUp, Target, BookOpen, Calendar, AlertCircle, CheckCircle2 } from 'lucide-react';

interface PerformanceData {
  test_name: string;
  score: number;
  date: string;
  subject: string;
  attempt_number: number;
}

interface SubjectPerformance {
  subject: string;
  average_score: number;
  test_count: number;
  improvement: number;
}

interface TimeData {
  period: string;
  score: number;
  tests_taken: number;
}

const COLORS = ['#8884d8', '#82ca9d', '#ffc658', '#ff7300', '#8dd1e1'];

export const PerformanceAnalytics = () => {
  const [performanceData, setPerformanceData] = useState<PerformanceData[]>([]);
  const [subjectData, setSubjectData] = useState<SubjectPerformance[]>([]);
  const [timeData, setTimeData] = useState<TimeData[]>([]);
  const [timeRange, setTimeRange] = useState('3months');
  const [loading, setLoading] = useState(true);
  const [totalTests, setTotalTests] = useState(0);
  const [pendingApprovalCount, setPendingApprovalCount] = useState(0);
  const { user } = useAuth();
  const { toast } = useToast();

  useEffect(() => {
    loadAnalyticsData();
  }, [user, timeRange]);

  const loadAnalyticsData = async () => {
    if (!user?.id) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      
      const dateThreshold = new Date();
      switch (timeRange) {
        case '1month':
          dateThreshold.setMonth(dateThreshold.getMonth() - 1);
          break;
        case '3months':
          dateThreshold.setMonth(dateThreshold.getMonth() - 3);
          break;
        case '6months':
          dateThreshold.setMonth(dateThreshold.getMonth() - 6);
          break;
        case '1year':
          dateThreshold.setFullYear(dateThreshold.getFullYear() - 1);
          break;
      }

      // Load test performance data - ONLY approved results (show_results = true)
      const { data: attempts, error } = await supabase
        .from('paper_attempts')
        .select(`
          score,
          completed_at,
          attempt_number,
          show_results,
          question_papers!inner (
            title,
            subjects (name)
          )
        `)
        .eq('user_id', user?.id)
        .eq('show_results', true)
        .not('completed_at', 'is', null)
        .gte('completed_at', dateThreshold.toISOString())
        .order('completed_at', { ascending: true });

      if (error) throw error;

      // Get total test count (including unapproved)
      const { data: allAttempts, error: allError } = await supabase
        .from('paper_attempts')
        .select('id, show_results', { count: 'exact' })
        .eq('user_id', user?.id)
        .not('completed_at', 'is', null)
        .gte('completed_at', dateThreshold.toISOString());

      if (allError) throw allError;

      const totalCount = allAttempts?.length || 0;
      const pendingCount = allAttempts?.filter(a => !a.show_results).length || 0;
      
      setTotalTests(totalCount);
      setPendingApprovalCount(pendingCount);

      // Format performance data
      const formatted: PerformanceData[] = attempts?.map(attempt => ({
        test_name: attempt.question_papers.title,
        score: attempt.score,
        date: new Date(attempt.completed_at).toLocaleDateString(),
        subject: attempt.question_papers.subjects.name,
        attempt_number: attempt.attempt_number
      })) || [];

      setPerformanceData(formatted);

      // Calculate subject performance
      const subjectMap = new Map<string, { scores: number[], count: number }>();
      formatted.forEach(item => {
        if (!subjectMap.has(item.subject)) {
          subjectMap.set(item.subject, { scores: [], count: 0 });
        }
        subjectMap.get(item.subject)!.scores.push(item.score);
        subjectMap.get(item.subject)!.count++;
      });

      const subjectPerf: SubjectPerformance[] = Array.from(subjectMap.entries()).map(([subject, data]) => {
        const average = data.scores.reduce((sum, score) => sum + score, 0) / data.scores.length;
        const firstHalf = data.scores.slice(0, Math.floor(data.scores.length / 2));
        const secondHalf = data.scores.slice(Math.floor(data.scores.length / 2));
        
        const firstAvg = firstHalf.length > 0 ? firstHalf.reduce((sum, score) => sum + score, 0) / firstHalf.length : 0;
        const secondAvg = secondHalf.length > 0 ? secondHalf.reduce((sum, score) => sum + score, 0) / secondHalf.length : 0;
        
        return {
          subject,
          average_score: Math.round(average),
          test_count: data.count,
          improvement: Math.round(secondAvg - firstAvg)
        };
      });

      setSubjectData(subjectPerf);

      // Calculate time-based data
      const timeMap = new Map<string, { scores: number[], count: number }>();
      formatted.forEach(item => {
        const date = new Date(item.date);
        const monthYear = `${date.getMonth() + 1}/${date.getFullYear()}`;
        
        if (!timeMap.has(monthYear)) {
          timeMap.set(monthYear, { scores: [], count: 0 });
        }
        timeMap.get(monthYear)!.scores.push(item.score);
        timeMap.get(monthYear)!.count++;
      });

      const timePerf: TimeData[] = Array.from(timeMap.entries()).map(([period, data]) => ({
        period,
        score: Math.round(data.scores.reduce((sum, score) => sum + score, 0) / data.scores.length),
        tests_taken: data.count
      }));

      setTimeData(timePerf);

    } catch (error) {
      console.error('Error loading analytics:', error);
      toast({
        title: "Error",
        description: "Failed to load performance analytics",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-muted rounded w-1/3"></div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="h-64 bg-muted rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="space-y-6">
        <Card>
          <CardContent className="flex items-center justify-center py-8">
            <p className="text-muted-foreground">Please log in to view analytics.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Show message if student has tests but no approved results
  const hasNoApprovedResults = totalTests > 0 && performanceData.length === 0;
  
  if (hasNoApprovedResults) {
    return (
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BookOpen className="h-5 w-5" />
              Results Pending Approval
            </CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col items-center justify-center py-8">
            <div className="text-center space-y-4">
              <div className="bg-muted rounded-full w-16 h-16 flex items-center justify-center mx-auto">
                <Calendar className="h-8 w-8 text-muted-foreground" />
              </div>
              <div>
                <p className="font-medium text-lg">You've completed {totalTests} test{totalTests > 1 ? 's' : ''}!</p>
                <p className="text-muted-foreground mt-2">
                  Results will appear here once your parent reviews and approves them.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h2 className="text-2xl font-bold">Performance Analytics</h2>
          <p className="text-muted-foreground">Track your progress over time</p>
        </div>
        <Select value={timeRange} onValueChange={setTimeRange}>
          <SelectTrigger className="w-40">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="1month">Last Month</SelectItem>
            <SelectItem value="3months">Last 3 Months</SelectItem>
            <SelectItem value="6months">Last 6 Months</SelectItem>
            <SelectItem value="1year">Last Year</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Pending Approval Alert */}
      {pendingApprovalCount > 0 && (
        <Card className="border-l-4 border-l-yellow-500 bg-yellow-50 dark:bg-yellow-950">
          <CardContent className="flex items-center gap-3 py-4">
            <AlertCircle className="h-5 w-5 text-yellow-600 dark:text-yellow-400" />
            <div>
              <p className="font-medium text-yellow-900 dark:text-yellow-100">
                {pendingApprovalCount} test result{pendingApprovalCount > 1 ? 's' : ''} pending parent approval
              </p>
              <p className="text-sm text-yellow-700 dark:text-yellow-300">
                These results will appear in your analytics once approved by your parent.
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      <Tabs defaultValue="overview">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="subjects">By Subject</TabsTrigger>
          <TabsTrigger value="timeline">Timeline</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          {/* Key Metrics */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Average Score</CardTitle>
                <Target className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {performanceData.length > 0 
                    ? Math.round(performanceData.reduce((sum, item) => sum + item.score, 0) / performanceData.length)
                    : 0}%
                </div>
                <p className="text-xs text-muted-foreground mt-1">From approved results</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Tests Taken</CardTitle>
                <BookOpen className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{totalTests}</div>
                <p className="text-xs text-muted-foreground mt-1">All completed tests</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Results Approved</CardTitle>
                <CheckCircle2 className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{performanceData.length}</div>
                <p className="text-xs text-muted-foreground mt-1">
                  {totalTests > 0 ? `${Math.round((performanceData.length / totalTests) * 100)}% approved` : 'No tests yet'}
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Subjects Covered</CardTitle>
                <BookOpen className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{subjectData.length}</div>
                <p className="text-xs text-muted-foreground mt-1">Different subjects</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Improvement</CardTitle>
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {subjectData.length > 0 
                    ? `+${Math.round(subjectData.reduce((sum, item) => sum + item.improvement, 0) / subjectData.length)}%`
                    : '0%'}
                </div>
                <p className="text-xs text-muted-foreground mt-1">Average growth</p>
              </CardContent>
            </Card>
          </div>

          {/* Score Trend Chart */}
          <Card>
            <CardHeader>
              <CardTitle>Score Trend</CardTitle>
              <CardDescription>Your test scores over time</CardDescription>
            </CardHeader>
            <CardContent>
              {performanceData.length > 0 ? (
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={performanceData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" />
                    <YAxis domain={[0, 100]} />
                    <Tooltip />
                    <Line 
                      type="monotone" 
                      dataKey="score" 
                      stroke="hsl(var(--primary))" 
                      strokeWidth={2}
                      dot={{ fill: "hsl(var(--primary))" }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex items-center justify-center h-[300px] text-muted-foreground">
                  <div className="text-center">
                    <BookOpen className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    {totalTests > 0 ? (
                      <>
                        <p>You've completed {totalTests} test{totalTests > 1 ? 's' : ''}!</p>
                        <p className="text-sm mt-2">Results will appear here once approved by your parent.</p>
                      </>
                    ) : (
                      <>
                        <p>No test data available for the selected time period.</p>
                        <p className="text-sm mt-2">Complete some tests to see your progress trend.</p>
                      </>
                    )}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="subjects" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Subject Performance Bar Chart */}
            <Card>
              <CardHeader>
                <CardTitle>Subject Performance</CardTitle>
                <CardDescription>Average scores by subject</CardDescription>
              </CardHeader>
              <CardContent>
                {subjectData.length > 0 ? (
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={subjectData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="subject" />
                      <YAxis domain={[0, 100]} />
                      <Tooltip />
                      <Bar dataKey="average_score" fill="hsl(var(--primary))" />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex items-center justify-center h-[300px] text-muted-foreground">
                    <div className="text-center">
                      <BookOpen className="h-12 w-12 mx-auto mb-4 opacity-50" />
                      {totalTests > 0 ? (
                        <>
                          <p>Subject performance will appear here</p>
                          <p className="text-sm mt-2">once your test results are approved by your parent.</p>
                        </>
                      ) : (
                        <>
                          <p>No subject data available.</p>
                          <p className="text-sm mt-2">Complete tests in different subjects to see performance breakdown.</p>
                        </>
                      )}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Subject Distribution Pie Chart */}
            <Card>
              <CardHeader>
                <CardTitle>Test Distribution</CardTitle>
                <CardDescription>Tests taken by subject</CardDescription>
              </CardHeader>
              <CardContent>
                {subjectData.length > 0 ? (
                  <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                      <Pie
                        data={subjectData}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={({ subject, test_count }) => `${subject}: ${test_count}`}
                        outerRadius={80}
                        fill="#8884d8"
                        dataKey="test_count"
                      >
                        {subjectData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex items-center justify-center h-[300px] text-muted-foreground">
                    <div className="text-center">
                      <BookOpen className="h-12 w-12 mx-auto mb-4 opacity-50" />
                      {totalTests > 0 ? (
                        <>
                          <p>Test distribution will appear here</p>
                          <p className="text-sm mt-2">once your results are approved.</p>
                        </>
                      ) : (
                        <>
                          <p>No test distribution data available.</p>
                          <p className="text-sm mt-2">Complete tests to see subject distribution.</p>
                        </>
                      )}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="timeline" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Monthly Performance</CardTitle>
              <CardDescription>Average scores and test frequency by month</CardDescription>
            </CardHeader>
            <CardContent>
              {timeData.length > 0 ? (
                <ResponsiveContainer width="100%" height={400}>
                  <BarChart data={timeData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="period" />
                    <YAxis yAxisId="score" orientation="left" domain={[0, 100]} />
                    <YAxis yAxisId="count" orientation="right" />
                    <Tooltip />
                    <Bar yAxisId="score" dataKey="score" fill="hsl(var(--primary))" name="Average Score" />
                    <Bar yAxisId="count" dataKey="tests_taken" fill="hsl(var(--secondary))" name="Tests Taken" />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex items-center justify-center h-[400px] text-muted-foreground">
                  <div className="text-center">
                    <Calendar className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    {totalTests > 0 ? (
                      <>
                        <p>Timeline data will appear here</p>
                        <p className="text-sm mt-2">once your test results are approved by your parent.</p>
                      </>
                    ) : (
                      <>
                        <p>No timeline data available.</p>
                        <p className="text-sm mt-2">Complete tests over time to see performance trends.</p>
                      </>
                    )}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};