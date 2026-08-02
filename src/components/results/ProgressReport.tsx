import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Line, Bar } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';
import { dbService } from '@/services/db';
import { useAuth } from '@/hooks/useAuth';
import { 
  TrendingUp, 
  Target, 
  Clock, 
  Trophy,
  Calendar,
  User
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend
);

interface StudentProgress {
  student_id: string;
  student_name: string;
  total_tests: number;
  completed_tests: number;
  average_score: number;
  improvement_trend: number;
  recent_tests: TestResult[];
}

interface TestResult {
  test_title: string;
  score: number;
  completed_at: string;
  total_questions: number;
}

export const ProgressReport = () => {
  const [progressData, setProgressData] = useState<StudentProgress[]>([]);
  const [selectedStudent, setSelectedStudent] = useState<string>('all');
  const [timeframe, setTimeframe] = useState<string>('all');
  const [loading, setLoading] = useState(true);
  const { profile } = useAuth();
  const { toast } = useToast();

  useEffect(() => {
    fetchProgressData();
  }, [timeframe, selectedStudent]);

  const fetchProgressData = async () => {
    try {
      setLoading(true);
      
      const { data: rawAttemptsData } = await dbService.getProvider().query('SELECT * FROM paper_attempts');

      const days = parseInt(timeframe, 10);
      const dateThreshold = isNaN(days) ? null : new Date();
      if (dateThreshold) dateThreshold.setDate(dateThreshold.getDate() - days);

      const attemptsData = (rawAttemptsData || []).filter((a: any) => {
        if (!dateThreshold) return true;
        const completedDate = new Date(a.completed_at || a.started_at || a.created_at || Date.now());
        return completedDate >= dateThreshold;
      });

      const { data: papersData } = await dbService.getProvider().query('SELECT * FROM question_papers');
      const paperMap = new Map((papersData || []).map((p: any) => [p.id, p]));

      const attempts = (attemptsData || []).map((attempt: any) => {
        const paper = paperMap.get(attempt.paper_id) || {};
        return {
          ...attempt,
          question_papers: {
            title: paper.title || 'Question Paper',
            user_id: paper.user_id || '',
            total_questions: paper.total_questions || attempt.total_questions || 10
          }
        };
      });

      // Fetch ALL profiles then filter in JS to avoid IN-clause issues in SqliteWasmProvider
      const { data: allProfiles } = await dbService.getProvider().query('SELECT * FROM profiles');
      const profileMap = (allProfiles || []).reduce((acc: Record<string, any>, p: any) => {
        acc[p.user_id] = p;
        return acc;
      }, {});

      // If teacher, restrict attempts to their linked students only
      let allowedUserIds: Set<string> | null = null;
      if (profile?.role === 'teacher') {
        const { data: relationships } = await dbService.getProvider().query(
          'SELECT student_id FROM teacher_student_relationships WHERE teacher_id = ?',
          [profile.user_id]
        );
        allowedUserIds = new Set((relationships || []).map((r: any) => r.student_id));
      }

      // Process data into progress reports
      const progressMap = new Map<string, StudentProgress>();

      attempts?.filter((attempt: any) => {
        if (!attempt.user_id) return false;
        if (allowedUserIds) return allowedUserIds.has(attempt.user_id);
        return true;
      }).forEach((attempt: any) => {
        const studentId = attempt.user_id;
        const studentName = profileMap[studentId]?.full_name || 'Unknown Student';
        
        if (!progressMap.has(studentId)) {
          progressMap.set(studentId, {
            student_id: studentId,
            student_name: studentName,
            total_tests: 0,
            completed_tests: 0,
            average_score: 0,
            improvement_trend: 0,
            recent_tests: []
          });
        }

        const progress = progressMap.get(studentId)!;
        progress.total_tests++;
        
        if (attempt.completed_at) {
          progress.completed_tests++;
          progress.recent_tests.push({
            test_title: attempt.question_papers?.title || 'Unknown Test',
            score: attempt.score || 0,
            completed_at: attempt.completed_at,
            total_questions: attempt.total_questions || 0
          });
        }
      });

      // Calculate averages and trends
      const progressArray = Array.from(progressMap.values()).map(progress => {
        const scores = progress.recent_tests.map(test => test.score);
        progress.average_score = scores.length > 0 
          ? scores.reduce((sum, score) => sum + score, 0) / scores.length 
          : 0;

        // Calculate improvement trend (simple linear trend)
        if (scores.length >= 2) {
          const firstHalf = scores.slice(0, Math.floor(scores.length / 2));
          const secondHalf = scores.slice(Math.floor(scores.length / 2));
          const firstAvg = firstHalf.reduce((sum, score) => sum + score, 0) / firstHalf.length;
          const secondAvg = secondHalf.reduce((sum, score) => sum + score, 0) / secondHalf.length;
          progress.improvement_trend = secondAvg - firstAvg;
        }

        return progress;
      });

      setProgressData(progressArray);
    } catch (error: any) {
      console.error('Error in fetchProgressData:', error);
      toast({
        title: "Error",
        description: "Failed to fetch progress data",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const getStudentList = async () => {
    if (profile?.role !== 'teacher') return [];
    
    // Get students relationships
    const { data: relationships, error: relError } = await dbService.getProvider().query(
      'SELECT student_id FROM teacher_student_relationships WHERE teacher_id = ?',
      [profile.user_id]
    );

    if (relError || !relationships) return [];

    const studentIds = relationships.map((rel: any) => rel.student_id);
    
    let students: any[] = [];
    if (studentIds.length > 0) {
      const { data: studentsData, error: studentError } = await dbService.getProvider().query(
        `SELECT user_id, full_name FROM profiles WHERE user_id IN (${studentIds.map(() => '?').join(',')})`,
        studentIds
      );
      if (!studentError && studentsData) {
        students = studentsData;
      }
    }

    return students.map(student => ({
      student_id: student.user_id,
      profiles: student
    }));
  };

  const [studentList, setStudentList] = useState<any[]>([]);

  useEffect(() => {
    if (profile?.role === 'teacher') {
      getStudentList().then(setStudentList);
    }
  }, [profile]);

  const chartOptions = {
    responsive: true,
    plugins: {
      legend: {
        position: 'top' as const,
      },
      title: {
        display: true,
        text: 'Score Trends Over Time',
      },
    },
    scales: {
      y: {
        beginAtZero: true,
        max: 100,
      },
    },
  };

  const getChartData = () => {
    if (selectedStudent === 'all') {
      // Show average trends for all students
      const allDates = [...new Set(
        progressData.flatMap(student => 
          student.recent_tests.map(test => test.completed_at.split('T')[0])
        )
      )].sort();

      return {
        labels: allDates,
        datasets: [{
          label: 'Average Score',
          data: allDates.map(date => {
            const testsOnDate = progressData.flatMap(student =>
              student.recent_tests.filter(test => test.completed_at.startsWith(date))
            );
            return testsOnDate.length > 0
              ? testsOnDate.reduce((sum, test) => sum + test.score, 0) / testsOnDate.length
              : null;
          }),
          borderColor: 'hsl(var(--primary))',
          backgroundColor: 'hsl(var(--primary) / 0.1)',
          tension: 0.1,
        }]
      };
    } else {
      // Show individual student data
      const student = progressData.find(s => s.student_id === selectedStudent);
      if (!student) return { labels: [], datasets: [] };

      return {
        labels: student.recent_tests.map(test => test.test_title),
        datasets: [{
          label: 'Score',
          data: student.recent_tests.map(test => test.score),
          borderColor: 'hsl(var(--primary))',
          backgroundColor: 'hsl(var(--primary) / 0.1)',
          tension: 0.1,
        }]
      };
    }
  };

  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {[...Array(6)].map((_, i) => (
          <Card key={i} className="animate-pulse">
            <CardHeader className="space-y-2">
              <div className="h-4 bg-muted rounded w-3/4"></div>
              <div className="h-3 bg-muted rounded w-1/2"></div>
            </CardHeader>
            <CardContent>
              <div className="h-20 bg-muted rounded"></div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <Select value={timeframe} onValueChange={setTimeframe}>
          <SelectTrigger className="w-full sm:w-48">
            <SelectValue placeholder="Select timeframe" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Time</SelectItem>
            <SelectItem value="7">Last 7 days</SelectItem>
            <SelectItem value="30">Last 30 days</SelectItem>
            <SelectItem value="90">Last 3 months</SelectItem>
            <SelectItem value="365">Last year</SelectItem>
          </SelectContent>
        </Select>

        {profile?.role === 'teacher' && (
          <Select value={selectedStudent} onValueChange={setSelectedStudent}>
            <SelectTrigger className="w-full sm:w-48">
              <SelectValue placeholder="Select student" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Students</SelectItem>
              {studentList.map((student) => (
                <SelectItem key={student.student_id} value={student.student_id}>
                  {student.profiles?.full_name || 'Unknown'}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Students</CardTitle>
            <User className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{progressData.length}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg Completion Rate</CardTitle>
            <Target className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {progressData.length > 0
                ? Math.round(
                    progressData.reduce((sum, student) => 
                      sum + (student.total_tests > 0 ? student.completed_tests / student.total_tests : 0), 0
                    ) / progressData.length * 100
                  )
                : 0}%
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Average Score</CardTitle>
            <Trophy className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {progressData.length > 0
                ? Math.round(
                    progressData.reduce((sum, student) => sum + student.average_score, 0) / progressData.length
                  )
                : 0}%
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Tests</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {progressData.reduce((sum, student) => sum + student.total_tests, 0)}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Chart */}
      <Card>
        <CardHeader>
          <CardTitle>Performance Trends</CardTitle>
          <CardDescription>
            Score trends over the selected time period
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-80">
            <Line data={getChartData()} options={chartOptions} />
          </div>
        </CardContent>
      </Card>

      {/* Individual Progress Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {progressData.map((student) => (
          <Card key={student.student_id}>
            <CardHeader>
              <CardTitle className="text-lg">{student.student_name}</CardTitle>
              <CardDescription>
                {student.completed_tests}/{student.total_tests} tests completed
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Completion Rate</span>
                  <span>
                    {student.total_tests > 0 
                      ? Math.round(student.completed_tests / student.total_tests * 100)
                      : 0}%
                  </span>
                </div>
                <Progress 
                  value={student.total_tests > 0 ? (student.completed_tests / student.total_tests) * 100 : 0} 
                />
              </div>

              <div className="flex justify-between items-center">
                <span className="text-sm font-medium">Average Score</span>
                <Badge variant={student.average_score >= 70 ? "default" : "secondary"}>
                  {Math.round(student.average_score)}%
                </Badge>
              </div>

              {student.improvement_trend !== 0 && (
                <div className="flex items-center gap-2">
                  <TrendingUp className={`w-4 h-4 ${
                    student.improvement_trend > 0 ? 'text-success' : 'text-destructive'
                  }`} />
                  <span className={`text-sm ${
                    student.improvement_trend > 0 ? 'text-success' : 'text-destructive'
                  }`}>
                    {student.improvement_trend > 0 ? '+' : ''}
                    {Math.round(student.improvement_trend)}% trend
                  </span>
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
};