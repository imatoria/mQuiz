import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { Sidebar, SidebarContent, SidebarGroup, SidebarGroupContent, SidebarMenu, SidebarMenuItem, SidebarMenuButton, SidebarInset } from '@/components/ui/sidebar';
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
import { PreTestWarningModal } from './PreTestWarningModal';
import { SiteLogo } from '@/components/ui/site-logo';
import { 
  PlayCircle, 
  CheckCircle2, 
  Trophy, 
  Clock,
  AlertCircle,
  Calendar,
  BarChart3,
  Award,
  Pause,
  Timer,
  User
} from 'lucide-react';

interface ScheduledTest {
  id: string;
  title: string;
  start_time: string;
  end_time: string;
  max_attempts: number;
  question_paper_id: string;
  time_limit_hours?: number;
  time_limit_minutes?: number;
  question_papers: {
    id?: string;
    title: string;
    total_questions: number;
    time_limit_minutes: number;
    subjects: { name: string };
  } | null;
  test_attempts: TestAttempt[];
}

interface TestAttempt {
  id: string;
  attempt_number: number;
  score: number | null;
  completed_at: string | null;
  started_at: string;
  current_question_index?: number;
  total_questions?: number;
  time_remaining?: number;
  answers?: any;
  progress_percentage?: number;
}

interface StudentDashboardProps {
  onActiveTabChange?: (tabName: string, tabIcon: any) => void;
}

