import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { LoadingState } from '@/components/ui/loading-state';
import { ErrorState } from '@/components/ui/error-state';
import { useToast } from '@/hooks/use-toast';
import { useAsyncOperation } from '@/hooks/useAsyncOperation';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { TestInterface } from './TestInterface';
import { TestResults } from '@/components/results/TestResults';
import { PerformanceAnalytics } from '@/components/results/PerformanceAnalytics';
import { 
  PlayCircle, 
  CheckCircle2, 
  Trophy, 
  Clock,
  AlertCircle,
  Calendar,
  BarChart3,
  Award
} from 'lucide-react';

interface ScheduledTest {
  id: string;
  title: string;
  start_time: string;
  end_time: string;
  max_attempts: number;
  question_papers: {
    title: string;
    total_questions: number;
    time_limit_minutes: number;
    subjects: { name: string };
  };
  test_attempts: TestAttempt[];
}

interface TestAttempt {
  id: string;
  attempt_number: number;
  score: number | null;
  completed_at: string | null;
}

export const StudentDashboard = () => {
  const [availableTests, setAvailableTests] = useState<ScheduledTest[]>([]);
  const [completedTests, setCompletedTests] = useState<ScheduledTest[]>([]);
  const [currentTest, setCurrentTest] = useState<ScheduledTest | null>(null);
  const [activeTab, setActiveTab] = useState('tests');
  const { user } = useAuth();
  const { toast } = useToast();
  
  const { loading, error, execute: executeAsync } = useAsyncOperation({
    onError: (error) => console.error('Student dashboard error:', error)
  });

  useEffect(() => {
    if (user) {
      fetchTests();
    }
  }, [user]);

  const fetchTests = async () => {
    return executeAsync(async () => {
      // Fetch scheduled tests - first get all tests assigned to all users
      const { data: allUserTests, error: allUserError } = await supabase
        .from('scheduled_tests')
        .select(`
          *,
          question_papers (
            title,
            total_questions,
            time_limit_minutes,
            subjects (name)
          ),
          test_attempts (
            id,
            attempt_number,
            score,
            completed_at
          )
        `)
        .eq('assign_to_all', true)
        .order('start_time', { ascending: true });

      if (allUserError) throw allUserError;

      // Then get tests specifically assigned to this user
      const { data: assignedTests, error: assignedError } = await supabase
        .from('scheduled_tests')
        .select(`
          *,
          question_papers (
            title,
            total_questions,
            time_limit_minutes,
            subjects (name)
          ),
          test_attempts (
            id,
            attempt_number,
            score,
            completed_at
          ),
          test_assignments!inner (
            assigned_to_user_id
          )
        `)
        .eq('test_assignments.assigned_to_user_id', user?.id)
        .eq('assign_to_all', false)
        .order('start_time', { ascending: true });

      if (assignedError) throw assignedError;

      // Combine and deduplicate results
      const allTests = [...(allUserTests || []), ...(assignedTests || [])];
      const uniqueTests = allTests.filter((test, index, self) => 
        index === self.findIndex(t => t.id === test.id)
      );
      
      const scheduledTests = uniqueTests;

      if (error) throw error;

      const now = new Date();
      const available: ScheduledTest[] = [];
      const completed: ScheduledTest[] = [];

      scheduledTests?.forEach((test) => {
        const testStart = new Date(test.start_time);
        const testEnd = new Date(test.end_time);
        const hasAttempted = test.test_attempts?.length > 0;
        const hasCompletedAttempt = test.test_attempts?.some(attempt => attempt.completed_at);
        
        if (hasCompletedAttempt || testEnd < now) {
          completed.push(test);
        } else if (testStart <= now && testEnd >= now && (!hasAttempted || test.test_attempts.length < test.max_attempts)) {
          available.push(test);
        }
      });

      setAvailableTests(available);
      setCompletedTests(completed);
    });
  };

  const startTest = (test: ScheduledTest) => {
    setCurrentTest(test);
  };

  const handleTestComplete = () => {
    setCurrentTest(null);
    fetchTests(); // Refresh to update completed tests
  };

  const formatDateTime = (dateString: string) => {
    return new Date(dateString).toLocaleString();
  };

  const getTestStatus = (test: ScheduledTest) => {
    const now = new Date();
    const testStart = new Date(test.start_time);
    const testEnd = new Date(test.end_time);
    
    if (testEnd < now) return 'expired';
    if (testStart > now) return 'scheduled';
    return 'active';
  };

  const getDifficultyBadge = (questionCount: number) => {
    if (questionCount <= 10) return { variant: "secondary" as const, label: "Easy" };
    if (questionCount <= 20) return { variant: "outline" as const, label: "Medium" };
    return { variant: "destructive" as const, label: "Hard" };
  };

  if (currentTest) {
    return <TestInterface test={currentTest} onComplete={handleTestComplete} />;
  }

  if (error) {
    return (
      <ErrorState 
        error={error}
        type="generic"
        onRetry={fetchTests}
        onGoHome={() => window.location.href = '/'}
      />
    );
  }

  return (
    <div className="space-y-6">
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-3 gap-1">
          <TabsTrigger value="tests" className="flex items-center gap-1 text-xs sm:text-sm px-2 sm:px-3">
            <PlayCircle className="w-3 h-3 sm:w-4 sm:h-4" />
            <span>Tests</span>
          </TabsTrigger>
          <TabsTrigger value="results" className="flex items-center gap-1 text-xs sm:text-sm px-2 sm:px-3">
            <Award className="w-3 h-3 sm:w-4 sm:h-4" />
            <span>Results</span>
          </TabsTrigger>
          <TabsTrigger value="analytics" className="flex items-center gap-1 text-xs sm:text-sm px-2 sm:px-3">
            <BarChart3 className="w-3 h-3 sm:w-4 sm:h-4" />
            <span className="hidden sm:inline">Analytics</span>
            <span className="sm:hidden">Stats</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="tests" className="space-y-6">
          {/* Stats Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Tests Available</CardTitle>
            <PlayCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{availableTests.length}</div>
            <p className="text-xs text-muted-foreground">Ready to attempt</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Completed</CardTitle>
            <CheckCircle2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{completedTests.length}</div>
            <p className="text-xs text-muted-foreground">Tests taken</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Average Score</CardTitle>
            <Trophy className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {completedTests.length > 0 
                ? Math.round(completedTests.reduce((sum, test) => {
                    const lastAttempt = test.test_attempts[test.test_attempts.length - 1];
                    return sum + (lastAttempt?.score || 0);
                  }, 0) / completedTests.length) + '%'
                : 'N/A'
              }
            </div>
            <p className="text-xs text-muted-foreground">Overall performance</p>
          </CardContent>
        </Card>
      </div>

      {/* Available Tests */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <PlayCircle className="w-5 h-5 mr-2" />
            Available Tests
          </CardTitle>
          <CardDescription>
            Tests ready for you to attempt
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <LoadingState text="Loading tests..." />
          ) : availableTests.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Calendar className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>No tests available at the moment</p>
            </div>
          ) : (
            <div className="space-y-4">
              {availableTests.map((test) => {
                const difficulty = getDifficultyBadge(test.question_papers.total_questions);
                const status = getTestStatus(test);
                const attemptsLeft = test.max_attempts - (test.test_attempts?.length || 0);
                
                return (
                  <div key={test.id} className="flex flex-col sm:flex-row sm:items-center sm:justify-between p-4 border rounded-lg hover:shadow-md transition-shadow space-y-3 sm:space-y-0">
                    <div className="flex-1 min-w-0">
                      <h4 className="font-medium truncate pr-2">{test.title}</h4>
                      <p className="text-sm text-muted-foreground truncate">
                        {test.question_papers.subjects.name} • {test.question_papers.total_questions} questions • {test.question_papers.time_limit_minutes} min
                      </p>
                      <div className="flex flex-wrap items-center mt-2 gap-2">
                        <Badge variant={difficulty.variant} className="text-xs">{difficulty.label}</Badge>
                        <span className="text-xs text-muted-foreground flex items-center">
                          <Clock className="w-3 h-3 mr-1 flex-shrink-0" />
                          <span className="truncate">Due: {formatDateTime(test.end_time)}</span>
                        </span>
                        {attemptsLeft < test.max_attempts && (
                          <span className="text-xs text-muted-foreground whitespace-nowrap">
                            Attempts: {attemptsLeft}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex-shrink-0 w-full sm:w-auto">
                      <Button 
                        onClick={() => startTest(test)}
                        disabled={status !== 'active' || attemptsLeft === 0}
                        className={cn(
                          'w-full sm:w-auto',
                          status === 'active' ? 'bg-quiz hover:bg-quiz/90' : ''
                        )}
                        size="sm"
                      >
                        {status === 'active' ? 'Start Test' : 
                         status === 'scheduled' ? 'Not Available' : 'Expired'}
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Recent Results */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Results</CardTitle>
          <CardDescription>Your latest test performances</CardDescription>
        </CardHeader>
        <CardContent>
          {completedTests.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Trophy className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>No completed tests yet</p>
            </div>
          ) : (
            <div className="space-y-4">
              {completedTests.slice(0, 5).map((test) => {
                const lastAttempt = test.test_attempts[test.test_attempts.length - 1];
                const score = lastAttempt?.score || 0;
                const scoreColor = score >= 80 ? 'text-success' : score >= 60 ? 'text-warning' : 'text-destructive';
                const scoreBadge = score >= 80 ? 'Excellent' : score >= 60 ? 'Good' : 'Needs Improvement';
                
                return (
                  <div key={test.id} className="flex flex-col sm:flex-row sm:items-center sm:justify-between p-3 bg-muted rounded-lg space-y-2 sm:space-y-0">
                    <div className="min-w-0 flex-1">
                      <h4 className="text-sm font-medium truncate pr-2">{test.title}</h4>
                      <p className="text-xs text-muted-foreground truncate">
                        Completed {lastAttempt?.completed_at ? new Date(lastAttempt.completed_at).toLocaleDateString() : 'N/A'}
                      </p>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <div className={`text-lg font-bold ${scoreColor}`}>{score}%</div>
                      <Badge variant={score >= 80 ? 'default' : 'outline'} className="text-xs mt-1">
                        {scoreBadge}
                      </Badge>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
        </TabsContent>

        <TabsContent value="results" className="mt-6">
          <TestResults />
        </TabsContent>

        <TabsContent value="analytics" className="mt-6">
          <PerformanceAnalytics />
        </TabsContent>
      </Tabs>
    </div>
  );
};