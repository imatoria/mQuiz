import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Bar, Line, Radar } from 'react-chartjs-2';
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
  RadialLinearScale,
} from 'chart.js';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { 
  Users, 
  TrendingUp, 
  TrendingDown, 
  BarChart3,
  PieChart,
  Target,
  Award,
  BookOpen,
  Clock
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
  Legend,
  RadialLinearScale
);

interface ComparisonData {
  student_id: string;
  student_name: string;
  total_tests: number;
  average_score: number;
  completion_rate: number;
  improvement_trend: number;
  subject_scores: Record<string, number>;
  time_efficiency: number;
}

interface ClassComparison {
  class_level: string;
  average_score: number;
  total_students: number;
  completion_rate: number;
  top_subjects: string[];
  weak_subjects: string[];
}

export const ComparativeAnalysis = () => {
  const [comparisonData, setComparisonData] = useState<ComparisonData[]>([]);
  const [classComparisons, setClassComparisons] = useState<ClassComparison[]>([]);
  const [selectedComparison, setSelectedComparison] = useState<'students' | 'classes' | 'subjects'>('students');
  const [timeframe, setTimeframe] = useState<string>('30');
  const [loading, setLoading] = useState(true);
  const { profile } = useAuth();
  const { toast } = useToast();

  useEffect(() => {
    fetchComparisonData();
  }, [selectedComparison, timeframe]);

  const fetchComparisonData = async () => {
    try {
      setLoading(true);
      
      const { data: attemptsData, error } = await supabase
        .from('paper_attempts')
        .select('*');

      if (error) throw error;

      const { data: papersData } = await supabase.from('question_papers').select('*');
      const { data: subjectsData } = await supabase.from('subjects').select('*');
      const { data: classesData } = await supabase.from('classes').select('*');

      const paperMap = new Map((papersData || []).map((p: any) => [p.id, p]));
      const subjMap = new Map((subjectsData || []).map((s: any) => [s.id, s.subject_name]));
      const classMap = new Map((classesData || []).map((c: any) => [c.id, c.class_name]));

      const attempts = (attemptsData || []).map((attempt: any) => {
        const paper = paperMap.get(attempt.paper_id) || {};
        const subjName = paper.subject_id ? subjMap.get(paper.subject_id) || 'General' : 'General';
        const className = paper.class_id ? classMap.get(paper.class_id) || 'Class 10' : 'Class 10';

        return {
          ...attempt,
          question_papers: {
            title: paper.title || 'Question Paper',
            user_id: paper.user_id || '',
            class_id: paper.class_id || '',
            subjects: { subject_name: subjName },
            classes: { class_name: className }
          }
        };
      });

      // Get user profiles separately
      const userIds = [...new Set(attempts?.map(attempt => attempt.user_id) || [])];
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('user_id, full_name')
        .in('user_id', userIds);

      if (profilesError) throw profilesError;

      const profileMap = profiles?.reduce((acc, profile) => {
        acc[profile.user_id] = profile;
        return acc;
      }, {} as Record<string, any>) || {};

      if (selectedComparison === 'students') {
        processStudentComparisons(attempts || [], profileMap);
      } else if (selectedComparison === 'classes') {
        processClassComparisons(attempts || [], profileMap);
      }

    } catch (error: any) {
      toast({
        title: "Error",
        description: "Failed to fetch comparison data",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const processStudentComparisons = (attempts: any[], profileMap: Record<string, any>) => {
    const studentMap = new Map<string, ComparisonData>();

    attempts.forEach((attempt: any) => {
      const studentId = attempt.user_id;
      const studentName = profileMap[studentId]?.full_name || 'Unknown Student';
      const subject = attempt.question_papers.subjects?.subject_name || 'Unknown';
      
      if (!studentMap.has(studentId)) {
        studentMap.set(studentId, {
          student_id: studentId,
          student_name: studentName,
          total_tests: 0,
          average_score: 0,
          completion_rate: 0,
          improvement_trend: 0,
          subject_scores: {},
          time_efficiency: 0
        });
      }

      const student = studentMap.get(studentId)!;
      student.total_tests++;
      
      if (attempt.completed_at) {
        const score = attempt.score || 0;
        const totalQuestions = attempt.total_questions || 1;
        const percentage = (score / totalQuestions) * 100;
        
        // Update subject scores
        if (!student.subject_scores[subject]) {
          student.subject_scores[subject] = 0;
        }
        student.subject_scores[subject] = 
          (student.subject_scores[subject] + percentage) / 2; // Simple average
        
        // Calculate time efficiency (questions per minute)
        if (attempt.started_at && attempt.completed_at) {
          const timeInMinutes = (new Date(attempt.completed_at).getTime() - 
                               new Date(attempt.started_at).getTime()) / 60000;
          student.time_efficiency += totalQuestions / timeInMinutes;
        }
      }
    });

    // Calculate final averages
    const studentsArray = Array.from(studentMap.values()).map(student => {
      const completedTests = attempts.filter(a => 
        a.user_id === student.student_id && a.completed_at
      );
      
      student.completion_rate = student.total_tests > 0 
        ? (completedTests.length / student.total_tests) * 100 
        : 0;
      
      student.average_score = completedTests.length > 0 
        ? completedTests.reduce((sum, attempt) => {
            const score = attempt.score || 0;
            const total = attempt.total_questions || 1;
            return sum + (score / total) * 100;
          }, 0) / completedTests.length
        : 0;
      
      student.time_efficiency = completedTests.length > 0 
        ? student.time_efficiency / completedTests.length 
        : 0;

      // Calculate improvement trend (last 3 vs first 3 tests)
      if (completedTests.length >= 6) {
        const sortedTests = completedTests.sort((a, b) => 
          new Date(a.completed_at).getTime() - new Date(b.completed_at).getTime()
        );
        const firstThree = sortedTests.slice(0, 3);
        const lastThree = sortedTests.slice(-3);
        
        const firstAvg = firstThree.reduce((sum, test) => 
          sum + ((test.score || 0) / (test.total_questions || 1)) * 100, 0
        ) / 3;
        
        const lastAvg = lastThree.reduce((sum, test) => 
          sum + ((test.score || 0) / (test.total_questions || 1)) * 100, 0
        ) / 3;
        
        student.improvement_trend = lastAvg - firstAvg;
      }

      return student;
    });

    setComparisonData(studentsArray);
  };

  const processClassComparisons = (attempts: any[], profileMap: Record<string, any>) => {
    const classMap = new Map<string, ClassComparison>();
    
    attempts.forEach((attempt: any) => {
      const classLevel = attempt.question_papers.classes?.class_name || 'Unknown';
      const subject = attempt.question_papers.subjects?.subject_name || 'Unknown';
      
      if (!classMap.has(classLevel)) {
        classMap.set(classLevel, {
          class_level: classLevel,
          average_score: 0,
          total_students: 0,
          completion_rate: 0,
          top_subjects: [],
          weak_subjects: []
        });
      }
    });

    // Process the data and set class comparisons
    setClassComparisons(Array.from(classMap.values()));
  };

  const getStudentComparisonChart = () => {
    const topStudents = comparisonData
      .sort((a, b) => b.average_score - a.average_score)
      .slice(0, 10);

    return {
      labels: topStudents.map(s => s.student_name.split(' ')[0]), // First name only
      datasets: [
        {
          label: 'Average Score (%)',
          data: topStudents.map(s => s.average_score),
          backgroundColor: 'hsl(var(--primary) / 0.8)',
          borderColor: 'hsl(var(--primary))',
          borderWidth: 1,
        },
        {
          label: 'Completion Rate (%)',
          data: topStudents.map(s => s.completion_rate),
          backgroundColor: 'hsl(var(--success) / 0.8)',
          borderColor: 'hsl(var(--success))',
          borderWidth: 1,
        }
      ]
    };
  };

  const getPerformanceTrendChart = () => {
    const studentsWithTrend = comparisonData
      .filter(s => s.improvement_trend !== 0)
      .sort((a, b) => b.improvement_trend - a.improvement_trend);

    return {
      labels: studentsWithTrend.map(s => s.student_name.split(' ')[0]),
      datasets: [{
        label: 'Improvement Trend (%)',
        data: studentsWithTrend.map(s => s.improvement_trend),
        backgroundColor: studentsWithTrend.map(s => 
          s.improvement_trend > 0 
            ? 'hsl(var(--success) / 0.8)' 
            : 'hsl(var(--destructive) / 0.8)'
        ),
        borderColor: studentsWithTrend.map(s => 
          s.improvement_trend > 0 
            ? 'hsl(var(--success))' 
            : 'hsl(var(--destructive))'
        ),
        borderWidth: 1,
      }]
    };
  };

  const chartOptions = {
    responsive: true,
    plugins: {
      legend: {
        position: 'top' as const,
      },
    },
    scales: {
      y: {
        beginAtZero: true,
        max: 100,
      },
    },
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
      {/* Controls */}
      <div className="flex flex-col sm:flex-row gap-4">
        <Select value={selectedComparison} onValueChange={(value: any) => setSelectedComparison(value)}>
          <SelectTrigger className="w-full sm:w-48">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="students">Compare Students</SelectItem>
            <SelectItem value="classes">Compare Classes</SelectItem>
            <SelectItem value="subjects">Compare Subjects</SelectItem>
          </SelectContent>
        </Select>

        <Select value={timeframe} onValueChange={setTimeframe}>
          <SelectTrigger className="w-full sm:w-48">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="7">Last 7 days</SelectItem>
            <SelectItem value="30">Last 30 days</SelectItem>
            <SelectItem value="90">Last 3 months</SelectItem>
            <SelectItem value="365">Last year</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {selectedComparison === 'students' && (
        <Tabs defaultValue="overview" className="w-full">
          <TabsList className="w-full">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="performance">Performance</TabsTrigger>
            <TabsTrigger value="trends">Trends</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6">
            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Top Performer</CardTitle>
                  <Award className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  {comparisonData.length > 0 && (
                    <div>
                      <div className="text-lg font-bold">
                        {comparisonData.sort((a, b) => b.average_score - a.average_score)[0]?.student_name}
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {Math.round(comparisonData.sort((a, b) => b.average_score - a.average_score)[0]?.average_score || 0)}% avg
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Most Improved</CardTitle>
                  <TrendingUp className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  {comparisonData.length > 0 && (
                    <div>
                      <div className="text-lg font-bold">
                        {comparisonData.sort((a, b) => b.improvement_trend - a.improvement_trend)[0]?.student_name}
                      </div>
                      <p className="text-xs text-muted-foreground">
                        +{Math.round(comparisonData.sort((a, b) => b.improvement_trend - a.improvement_trend)[0]?.improvement_trend || 0)}% trend
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Class Average</CardTitle>
                  <BarChart3 className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {comparisonData.length > 0 
                      ? Math.round(comparisonData.reduce((sum, s) => sum + s.average_score, 0) / comparisonData.length)
                      : 0}%
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {comparisonData.length} students
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Completion Rate</CardTitle>
                  <Target className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {comparisonData.length > 0 
                      ? Math.round(comparisonData.reduce((sum, s) => sum + s.completion_rate, 0) / comparisonData.length)
                      : 0}%
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Average completion
                  </p>
                </CardContent>
              </Card>
            </div>

            {/* Student Comparison Chart */}
            <Card>
              <CardHeader>
                <CardTitle>Student Performance Comparison</CardTitle>
                <CardDescription>
                  Top performing students by average score and completion rate
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-80">
                  <Bar data={getStudentComparisonChart()} options={chartOptions} />
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="performance" className="space-y-6">
            {/* Individual Student Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {comparisonData.map((student, index) => (
                <Card key={student.student_id}>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-lg">{student.student_name}</CardTitle>
                      <Badge variant={index < 3 ? "default" : "secondary"}>
                        #{index + 1}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span>Average Score</span>
                        <span>{Math.round(student.average_score)}%</span>
                      </div>
                      <Progress value={student.average_score} />
                    </div>

                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span>Completion Rate</span>
                        <span>{Math.round(student.completion_rate)}%</span>
                      </div>
                      <Progress value={student.completion_rate} />
                    </div>

                    <div className="flex justify-between items-center">
                      <span className="text-sm">Tests Taken</span>
                      <Badge variant="outline">{student.total_tests}</Badge>
                    </div>

                    {student.improvement_trend !== 0 && (
                      <div className="flex items-center gap-2">
                        {student.improvement_trend > 0 ? (
                          <TrendingUp className="w-4 h-4 text-success" />
                        ) : (
                          <TrendingDown className="w-4 h-4 text-destructive" />
                        )}
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
          </TabsContent>

          <TabsContent value="trends" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Improvement Trends</CardTitle>
                <CardDescription>
                  Student improvement over time (comparing recent vs earlier performance)
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-80">
                  <Bar data={getPerformanceTrendChart()} options={chartOptions} />
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      )}

      {selectedComparison === 'classes' && (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <BarChart3 className="w-12 h-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">Class Comparison Coming Soon</h3>
            <p className="text-muted-foreground text-center">
              Class-level comparative analysis will be available in the next update
            </p>
          </CardContent>
        </Card>
      )}

      {selectedComparison === 'subjects' && (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <BookOpen className="w-12 h-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">Subject Comparison Coming Soon</h3>
            <p className="text-muted-foreground text-center">
              Subject-wise comparative analysis will be available in the next update
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
};