import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { dbService } from '@/services/db';
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
  const { subtab } = useParams();
  const navigate = useNavigate();
  const [performanceData, setPerformanceData] = useState<PerformanceData[]>([]);
  const [subjectData, setSubjectData] = useState<SubjectPerformance[]>([]);
  const [timeData, setTimeData] = useState<TimeData[]>([]);
  const [timeRange, setTimeRange] = useState('all');
  const [loading, setLoading] = useState(true);
  const [totalTests, setTotalTests] = useState(0);
  const [pendingApprovalCount, setPendingApprovalCount] = useState(0);
  const { user } = useAuth();
  const { toast } = useToast();

  // Read analytics subtab from URL or default to 'overview'
  const activeTab = subtab || 'overview';

  // Redirect to default subtab if not set and we're on the analytics tab
  useEffect(() => {
    const currentPath = window.location.pathname;
    if (!subtab && currentPath.startsWith('/student/analytics')) {
      navigate('/student/analytics/overview', { replace: true });
    }
  }, [subtab, navigate]);

  // Update URL when changing analytics tabs
  const handleAnalyticsTabChange = (value: string) => {
    navigate(`/student/analytics/${value}`);
  };

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
      
      let dateThreshold: Date | null = new Date();
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
        case 'all':
          dateThreshold = null;
          break;
      }

      // Get all attempts for the user
      const { data: allAttempts } = await dbService.getProvider().query(
        'SELECT * FROM paper_attempts WHERE user_id = ?',
        [user?.id]
      );

      // 1. Filter all attempts by the selected date threshold first
      const dateFilteredAttempts = (allAttempts || []).filter((a: any) => {
        if (dateThreshold) {
          const completedDate = new Date(a.completed_at || a.started_at || a.created_at || Date.now());
          return completedDate >= dateThreshold;
        }
        return true;
      });

      // 2. Filter for approved results to show in charts
      const attemptsData = dateFilteredAttempts.filter((a: any) => {
        // Handle SQLite boolean representations (1, 0, true, false) and defaults
        const rawShow = a.show_results ?? true;
        const isApproved = rawShow === 1 || rawShow === true || rawShow === 'true';
        return isApproved;
      });

      const { data: papersData } = await dbService.getProvider().query('SELECT * FROM question_papers');
      const { data: subjectsData } = await dbService.getProvider().query('SELECT * FROM subjects');

      const paperMap = new Map((papersData || []).map((p: any) => [p.id, p]));
      const subjMap = new Map((subjectsData || []).map((s: any) => [s.id, s.subject_name]));

      // 3. Calculate total and pending counts based on the date-filtered attempts
      const totalCount = dateFilteredAttempts.length;
      const pendingCount = dateFilteredAttempts.filter((a: any) => {
        const rawShow = a.show_results ?? true;
        return !(rawShow === 1 || rawShow === true || rawShow === 'true');
      }).length;
      
      setTotalTests(totalCount);
      setPendingApprovalCount(pendingCount);

      // Format performance data
      const formatted: PerformanceData[] = (attemptsData || []).map((attempt: any) => {
        const paper = paperMap.get(attempt.paper_id);
        const subjName = paper ? (subjMap.get(paper.subject_id) || 'General') : 'General';

        return {
          test_name: paper?.title || 'Test',
          score: attempt.score || 0,
          date: new Date(attempt.completed_at || attempt.started_at || Date.now()).toLocaleDateString(),
          subject: subjName,
          attempt_number: attempt.attempt_number || 1
        };
      });

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
            <SelectItem value="all">All Time</SelectItem>
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
                {pendingApprovalCount} test result{pendingApprovalCount > 1 ? 's' : ''} pending teacher approval
              </p>
              <p className="text-sm text-yellow-700 dark:text-yellow-300">
                These results will appear in your analytics once approved by your teacher.
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      <Tabs value={activeTab} onValueChange={handleAnalyticsTabChange}>
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
                        <p className="text-sm mt-2">Results will appear here once approved by your teacher.</p>
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
                          <p className="text-sm mt-2">once your test results are approved by your teacher.</p>
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
                        <p className="text-sm mt-2">once your test results are approved by your teacher.</p>
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