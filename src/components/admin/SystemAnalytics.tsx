import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { 
  BarChart3, 
  Users, 
  FileText, 
  Clock, 
  Activity, 
  Database,
  Server,
  Zap,
  TrendingUp,
  TrendingDown
} from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, ResponsiveContainer, BarChart, Bar } from 'recharts';

interface SystemStats {
  totalUsers: number;
  totalDocuments: number;
  totalQuestions: number;
  totalTests: number;
  activeTests: number;
  weeklyUserGrowth: number;
  monthlyTestsCreated: number;
  avgTestScore: number;
}

interface ChartData {
  name: string;
  value: number;
  previousValue?: number;
}

export const SystemAnalytics = () => {
  const [stats, setStats] = useState<SystemStats | null>(null);
  const [userGrowthData, setUserGrowthData] = useState<ChartData[]>([]);
  const [testActivityData, setTestActivityData] = useState<ChartData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    fetchAnalytics();
  }, []);

  const fetchAnalytics = async () => {
    try {
      // Fetch basic counts
      const [usersCount, documentsCount, questionsCount, testsCount, activeTestsCount] = await Promise.all([
        supabase.from('profiles').select('*', { count: 'exact', head: true }),
        supabase.from('documents').select('*', { count: 'exact', head: true }),
        supabase.from('questions').select('*', { count: 'exact', head: true }),
        supabase.from('question_papers').select('*', { count: 'exact', head: true }).eq('is_scheduled', true),
        supabase.from('question_papers').select('*', { count: 'exact', head: true }).eq('is_scheduled', true).lte('start_time', new Date().toISOString()).gte('end_time', new Date().toISOString())
      ]);

      // Calculate growth metrics (mock data for now)
      const weeklyUserGrowth = Math.floor(Math.random() * 20) + 5;
      const monthlyTestsCreated = Math.floor(Math.random() * 100) + 50;
      const avgTestScore = Math.floor(Math.random() * 30) + 70;

      setStats({
        totalUsers: usersCount.count || 0,
        totalDocuments: documentsCount.count || 0,
        totalQuestions: questionsCount.count || 0,
        totalTests: testsCount.count || 0,
        activeTests: activeTestsCount.count || 0,
        weeklyUserGrowth,
        monthlyTestsCreated,
        avgTestScore
      });

      // Generate mock chart data
      setUserGrowthData([
        { name: 'Mon', value: 12, previousValue: 8 },
        { name: 'Tue', value: 19, previousValue: 15 },
        { name: 'Wed', value: 15, previousValue: 12 },
        { name: 'Thu', value: 22, previousValue: 18 },
        { name: 'Fri', value: 28, previousValue: 20 },
        { name: 'Sat', value: 18, previousValue: 14 },
        { name: 'Sun', value: 24, previousValue: 16 }
      ]);

      setTestActivityData([
        { name: 'Jan', value: 65 },
        { name: 'Feb', value: 78 },
        { name: 'Mar', value: 82 },
        { name: 'Apr', value: 90 },
        { name: 'May', value: 88 },
        { name: 'Jun', value: 95 }
      ]);

    } catch (error: any) {
      toast({
        title: "Error fetching analytics",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="text-center">Loading analytics...</div>
        </CardContent>
      </Card>
    );
  }

  if (!stats) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="text-center text-muted-foreground">Failed to load analytics data</div>
        </CardContent>
      </Card>
    );
  }

  const chartConfig = {
    users: {
      label: "Users",
      color: "hsl(var(--primary))",
    },
    tests: {
      label: "Tests",
      color: "hsl(var(--secondary))",
    },
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <BarChart3 className="w-5 h-5 mr-2" />
            System Analytics
          </CardTitle>
          <CardDescription>
            Monitor system usage, performance, and growth metrics
          </CardDescription>
        </CardHeader>
      </Card>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Users</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalUsers}</div>
            <div className="flex items-center text-xs text-muted-foreground">
              <TrendingUp className="w-3 h-3 mr-1 text-green-500" />
              +{stats.weeklyUserGrowth}% this week
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pages</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalDocuments}</div>
            <div className="flex items-center text-xs text-muted-foreground">
              <Database className="w-3 h-3 mr-1" />
              {stats.totalQuestions} questions generated
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Tests</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.activeTests}</div>
            <div className="flex items-center text-xs text-muted-foreground">
              <Clock className="w-3 h-3 mr-1" />
              {stats.totalTests} total scheduled
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg Test Score</CardTitle>
            <Zap className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.avgTestScore}%</div>
            <div className="flex items-center text-xs text-muted-foreground">
              {stats.avgTestScore >= 75 ? (
                <TrendingUp className="w-3 h-3 mr-1 text-green-500" />
              ) : (
                <TrendingDown className="w-3 h-3 mr-1 text-red-500" />
              )}
              Performance metric
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>User Growth</CardTitle>
            <CardDescription>Daily new user registrations</CardDescription>
          </CardHeader>
          <CardContent>
            <ChartContainer config={chartConfig} className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={userGrowthData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Line 
                    type="monotone" 
                    dataKey="value" 
                    stroke="hsl(var(--primary))" 
                    strokeWidth={2}
                    dot={{ r: 4 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </ChartContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Test Activity</CardTitle>
            <CardDescription>Monthly test completion rates</CardDescription>
          </CardHeader>
          <CardContent>
            <ChartContainer config={chartConfig} className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={testActivityData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Bar dataKey="value" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </ChartContainer>
          </CardContent>
        </Card>
      </div>

      {/* System Health */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Server className="w-5 h-5 mr-2" />
            System Health
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Badge variant="default" className="bg-green-100 text-green-800">
                <Activity className="w-3 h-3 mr-1" />
                API Response Time
              </Badge>
              <span className="text-sm text-muted-foreground">125ms avg</span>
            </div>
            <Progress value={92} className="w-[200px]" />
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Badge variant="default" className="bg-blue-100 text-blue-800">
                <Database className="w-3 h-3 mr-1" />
                Database Performance
              </Badge>
              <span className="text-sm text-muted-foreground">98% uptime</span>
            </div>
            <Progress value={98} className="w-[200px]" />
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Badge variant="default" className="bg-purple-100 text-purple-800">
                <Zap className="w-3 h-3 mr-1" />
                AI Processing
              </Badge>
              <span className="text-sm text-muted-foreground">2.3s avg generation</span>
            </div>
            <Progress value={86} className="w-[200px]" />
          </div>
        </CardContent>
      </Card>
    </div>
  );
};