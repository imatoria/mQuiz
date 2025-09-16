import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { Users, Award, TrendingUp, BarChart3 } from 'lucide-react';

interface StudentPerformance {
  student_id: string;
  student_name: string;
  student_email: string;
  test_count: number;
  average_score: number;
  latest_score: number;
  grade: string;
  improvement: number;
}

interface GradeDistribution {
  grade: string;
  count: number;
  percentage: number;
}

interface TestStats {
  test_id: string;
  test_title: string;
  subject: string;
  total_attempts: number;
  average_score: number;
  highest_score: number;
  lowest_score: number;
  completion_rate: number;
}

const GRADE_COLORS = {
  'A+': '#10B981',
  'A': '#059669',
  'B+': '#3B82F6',
  'B': '#2563EB',
  'C+': '#F59E0B',
  'C': '#D97706',
  'D+': '#EF4444',
  'D': '#DC2626',
  'F': '#991B1B'
};

export const GradeDistribution = () => {
  const [studentPerformance, setStudentPerformance] = useState<StudentPerformance[]>([]);
  const [gradeDistribution, setGradeDistribution] = useState<GradeDistribution[]>([]);
  const [testStats, setTestStats] = useState<TestStats[]>([]);
  const [selectedTest, setSelectedTest] = useState<string>('all');
  const [loading, setLoading] = useState(true);
  const { user, profile } = useAuth();
  const { toast } = useToast();

  useEffect(() => {
    if (profile?.role === 'parent') {
      loadClassPerformance();
    }
  }, [profile, selectedTest]);

  const getGrade = (score: number): string => {
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

  const loadClassPerformance = async () => {
    try {
      setLoading(true);

      // Get children of the current parent
      const { data: children, error: childrenError } = await supabase
        .from('parent_child_relationships')
        .select(`
          child_id,
          profiles!child_id (
            user_id,
            full_name,
            email
          )
        `)
        .eq('parent_id', user?.id);

      if (childrenError) throw childrenError;

      const childIds = children?.map(c => c.child_id) || [];

      if (childIds.length === 0) {
        setStudentPerformance([]);
        setGradeDistribution([]);
        setTestStats([]);
        setLoading(false);
        return;
      }

      // Get test attempts for all children
      let query = supabase
        .from('paper_attempts')
        .select(`
          user_id,
          score,
          completed_at,
          question_papers!inner (
            id,
            title,
            subjects (name)
          )
        `)
        .in('user_id', childIds)
        .not('completed_at', 'is', null);

      if (selectedTest !== 'all') {
        query = query.eq('paper_id', selectedTest);
      }

      const { data: attempts, error: attemptsError } = await query;
      if (attemptsError) throw attemptsError;

      // Process student performance data
      const studentMap = new Map<string, {
        name: string;
        email: string;
        scores: number[];
        tests: number;
      }>();

      children?.forEach(child => {
        if (child.profiles && child.profiles !== null && typeof child.profiles === 'object' && !Array.isArray(child.profiles) && 'full_name' in child.profiles) {
          const profile = child.profiles as any;
          studentMap.set(child.child_id, {
            name: profile.full_name || 'Unknown',
            email: profile.email || '',
            scores: [],
            tests: 0
          });
        }
      });

      attempts?.forEach(attempt => {
        const student = studentMap.get(attempt.user_id);
        if (student) {
          student.scores.push(attempt.score);
          student.tests++;
        }
      });

      const performance: StudentPerformance[] = Array.from(studentMap.entries()).map(([id, data]) => {
        const average = data.scores.length > 0 
          ? data.scores.reduce((sum, score) => sum + score, 0) / data.scores.length 
          : 0;
        const latest = data.scores.length > 0 ? data.scores[data.scores.length - 1] : 0;
        
        // Calculate improvement (compare last half vs first half)
        const midpoint = Math.floor(data.scores.length / 2);
        const firstHalf = data.scores.slice(0, midpoint);
        const secondHalf = data.scores.slice(midpoint);
        
        const firstAvg = firstHalf.length > 0 ? firstHalf.reduce((sum, s) => sum + s, 0) / firstHalf.length : 0;
        const secondAvg = secondHalf.length > 0 ? secondHalf.reduce((sum, s) => sum + s, 0) / secondHalf.length : 0;
        const improvement = secondAvg - firstAvg;

        return {
          student_id: id,
          student_name: data.name,
          student_email: data.email,
          test_count: data.tests,
          average_score: Math.round(average),
          latest_score: latest,
          grade: getGrade(average),
          improvement: Math.round(improvement)
        };
      });

      setStudentPerformance(performance);

      // Calculate grade distribution
      const gradeMap = new Map<string, number>();
      performance.forEach(student => {
        const grade = student.grade;
        gradeMap.set(grade, (gradeMap.get(grade) || 0) + 1);
      });

      const distribution: GradeDistribution[] = Array.from(gradeMap.entries()).map(([grade, count]) => ({
        grade,
        count,
        percentage: Math.round((count / performance.length) * 100)
      }));

      setGradeDistribution(distribution);

      // Load test statistics - temporarily disabled due to type issues
      const tests: any[] = [];
      const testStatsData: TestStats[] = [];
      
      for (const test of tests || []) {
        const { data: testAttempts, error } = await supabase
          .from('paper_attempts')
          .select('score, user_id')
          .eq('paper_id', test.id)
          .not('completed_at', 'is', null);

        if (!error && testAttempts) {
          const scores = testAttempts.map(a => a.score);
          const uniqueStudents = new Set(testAttempts.map(a => a.user_id)).size;
          
          testStatsData.push({
            test_id: test.id,
            test_title: test.title,
            subject: 'Subject',
            total_attempts: testAttempts.length,
            average_score: scores.length > 0 ? Math.round(scores.reduce((sum, s) => sum + s, 0) / scores.length) : 0,
            highest_score: scores.length > 0 ? Math.max(...scores) : 0,
            lowest_score: scores.length > 0 ? Math.min(...scores) : 0,
            completion_rate: childIds.length > 0 ? Math.round((uniqueStudents / childIds.length) * 100) : 0
          });
        }
      }

      setTestStats(testStatsData);

    } catch (error) {
      console.error('Error loading class performance:', error);
      toast({
        title: "Error",
        description: "Failed to load class performance data",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  if (profile?.role !== 'parent') {
    return (
      <Card>
        <CardContent className="pt-6 text-center">
          <p className="text-muted-foreground">
            Grade distribution is only available for parents/teachers.
          </p>
        </CardContent>
      </Card>
    );
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-muted rounded w-1/3"></div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {[1, 2].map(i => (
              <div key={i} className="h-64 bg-muted rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Class Performance</h2>
          <p className="text-muted-foreground">Grade distribution and student performance</p>
        </div>
        <Select value={selectedTest} onValueChange={setSelectedTest}>
          <SelectTrigger className="w-48">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Tests</SelectItem>
            {testStats.map(test => (
              <SelectItem key={test.test_id} value={test.test_id}>
                {test.test_title}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Overview Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Students</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{studentPerformance.length}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Class Average</CardTitle>
            <BarChart3 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {studentPerformance.length > 0 
                ? Math.round(studentPerformance.reduce((sum, s) => sum + s.average_score, 0) / studentPerformance.length)
                : 0}%
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Top Grade</CardTitle>
            <Award className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {gradeDistribution.length > 0 ? gradeDistribution[0]?.grade || 'N/A' : 'N/A'}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Improving Students</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {studentPerformance.filter(s => s.improvement > 0).length}
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Grade Distribution Chart */}
        <Card>
          <CardHeader>
            <CardTitle>Grade Distribution</CardTitle>
            <CardDescription>Student grades breakdown</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={gradeDistribution}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ grade, percentage }) => `${grade}: ${percentage}%`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="count"
                >
                  {gradeDistribution.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={GRADE_COLORS[entry.grade as keyof typeof GRADE_COLORS]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Performance Distribution */}
        <Card>
          <CardHeader>
            <CardTitle>Score Distribution</CardTitle>
            <CardDescription>Number of students by grade</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={gradeDistribution}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="grade" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="count" fill="hsl(var(--primary))" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Student Performance Table */}
      <Card>
        <CardHeader>
          <CardTitle>Student Performance</CardTitle>
          <CardDescription>Individual student results and progress</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Student</TableHead>
                <TableHead>Tests Taken</TableHead>
                <TableHead>Average Score</TableHead>
                <TableHead>Latest Score</TableHead>
                <TableHead>Grade</TableHead>
                <TableHead>Improvement</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {studentPerformance.map((student) => (
                <TableRow key={student.student_id}>
                  <TableCell>
                    <div>
                      <div className="font-medium">{student.student_name}</div>
                      <div className="text-sm text-muted-foreground">{student.student_email}</div>
                    </div>
                  </TableCell>
                  <TableCell>{student.test_count}</TableCell>
                  <TableCell>{student.average_score}%</TableCell>
                  <TableCell>{student.latest_score}%</TableCell>
                  <TableCell>
                    <Badge 
                      style={{ 
                        backgroundColor: GRADE_COLORS[student.grade as keyof typeof GRADE_COLORS],
                        color: 'white'
                      }}
                    >
                      {student.grade}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className={`flex items-center ${
                      student.improvement > 0 ? 'text-green-600' : 
                      student.improvement < 0 ? 'text-red-600' : 
                      'text-muted-foreground'
                    }`}>
                      {student.improvement > 0 && '+'}
                      {student.improvement}%
                      {student.improvement > 0 && <TrendingUp className="w-3 h-3 ml-1" />}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>

          {studentPerformance.length === 0 && (
            <div className="text-center py-8">
              <Users className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">No Student Data</h3>
              <p className="text-muted-foreground">
                No test results found for your students.
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};