export const StudentDashboard = ({ onActiveTabChange }: StudentDashboardProps) => {
  const [availableTests, setAvailableTests] = useState<ScheduledTest[]>([]);
  const [completedTests, setCompletedTests] = useState<ScheduledTest[]>([]);
  const [activeTests, setActiveTests] = useState<ScheduledTest[]>([]);
  const [currentTest, setCurrentTest] = useState<ScheduledTest | null>(null);
  const [activeTab, setActiveTab] = useState('tests');
  const [showPreTestModal, setShowPreTestModal] = useState(false);
  const [selectedTest, setSelectedTest] = useState<ScheduledTest | null>(null);
  const [testDisplayMode, setTestDisplayMode] = useState<'single' | 'all'>('single');
  const [currentTime, setCurrentTime] = useState(new Date());
  const { user } = useAuth();
  const { toast } = useToast();
  
  const menuItems = [
    { value: 'tests', label: 'Tests', icon: PlayCircle },
    { value: 'results', label: 'Results', icon: Award },
    { value: 'analytics', label: 'Analytics', icon: BarChart3 },
  ];
  const activeItem = menuItems.find((i) => i.value === activeTab);
  
  // Notify initial tab on mount
  React.useEffect(() => {
    const initialItem = menuItems.find(i => i.value === 'tests');
    if (initialItem) {
      onActiveTabChange?.(initialItem.label, initialItem.icon);
    }
  }, [onActiveTabChange]);
  
  const { loading, error, execute: executeAsync } = useAsyncOperation({
    onError: (error) => console.error('Student dashboard error:', error)
  });

  useEffect(() => {
    if (user) {
      fetchTests();
    }
  }, [user]);

  // Update current time every second for countdown timers
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const fetchTests = async () => {
    return executeAsync(async () => {
      console.log('Fetching tests for user:', user?.id);
      
      // Get current user info
      const { data: { user: authUser } } = await supabase.auth.getUser();
      if (!authUser) {
        throw new Error('User not authenticated');
      }

      // Fetch all scheduled tests that the current user can view
      const { data: scheduledTests, error } = await supabase
        .from('scheduled_tests')
        .select(`
          *,
          question_papers!inner (
            id,
            title,
            total_questions,
            time_limit_minutes,
            subjects!inner (name)
          ),
          test_attempts (
            id,
            attempt_number,
            score,
            completed_at,
            started_at,
            user_id
          )
        `)
        .order('start_time', { ascending: true });

      if (error) {
        console.error('Error fetching tests:', error);
        throw error;
      }

      console.log('Raw scheduled tests:', scheduledTests);

      // Filter test attempts to only include current user's attempts
      const testsWithUserAttempts = scheduledTests?.map(test => ({
        ...test,
        test_attempts: test.test_attempts?.filter(attempt => attempt.user_id === authUser.id) || []
      })) || [];

      console.log('Filtered tests with user attempts:', testsWithUserAttempts);

      const now = new Date();
      const available: ScheduledTest[] = [];
      const completed: ScheduledTest[] = [];
      const active: ScheduledTest[] = [];

      // Function to check if a test attempt has exceeded its time limit
      const isAttemptTimeExpired = (attempt: TestAttempt, timeLimitMinutes: number) => {
        const attemptStart = new Date(attempt.started_at);
        const timeLimitMs = timeLimitMinutes * 60 * 1000;
        const attemptEndTime = new Date(attemptStart.getTime() + timeLimitMs);
        return now > attemptEndTime;
      };

      // Process tests and handle expired attempts
      const expiredAttemptData: Array<{ attemptId: string; scheduledTestId: string }> = [];

      testsWithUserAttempts.forEach((test) => {
        const testStart = new Date(test.start_time);
        const testEnd = new Date(test.end_time);
        const timeLimitMinutes = test.question_papers?.time_limit_minutes || 60;
        
        // Check for in-progress attempts and validate time limits
        const inProgressAttempts = test.test_attempts?.filter(attempt => !attempt.completed_at) || [];
        const validActiveAttempts = inProgressAttempts.filter(attempt => {
          const isExpired = isAttemptTimeExpired(attempt, timeLimitMinutes);
          if (isExpired) {
            expiredAttemptData.push({ attemptId: attempt.id, scheduledTestId: test.id });
            console.log(`Test attempt ${attempt.id} has exceeded time limit and will be auto-submitted`);
          }
          return !isExpired;
        });

        const hasValidInProgressAttempt = validActiveAttempts.length > 0;
        const completedAttempts = test.test_attempts?.filter(attempt => attempt.completed_at) || [];
        const hasCompletedAttempt = completedAttempts.length > 0;
        const totalAttempts = test.test_attempts?.length || 0;
        const hasRemainingAttempts = totalAttempts < test.max_attempts;
        
        if (hasValidInProgressAttempt) {
          active.push(test);
        } else if (testEnd < now || (hasCompletedAttempt && !hasRemainingAttempts)) {
          // Test expired OR all attempts used (and at least one completed)
          completed.push(test);
        } else if (testStart <= now && testEnd >= now && hasRemainingAttempts) {
          // Test is currently active and student has remaining attempts
          available.push(test);
        } else if (testStart > now) {
          // Future tests go to available with appropriate status
          available.push(test);
        }
      });

      // Auto-submit expired attempts
      if (expiredAttemptData.length > 0) {
        console.log('Auto-submitting expired attempts:', expiredAttemptData);
        
        for (const { attemptId, scheduledTestId } of expiredAttemptData) {
          try {
            const { error: submitError } = await supabase.functions.invoke('complete-test', {
              body: {
                testAttemptId: attemptId,
                completionType: 'auto',
                completionReason: 'time_expired',
                answers: {},
                flaggedQuestions: [],
                currentQuestionIndex: 0,
                progressPercentage: 0,
                timeRemaining: 0,
                scheduledTestId: scheduledTestId
              }
            });
            
            if (submitError) {
              console.error(`Failed to auto-submit attempt ${attemptId}:`, submitError);
            } else {
              console.log(`Successfully auto-submitted expired attempt ${attemptId}`);
            }
          } catch (error) {
            console.error(`Error auto-submitting attempt ${attemptId}:`, error);
          }
        }

        // Show notification to user about expired attempts
        if (expiredAttemptData.length > 0) {
          toast({
            title: "Test Attempts Expired",
            description: `${expiredAttemptData.length} test attempt(s) have been automatically submitted due to time limit expiration.`,
            variant: "destructive"
          });
        }

        // Re-fetch tests to get updated state after auto-submission
        // Use a flag to prevent multiple concurrent fetches
        setTimeout(() => {
          if (document.hasFocus()) {
            fetchTests();
          }
        }, 1000);
        
        return; // Exit early to avoid setting stale data
      }

      setAvailableTests(available);
      setCompletedTests(completed);
      setActiveTests(active);
    });
  };

  const startTest = (test: ScheduledTest) => {
    setSelectedTest(test);
    setShowPreTestModal(true);
  };

  const resumeTest = (test: ScheduledTest) => {
    setCurrentTest(test);
  };

  const handlePreTestProceed = (displayMode: 'single' | 'all') => {
    setTestDisplayMode(displayMode);
    setCurrentTest(selectedTest);
    setShowPreTestModal(false);
    setSelectedTest(null);
  };

  const handlePreTestCancel = () => {
    setShowPreTestModal(false);
    setSelectedTest(null);
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

  const formatTimeRemaining = (endTime: string) => {
    const end = new Date(endTime);
    const diff = end.getTime() - currentTime.getTime();
    
    if (diff <= 0) return "Expired";
    
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    
    if (days > 0) return `${days}d ${hours}h`;
    if (hours > 0) return `${hours}h ${minutes}m`;
    return `${minutes}m`;
  };

  const formatTimeUntilStart = (startTime: string) => {
    const start = new Date(startTime);
    const diff = start.getTime() - currentTime.getTime();
    
    if (diff <= 0) return null;
    
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    
    if (days > 0) return `Starts in ${days}d ${hours}h`;
    if (hours > 0) return `Starts in ${hours}h ${minutes}m`;
    return `Starts in ${minutes}m`;
  };

  if (currentTest) {
    return <TestInterface test={currentTest} onComplete={handleTestComplete} displayMode={testDisplayMode} />;
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
    <div className="flex w-full">
        <Sidebar collapsible="icon" className="fixed left-0 top-16 h-[calc(100vh-4rem)] z-40">
          <SidebarContent className="h-full overflow-y-auto">
            <SidebarGroup>
              <SidebarGroupContent>
                <SidebarMenu>
                  {menuItems.map((item) => (
                    <SidebarMenuItem key={item.value}>
                    <SidebarMenuButton
                      isActive={activeTab === item.value}
                      onClick={() => {
                        setActiveTab(item.value);
                        onActiveTabChange?.(item.label, item.icon);
                      }}
                      tooltip={item.label}
                    >
                        <item.icon className="w-4 h-4" />
                        <span>{item.label}</span>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  ))}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
          </SidebarContent>
        </Sidebar>

        <SidebarInset>
          <div className="min-h-screen bg-gradient-subtle">
            <div className="p-3 sm:p-4 md:p-6">
            <Tabs value={activeTab} onValueChange={(value) => {
              setActiveTab(value);
              const item = menuItems.find(i => i.value === value);
              if (item) {
                onActiveTabChange?.(item.label, item.icon);
              }
            }} className="space-y-6">
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

            {/* Active Tests */}
            {activeTests.length > 0 && (
              <Card className="border-l-4 border-l-quiz">
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <Pause className="w-5 h-5 mr-2 text-quiz" />
                    Active Tests
                  </CardTitle>
                  <CardDescription>
                    Tests you have started and can resume
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {activeTests.map((test) => {
                      if (!test.question_papers) return null;
                      
                      const activeAttempt = test.test_attempts.find(attempt => !attempt.completed_at);
                      if (!activeAttempt) return null;

                      // For now use placeholder values until database columns are added
                      const progress = 0; // activeAttempt.progress_percentage || 0;
                      const currentQuestion = 1; // (activeAttempt.current_question_index || 0) + 1;
                      const totalQuestions = test.question_papers.total_questions;
                      const timeRemaining = formatTimeRemaining(test.end_time);
                      
                      return (
                        <div key={test.id} className="p-4 bg-quiz/5 border border-quiz/20 rounded-lg">
                          <div className="flex flex-col space-y-3 sm:space-y-0">
                            <div className="flex flex-row gap-2 min-w-0">
                              <div className="flex-1 min-w-0">
                                <h4 className="font-medium text-quiz mb-1">{test.title}</h4>
                                <p className="text-sm text-muted-foreground mb-2">
                                  {test.question_papers.subjects?.name} • Question {currentQuestion} of {totalQuestions}
                                </p>
                              </div>
                              
                              <div className="flex-shrink-0 w-auto">
                                <Button 
                                  onClick={() => resumeTest(test)}
                                  className="w-full sm:w-auto bg-quiz hover:bg-quiz/90"
                                  size="sm"
                                >
                                  Resume Test
                                </Button>
                              </div>
                            </div>
                            
                            <div className="space-y-2">
                              <div className="flex items-center justify-between text-xs">
                                <span>Progress</span>
                                <span>{progress}%</span>
                              </div>
                              <Progress value={progress} className="h-2" />
                              
                              <div className="flex items-center gap-4 text-xs text-muted-foreground">
                                <span className="flex items-center">
                                  <Timer className="w-3 h-3 mr-1" />
                                  {timeRemaining}
                                </span>
                                <span className="flex items-center">
                                  <User className="w-3 h-3 mr-1" />
                                  Attempt {activeAttempt.attempt_number}
                                </span>
                              </div>
                            </div>
                            
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>
            )}

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
                      if (!test.question_papers) {
                        console.warn('Test missing question_papers:', test.id);
                        return null;
                      }
                      
                      const difficulty = getDifficultyBadge(test.question_papers.total_questions);
                      const status = getTestStatus(test);
                      const attemptsLeft = test.max_attempts - (test.test_attempts?.length || 0);
                      const timeUntilStart = formatTimeUntilStart(test.start_time);
                      const timeRemaining = formatTimeRemaining(test.end_time);
                      
                      return (
                        <div key={test.id} className="flex flex-col sm:flex-row sm:items-center sm:justify-between p-4 border rounded-lg hover:shadow-md transition-shadow space-y-3 sm:space-y-0">
                          <div className="flex-1 min-w-0">
                            <h4 className="font-medium truncate pr-2">{test.title}</h4>
                             <p className="text-sm text-muted-foreground truncate">
                               {test.question_papers.subjects?.name || 'No subject'} • {test.question_papers.total_questions} questions • {(test.time_limit_hours || 1)}h {(test.time_limit_minutes || 0)}m
                             </p>
                            <div className="flex flex-wrap items-center mt-2 gap-2">
                              <Badge variant={difficulty.variant} className="text-xs">{difficulty.label}</Badge>
                              
                              {status === 'scheduled' && timeUntilStart && (
                                <Badge variant="outline" className="text-xs">
                                  {timeUntilStart}
                                </Badge>
                              )}
                              
                              {status === 'active' && (
                                <Badge variant="default" className="text-xs bg-quiz">
                                  {timeRemaining} remaining
                                </Badge>
                              )}
                              
                              {status === 'expired' && (
                                <Badge variant="destructive" className="text-xs">
                                  Expired
                                </Badge>
                              )}
                              
                              {attemptsLeft < test.max_attempts && (
                                <span className="text-xs text-muted-foreground whitespace-nowrap">
                                  {attemptsLeft} attempt{attemptsLeft !== 1 ? 's' : ''} left
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
                    }).filter(Boolean)}
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
                        <div key={test.id} className="flex flex-row justify-between p-3 bg-muted rounded-lg gap-2">
                          <div className="min-w-0 flex-1">
                            <h4 className="text-sm font-medium truncate pr-2">{test.title}</h4>
                            <p className="text-xs text-muted-foreground truncate">
                              Completed {lastAttempt?.completed_at ? new Date(lastAttempt.completed_at).toLocaleDateString() : 'N/A'}
                            </p>
                          </div>
                          <div className="text-right flex-shrink-0">
                            <div className={`text-base leading-none font-bold ${scoreColor}`}>{score}%</div>
                            <Badge variant={score >= 80 ? 'default' : 'outline'} className="text-xs p-0">
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
          </div>
        </SidebarInset>
        
        {/* Pre-Test Warning Modal */}
        {selectedTest && (
          <PreTestWarningModal
            open={showPreTestModal}
            onClose={handlePreTestCancel}
            onProceed={handlePreTestProceed}
            test={selectedTest}
          />
        )}
      </div>
  );
};