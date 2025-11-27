import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { Sidebar, SidebarContent, SidebarGroup, SidebarGroupContent, SidebarMenu, SidebarMenuItem, SidebarMenuButton, SidebarInset, SidebarProvider, useSidebar } from '@/components/ui/sidebar';
import { Navigation } from '@/components/ui/navigation';
import { LoadingState } from '@/components/ui/loading-state';
import { ErrorState } from '@/components/ui/error-state';
import { StatsCardsSkeleton, TestCardSkeleton } from '@/components/ui/skeleton-loaders';
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
import { ProfileManagement } from '@/components/profile/ProfileManagement';

interface ScheduledPaper {
  id: string;
  title: string;
  start_time: string;
  end_time: string;
  max_attempts: number;
  time_limit_minutes: number;
  total_questions: number;
  subjects_parent: { subject_name: string };
  paper_attempts: PaperAttempt[];
}

interface PaperAttempt {
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
  show_results?: boolean;
}

const StudentDashboardContent = () => {
  const { tab, subtab } = useParams();
  const navigate = useNavigate();
  const [availableTests, setAvailableTests] = useState<ScheduledPaper[]>([]);
  const [completedTests, setCompletedTests] = useState<ScheduledPaper[]>([]);
  const [activeTests, setActiveTests] = useState<ScheduledPaper[]>([]);
  const [currentTest, setCurrentTest] = useState<ScheduledPaper | null>(null);
  const [showPreTestModal, setShowPreTestModal] = useState(false);
  const [selectedTest, setSelectedTest] = useState<ScheduledPaper | null>(null);
  const [testDisplayMode, setTestDisplayMode] = useState<'single' | 'all'>('single');
  const [currentTime, setCurrentTime] = useState(new Date());
  const { user, profile, signOut } = useAuth();
  const { toast } = useToast();
  const { isMobile, setOpenMobile } = useSidebar();
  
  const menuItems = [
    { value: 'tests', label: 'Tests', icon: PlayCircle },
    { value: 'results', label: 'Results', icon: Award },
    { value: 'analytics', label: 'Analytics', icon: BarChart3 },
    { value: 'profile', label: 'Profile', icon: User },
  ];

  // Read tab from URL or default to 'tests'
  const activeTab = tab || 'tests';
  const activeItem = menuItems.find((i) => i.value === activeTab);

  // Redirect to default tab if not set
  useEffect(() => {
    if (!tab) {
      navigate('/student/tests', { replace: true });
    } else if (subtab && !['analytics'].includes(tab)) {
      // If we have a subtab but the current tab doesn't support subtabs, navigate without it
      navigate(`/student/${tab}`, { replace: true });
    }
  }, [tab, subtab, navigate]);

  const handleTabChange = (value: string) => {
    navigate(`/student/${value}`);
    if (isMobile) {
      setOpenMobile(false);
    }
  };
  
  const { loading, error, execute: executeAsync } = useAsyncOperation({
    onError: (error) => console.error('Student dashboard error:', error)
  });

  // Phase 4: Dashboard caching - only fetch on mount or explicit refresh
  const [lastFetchTime, setLastFetchTime] = useState<number>(0);
  const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

  useEffect(() => {
    if (user) {
      const now = Date.now();
      // Only fetch if cache is expired or first load
      if (now - lastFetchTime > CACHE_DURATION || lastFetchTime === 0) {
        fetchTests();
        setLastFetchTime(now);
      }
    }
  }, [user]);

  // Phase 4: Realtime subscription for reactive updates
  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel('paper_attempts_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'paper_attempts',
          filter: `user_id=eq.${user.id}`
        },
        (payload) => {
          console.log('Paper attempt changed:', payload);
          // Invalidate cache and refetch
          setLastFetchTime(0);
          fetchTests();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
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
      console.log('Fetching tests with new schema...');
      
      try {
        const { data: authData } = await supabase.auth.getUser();
        if (!authData.user) throw new Error('User not authenticated');

        const userId = authData.user.id;
        
        // Fetch scheduled papers with explicit query
        const { data: papers, error } = await supabase
          .from('question_papers')
          .select(`
            *,
            subjects_parent (
              id,
              subject_name
            )
          `)
          .eq('assign_to_all', true)
          .not('start_time', 'is', null)
          .not('end_time', 'is', null);
        
        if (error) throw error;
        
        const validPapers = papers || [];
        
        // Get attempts for current user
        const { data: attemptsData, error: attemptsError } = await supabase
          .from('paper_attempts')
          .select('id, paper_id, attempt_number, score, completed_at, started_at, current_question_index, total_questions, time_remaining, answers, progress_percentage, show_results')
          .eq('user_id', userId);
        
        if (attemptsError) throw attemptsError;
        
        const attemptsMap: Record<string, any[]> = {};
        (attemptsData || []).forEach(a => {
          if (!attemptsMap[a.paper_id]) attemptsMap[a.paper_id] = [];
          attemptsMap[a.paper_id].push(a);
        });
        
        const processedPapers: ScheduledPaper[] = validPapers.map(p => ({
          id: p.id,
          title: p.title,
          start_time: p.start_time,
          end_time: p.end_time,
          max_attempts: p.max_attempts || 1,
          time_limit_minutes: p.time_limit_minutes || 60,
          total_questions: p.total_questions || 0,
          subjects_parent: p.subjects_parent || {subject_name: 'Unknown'},
          paper_attempts: (attemptsMap[p.id] || []).map(a => ({
            id: a.id,
            attempt_number: a.attempt_number,
            score: a.score,
            completed_at: a.completed_at,
            started_at: a.started_at,
            current_question_index: a.current_question_index || 0,
            total_questions: p.total_questions || 0,
            time_remaining: a.time_remaining || 0,
            answers: a.answers || {},
            progress_percentage: a.progress_percentage || 0,
            show_results: a.show_results || false
          }))
        }));
        
        // Categorize papers
        const now = new Date();
        const categorized = { available: [] as ScheduledPaper[], completed: [] as ScheduledPaper[], active: [] as ScheduledPaper[] };
        
        processedPapers.forEach(paper => {
          const start = new Date(paper.start_time);
          const end = new Date(paper.end_time);
          const inProgress = paper.paper_attempts.filter(a => !a.completed_at);
          const hasCompleted = paper.paper_attempts.some(a => a.completed_at);
          const hasRemaining = paper.paper_attempts.length < paper.max_attempts;
          
          if (inProgress.length > 0) {
            categorized.active.push(paper);
          } else if (end < now || (hasCompleted && !hasRemaining)) {
            categorized.completed.push(paper);
          } else {
            categorized.available.push(paper);
          }
        });
        
        setAvailableTests(categorized.available);
        setCompletedTests(categorized.completed);
        setActiveTests(categorized.active);
      } catch (error) {
        console.error('Error in fetchTests:', error);
        throw error;
      }
    });
  };

  const startTest = (test: ScheduledPaper) => {
    setSelectedTest(test);
    setShowPreTestModal(true);
  };

  const resumeTest = (test: ScheduledPaper) => {
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
    // Phase 4: Invalidate cache on test completion
    setLastFetchTime(0);
    fetchTests();
  };

  const formatDateTime = (dateString: string) => {
    return new Date(dateString).toLocaleString();
  };

  const getTestStatus = (test: ScheduledPaper) => {
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
    // Transform the ScheduledPaper back to the format expected by TestInterface
    const testForInterface = {
      id: currentTest.id,
      title: currentTest.title,
      start_time: currentTest.start_time,
      end_time: currentTest.end_time,
      max_attempts: currentTest.max_attempts,
      question_paper_id: currentTest.id,
      time_limit_minutes: currentTest.time_limit_minutes,
      question_papers: {
        id: currentTest.id,
        title: currentTest.title,
        total_questions: currentTest.total_questions,
        time_limit_minutes: currentTest.time_limit_minutes,
        subjects_parent: currentTest.subjects_parent
      },
      test_attempts: currentTest.paper_attempts?.map(attempt => ({
        id: attempt.id,
        attempt_number: attempt.attempt_number,
        score: attempt.score,
        completed_at: attempt.completed_at,
        started_at: attempt.started_at,
        current_question_index: attempt.current_question_index,
        total_questions: attempt.total_questions,
        time_remaining: attempt.time_remaining,
        answers: attempt.answers,
        progress_percentage: attempt.progress_percentage
      })) || []
    };
    
    return <TestInterface test={testForInterface} onComplete={handleTestComplete} displayMode={testDisplayMode} />;
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
    <>
      <Navigation 
        currentRole={profile?.role || null} 
        onRoleChange={() => signOut()}
      />
      <div className="flex w-full pt-[57px] md:pt-[64px]">
        <Sidebar collapsible="icon" className="fixed left-0 top-16 h-[calc(100vh-4rem)] z-40">
          <SidebarContent className="h-full overflow-y-auto">
            <SidebarGroup>
              <SidebarGroupContent>
                <SidebarMenu>
                  {menuItems.map((item) => (
                    <SidebarMenuItem key={item.value}>
                    <SidebarMenuButton
                      isActive={activeTab === item.value}
                      onClick={() => handleTabChange(item.value)}
                      tooltip={item.label}
                      className="text-base md:text-sm"
                    >
                        <item.icon className="w-5 h-5 md:w-4 md:h-4" />
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
          {/* Mobile Tab Header */}
          <div className="md:hidden bg-card border-b p-4 flex items-center space-x-3">
            {activeTab && (() => {
              const item = menuItems.find(i => i.value === activeTab);
              return item ? (
                <>
                  <item.icon className="w-5 h-5 text-muted-foreground" />
                  <span className="text-lg font-medium text-foreground">{item.label}</span>
                </>
              ) : null;
            })()}
          </div>
          
          <div className="min-h-screen bg-background">
            <div className="p-3 sm:p-4 md:p-6">
            <Tabs value={activeTab} onValueChange={handleTabChange} className="space-y-6">
              <TabsContent value="tests" className="space-y-6">
                {loading ? (
                  <div className="space-y-6">
                    <StatsCardsSkeleton count={3} />
                    <div className="space-y-4">
                      <h3 className="text-lg font-semibold">Available Tests</h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <TestCardSkeleton />
                        <TestCardSkeleton />
                        <TestCardSkeleton />
                      </div>
                    </div>
                  </div>
                ) : (
                  <>
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
                    {(() => {
                      const approvedAttempts = completedTests.flatMap(test => 
                        test.paper_attempts.filter(attempt => attempt.show_results && attempt.score !== null)
                      );
                      return approvedAttempts.length > 0
                        ? Math.round(approvedAttempts.reduce((sum, attempt) => sum + (attempt.score || 0), 0) / approvedAttempts.length) + '%'
                        : 'N/A';
                    })()}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {completedTests.flatMap(test => test.paper_attempts.filter(attempt => attempt.show_results)).length > 0
                      ? 'From approved results'
                      : 'No approved results yet'
                    }
                  </p>
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
                      const activeAttempt = test.paper_attempts.find(attempt => !attempt.completed_at);
                      
                      // Use actual values from the attempt
                      const progress = activeAttempt?.progress_percentage || 0;
                      const currentQuestion = (activeAttempt?.current_question_index || 0) + 1;
                      const totalQuestions = test.total_questions;
                      const timeRemaining = formatTimeRemaining(test.end_time);
                      
                      return (
                        <div key={test.id} className="p-4 bg-quiz/5 border border-quiz/20 rounded-lg">
                          <div className="flex flex-col space-y-3 sm:space-y-0">
                            <div className="flex flex-row gap-2 min-w-0">
                              <div className="flex-1 min-w-0">
                                <h4 className="font-medium text-quiz mb-1">{test.title}</h4>
                                <p className="text-sm text-muted-foreground mb-2">
                                  {test.subjects_parent?.subject_name} • Question {currentQuestion} of {totalQuestions}
                                </p>
                              </div>
                              
                              <div className="flex-shrink-0 w-auto">
                                <Button 
                                  onClick={() => resumeTest(test)}
                                  className="w-full sm:w-auto bg-quiz text-quiz-foreground hover:bg-quiz/90"
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
                                  Attempt {activeAttempt?.attempt_number || 1}
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
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <TestCardSkeleton />
                    <TestCardSkeleton />
                    <TestCardSkeleton />
                  </div>
                ) : availableTests.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <Calendar className="w-12 h-12 mx-auto mb-4 opacity-50" />
                    <p>No tests available at the moment</p>
                  </div>
                ) : (
                   <div className="space-y-4">
                     {availableTests.map((test) => {
                       const difficulty = getDifficultyBadge(test.total_questions);
                       const status = getTestStatus(test);
                       const attemptsLeft = test.max_attempts - (test.paper_attempts?.length || 0);
                       const timeUntilStart = formatTimeUntilStart(test.start_time);
                       const timeRemaining = formatTimeRemaining(test.end_time);
                       
                       return (
                         <div key={test.id} className="flex flex-col sm:flex-row sm:items-center sm:justify-between p-4 border rounded-lg hover:shadow-md transition-shadow space-y-3 sm:space-y-0">
                           <div className="flex-1 min-w-0">
                             <h4 className="font-medium truncate pr-2">{test.title}</h4>
                                <p className="text-sm text-muted-foreground truncate">
                                  {test.subjects_parent?.subject_name || 'No subject'} • {test.total_questions} questions • {test.time_limit_minutes}m
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
                               
                               {/* Show Submitted badge if any attempt has been completed */}
                               {test.paper_attempts.some(attempt => attempt.completed_at) && (
                                 <Badge variant="secondary" className="text-xs bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
                                   Submitted
                                 </Badge>
                               )}
                            </div>
                          </div>
                          <div className="flex-shrink-0 w-full sm:w-auto">
                            <Button 
                              onClick={() => startTest(test)}
                              disabled={status !== 'active' || attemptsLeft === 0}
                              className={cn(
                                'w-full sm:w-auto',
                                status === 'active' ? 'bg-quiz text-quiz-foreground hover:bg-quiz/90' : ''
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

                  </>
                )}
              </TabsContent>

              <TabsContent value="results">
                <TestResults />
              </TabsContent>

              <TabsContent value="analytics">
                <PerformanceAnalytics />
              </TabsContent>

              <TabsContent value="profile">
                <div className="mb-6">
                  <h2 className="text-2xl md:text-3xl font-bold text-foreground">Profile Management</h2>
                  <p className="text-sm md:text-base text-muted-foreground mt-1">
                    Manage your account settings and personal information
                  </p>
                </div>
                <ProfileManagement />
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
            test={{
              title: selectedTest.title,
              time_limit_minutes: selectedTest.time_limit_minutes,
              question_papers: {
                total_questions: selectedTest.total_questions,
                time_limit_minutes: selectedTest.time_limit_minutes,
                subjects_parent: selectedTest.subjects_parent
              } as any
            }}
          />
        )}
      </div>
    </>
  );
};

export const StudentDashboard = () => {
  return (
    <SidebarProvider>
      <StudentDashboardContent />
    </SidebarProvider>
  );
};