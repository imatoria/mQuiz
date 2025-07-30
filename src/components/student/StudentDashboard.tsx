import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { TestInterface } from './TestInterface';
import { 
  PlayCircle, 
  CheckCircle2, 
  Trophy, 
  Clock,
  AlertCircle,
  Calendar
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
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();
  const { toast } = useToast();

  useEffect(() => {
    if (user) {
      fetchTests();
    }
  }, [user]);

  const fetchTests = async () => {
    try {
      setLoading(true);
      
      // Fetch scheduled tests with question paper details
      const { data: scheduledTests, error } = await supabase
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
        .or(`assign_to_all.eq.true,test_assignments.assigned_to_user_id.eq.${user?.id}`)
        .order('start_time', { ascending: true });

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
    } catch (error) {
      console.error('Error fetching tests:', error);
      toast({
        title: "Error",
        description: "Failed to fetch tests",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
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

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
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
            <div className="text-center py-4">Loading tests...</div>
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
                  <div key={test.id} className="flex items-center justify-between p-4 border rounded-lg hover:shadow-md transition-shadow">
                    <div className="flex-1">
                      <h4 className="font-medium">{test.title}</h4>
                      <p className="text-sm text-muted-foreground">
                        {test.question_papers.subjects.name} • {test.question_papers.total_questions} questions • {test.question_papers.time_limit_minutes} minutes
                      </p>
                      <div className="flex items-center mt-2 space-x-4">
                        <Badge variant={difficulty.variant}>{difficulty.label}</Badge>
                        <span className="text-xs text-muted-foreground flex items-center">
                          <Clock className="w-3 h-3 mr-1" />
                          Due: {formatDateTime(test.end_time)}
                        </span>
                        {attemptsLeft < test.max_attempts && (
                          <span className="text-xs text-muted-foreground">
                            Attempts left: {attemptsLeft}
                          </span>
                        )}
                      </div>
                    </div>
                    <Button 
                      onClick={() => startTest(test)}
                      disabled={status !== 'active' || attemptsLeft === 0}
                      className={status === 'active' ? 'bg-quiz hover:bg-quiz/90' : ''}
                    >
                      {status === 'active' ? 'Start Test' : 
                       status === 'scheduled' ? 'Not Available' : 'Expired'}
                    </Button>
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
                  <div key={test.id} className="flex items-center justify-between p-3 bg-muted rounded-lg">
                    <div>
                      <h4 className="text-sm font-medium">{test.title}</h4>
                      <p className="text-xs text-muted-foreground">
                        Completed {lastAttempt?.completed_at ? new Date(lastAttempt.completed_at).toLocaleDateString() : 'N/A'}
                      </p>
                    </div>
                    <div className="text-right">
                      <div className={`text-lg font-bold ${scoreColor}`}>{score}%</div>
                      <Badge variant={score >= 80 ? 'default' : 'outline'} className="text-xs">
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
    </div>
  );
};