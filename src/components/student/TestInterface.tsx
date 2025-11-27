import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useBlocker } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useTestSecurity } from '@/hooks/useTestSecurity';
import { SecurityWarningModal } from './SecurityWarningModal';
import { 
  Clock, 
  AlertTriangle, 
  CheckCircle2, 
  ArrowLeft, 
  ArrowRight,
  Flag,
  Eye,
  EyeOff,
  Wifi,
  WifiOff,
  Save,
  Check,
  Shield,
  Maximize,
  Pause
} from 'lucide-react';

interface Question {
  id: string;
  question_text: string;
  option_a: string;
  option_b: string;
  option_c: string;
  option_d: string;
  question_order: number;
}

interface TestInterfaceProps {
  test: {
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
      subjects_parent: { subject_name: string };
    };
    test_attempts: Array<{ attempt_number: number; completed_at: string | null }>;
  };
  onComplete: () => void;
  displayMode?: 'single' | 'all';
}

export const TestInterface = ({ test, onComplete, displayMode = 'single' }: TestInterfaceProps) => {
  const [questions, setQuestions] = useState<Question[]>([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [flaggedQuestions, setFlaggedQuestions] = useState<Set<number>>(new Set());
  const [timeLeft, setTimeLeft] = useState(() => {
    const hours = test.time_limit_hours || Math.floor((test.question_papers?.time_limit_minutes || 60) / 60);
    const minutes = test.time_limit_minutes || ((test.question_papers?.time_limit_minutes || 60) % 60);
    return (hours * 60 + minutes) * 60;
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showReviewDialog, setShowReviewDialog] = useState(false);
  const [showFinalConfirmDialog, setShowFinalConfirmDialog] = useState(false);
  const [unansweredQuestions, setUnansweredQuestions] = useState<number[]>([]);
  const [testAttemptId, setTestAttemptId] = useState<string | null>(null);
  const [showSecurityModal, setShowSecurityModal] = useState(false);
  const [showFullscreenPrompt, setShowFullscreenPrompt] = useState(false);
  const [testExpired, setTestExpired] = useState(false);
  const [confirmationText, setConfirmationText] = useState<string>('');
  
  // Auto-save states
  const [isSaving, setIsSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  
  const { user } = useAuth();
  const { toast } = useToast();

  // Define handleForceSubmit first
  const handleForceSubmit = useCallback(async (reason: string) => {
    await handleSubmit('force', reason, true);
  }, []);

  // Enhanced security system with simplified fullscreen approach
  const {
    violations,
    violationCount,
    isFullscreen,
    isSecurityActive,
    navigationBlocked,
    activateSecurity,
    deactivateSecurity,
    enableFullscreen,
    addViolation
  } = useTestSecurity({
    testAttemptId,
    enabled: true,
    onAutoSubmit: handleForceSubmit,
    maxViolations: 3
  });

  // React Router navigation blocker - blocks all in-app navigation during test
  const blocker = useBlocker(
    ({ currentLocation, nextLocation }) =>
      isSecurityActive && currentLocation.pathname !== nextLocation.pathname
  );

  // Handle React Router navigation blocking
  useEffect(() => {
    if (blocker.state === "blocked" && isSecurityActive) {
      addViolation({
        type: 'navigation',
        severity: 'high',
        details: {
          action: 'router_navigation_attempt',
          from: blocker.location?.pathname,
          to: blocker.location?.pathname,
          timestamp: new Date().toISOString()
        },
        timestamp: new Date()
      });
      
      toast({
        title: "Navigation Blocked",
        description: "You cannot navigate away during the test. This has been recorded.",
        variant: "destructive"
      });
      
      // Reset blocker to stay on current page
      blocker.reset?.();
    }
  }, [blocker.state, isSecurityActive, addViolation, toast]);

  // Check if test attempt is within time limits
  const validateTestTimeLimit = useCallback(async (attemptData: any) => {
    const now = new Date();
    const testEndTime = new Date(test.end_time);
    const attemptStartTime = new Date(attemptData.started_at);
    
    // Calculate individual attempt time limit
    const totalMinutes = test.question_papers?.time_limit_minutes || 
                        (test.time_limit_hours || 1) * 60 + (test.time_limit_minutes || 0);
    const timeLimitMs = totalMinutes * 60000;
    const attemptEndTime = new Date(attemptStartTime.getTime() + timeLimitMs);
    
    // Check if test window has expired
    if (now > testEndTime) {
      toast({
        title: "Test Expired",
        description: "The test window has closed. You can no longer continue this test.",
        variant: "destructive"
      });
      onComplete();
      return false;
    }
    
    // Check if individual attempt time has expired
    if (now > attemptEndTime) {
      toast({
        title: "Attempt Time Expired",
        description: "Your individual attempt time has expired. The test will be auto-submitted.",
        variant: "destructive"
      });
      // Auto-submit the expired attempt
      await handleSubmit('auto', 'Individual attempt time limit exceeded', true);
      return false;
    }
    
    // Update time left based on remaining attempt time
    const remainingMs = attemptEndTime.getTime() - now.getTime();
    const remainingSeconds = Math.max(0, Math.floor(remainingMs / 1000));
    setTimeLeft(remainingSeconds);
    
    return true;
  }, [test, onComplete, toast]);

  // Network status monitoring
  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      toast({
        title: "Connection Restored",
        description: "Your progress will now be saved automatically",
      });
    };

    const handleOffline = () => {
      setIsOnline(false);
      toast({
        title: "Connection Lost",
        description: "Your progress will be saved when connection is restored",
        variant: "destructive"
      });
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []); // Removed saveQueue dependency to prevent re-registering listeners

  // Initialize test and check time limits
  useEffect(() => {
    initializeTest();
    
    return () => {
      // Cleanup will be handled by useTestSecurity hook itself
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, []); // Remove deactivateSecurity dependency

  // Simplified security activation - just start monitoring, no fullscreen requirement
  useEffect(() => {
    if (testAttemptId && !isSecurityActive && !testExpired) {
      // Start security monitoring immediately
      activateSecurity();
      
      // Prompt user to go fullscreen but don't block test
      setShowFullscreenPrompt(true);
    }
  }, [testAttemptId, isSecurityActive, testExpired, activateSecurity]);

  // Monitor fullscreen status and handle exits
  useEffect(() => {
    const handleFullscreenChange = () => {
      const isInFullscreen = !!document.fullscreenElement;
      
      if (!isInFullscreen && isSecurityActive) {
        // User exited fullscreen during test
        addViolation({
          type: 'fullscreen_exit',
          severity: 'high',
          details: {
            timestamp: new Date().toISOString(),
            reason: 'User exited fullscreen mode during test'
          },
          timestamp: new Date()
        });

        toast({
          title: "⚠️ Fullscreen Exit Detected",
          description: "You exited fullscreen mode. This has been recorded as a security violation.",
          variant: "destructive"
        });
      }
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, [isSecurityActive, addViolation, toast]);

  // Phase 1: Optimized auto-save with proper 30-second debouncing
  const debouncedSave = useCallback(async (forceSync = false, isGracePeriod = false) => {
    if (!testAttemptId || (isSubmitting && !isGracePeriod)) return;

    const progressData = {
      paperAttemptId: testAttemptId,
      answers,
      currentQuestionIndex,
      progressPercentage: Math.round((Object.keys(answers).length / questions.length) * 100),
      timeRemaining: Math.max(0, timeLeft),
      flaggedQuestions: Array.from(flaggedQuestions),
      paperId: test.id
    };

    if (!isOnline && !forceSync && !isGracePeriod) {
      // Don't save if offline - will retry when connection restored
      return;
    }

    // Clear existing timeout
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }

    // Don't debounce forced syncs or grace period saves
    if (forceSync || isGracePeriod) {
      await performSave(progressData);
      return;
    }

    // Debounce regular saves by 30 seconds
    saveTimeoutRef.current = setTimeout(() => {
      performSave(progressData);
    }, 30000);
  }, [testAttemptId, answers, currentQuestionIndex, timeLeft, flaggedQuestions, questions.length, test.id, isOnline, isSubmitting]);

  // Separate save execution function
  const performSave = async (progressData: any) => {
    setIsSaving(true);
    
    try {
      const saveStartTime = Date.now();
      const { data, error } = await supabase.functions.invoke('save-paper-progress', {
        body: progressData
      });

      const saveResponseTime = Date.now() - saveStartTime;

      if (error) {
        // Enhanced error handling based on error type
        if (error.message?.includes('time expired') || error.message?.includes('completed')) {
          toast({
            title: "Test Time Expired",
            description: "Your test has been automatically submitted.",
            variant: "destructive"
          });
          onComplete();
          return;
        }
        throw error;
      }

      if (data?.autoSubmitted) {
        toast({
          title: "Test Auto-Submitted",
          description: data.message,
          variant: "destructive"
        });
        onComplete();
        return;
      }

      setLastSaved(new Date());

      // Monitor save performance for grace period warnings
      if (saveResponseTime > 10000 && timeLeft <= 60) {
        toast({
          title: "Save Delay Warning",
          description: "Saves are taking longer than usual. Consider submitting soon.",
          variant: "destructive"
        });
      }

    } catch (error) {
      console.error('Save failed:', error);
      
      // Enhanced error handling with retry logic
      const isNetworkError = error.message?.includes('fetch') || error.message?.includes('network');
      const isTimeoutError = error.message?.includes('timeout');
      
      if (isOnline) {
        const errorMessage = isNetworkError ? 
          "Network error during save. Your progress may be lost." :
          isTimeoutError ? 
          "Save timeout. Your connection may be unstable." :
          "Your progress couldn't be saved. Please check your connection.";
          
        toast({
          title: "Save Failed",
          description: errorMessage,
          variant: "destructive"
        });
      }
    } finally {
      setIsSaving(false);
    }
  };

  // Enhanced timer countdown with grace period and warnings
  useEffect(() => {
    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        const newTime = prev - 1;

        // Grace period warnings - only save at critical times
        if (newTime === 300) { // 5 minutes
          toast({
            title: "⚠️ 5 Minutes Remaining",
            description: "Ensure all answers are complete. Auto-save in progress...",
            variant: "destructive"
          });
          debouncedSave(true, true);
        } else if (newTime === 60) { // 1 minute - final save
          toast({
            title: "⚠️ FINAL WARNING: 1 Minute Left",
            description: "Test will auto-submit in 1 minute! Complete remaining questions now.",
            variant: "destructive"
          });
          debouncedSave(true, true);
        } else if (newTime === 10) { // 10 seconds
          toast({
            title: "🚨 10 SECONDS REMAINING",
            description: "Auto-submitting now...",
            variant: "destructive"
          });
        }

        if (newTime <= 0) {
          handleAutoSubmit();
          return 0;
        }
        return newTime;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, []); // Removed debouncedSave from dependencies - timer should run independently

  // Phase 2: Single server time sync at test start - done via initial save

  const initializeTest = async () => {
    try {
      const { data: { user: authUser } } = await supabase.auth.getUser();
      if (!authUser) {
        throw new Error('User not authenticated');
      }

      // Check for existing active attempt first
      const { data: existingAttempt, error: existingError } = await supabase
        .from('paper_attempts')
        .select('*')
        .eq('paper_id', test.id)
        .eq('user_id', authUser.id)
        .is('completed_at', null)
        .order('started_at', { ascending: false })
        .limit(1);

      if (existingError) throw existingError;

      let attemptData;
      
      if (existingAttempt && existingAttempt.length > 0) {
        // Resume existing attempt
        attemptData = existingAttempt[0];
        
        // Validate time limits for existing attempt
        const isValid = await validateTestTimeLimit(attemptData);
        if (!isValid) {
          return; // Function will handle navigation
        }
        
        // Restore state from existing attempt
        setTestAttemptId(attemptData.id);
        setCurrentQuestionIndex(attemptData.current_question_index || 0);
        
        if (attemptData.answers && attemptData.answers.encrypted) {
          try {
            const decryptedAnswers = JSON.parse(atob(attemptData.answers.encrypted));
            setAnswers(decryptedAnswers);
            console.log('Restored answers:', decryptedAnswers);
          } catch (error) {
            console.error('Error decrypting answers:', error);
            // Try fallback format
            if (attemptData.answers && typeof attemptData.answers === 'object') {
              setAnswers(attemptData.answers);
              console.log('Restored answers from fallback:', attemptData.answers);
            }
          }
        } else if (attemptData.answers && typeof attemptData.answers === 'object') {
          // Direct object format (fallback)
          setAnswers(attemptData.answers);
          console.log('Restored answers from direct format:', attemptData.answers);
        }
        
        if (attemptData.answers && attemptData.answers.flagged) {
          try {
            const flaggedArray = JSON.parse(atob(attemptData.answers.flagged));
            setFlaggedQuestions(new Set(flaggedArray));
          } catch (error) {
            console.error('Error decrypting flagged questions:', error);
          }
        }

        toast({
          title: "Test Resumed",
          description: "Continuing your previous attempt",
          variant: "default"
        });
      } else {
        // Create new paper attempt
        const attemptNumber = (test.test_attempts?.length || 0) + 1;
        const startTime = new Date();
        
        // Check if we're still within the test window
        const testEndTime = new Date(test.end_time);
        if (startTime > testEndTime) {
          toast({
            title: "Test Expired",
            description: "The test window has closed. You can no longer start this test.",
            variant: "destructive"
          });
          onComplete();
          return;
        }
        
        // Get the paper's show_results setting
        const { data: paperData, error: paperError } = await supabase
          .from('question_papers')
          .select('show_results')
          .eq('id', test.id)
          .single();
        
        if (paperError) {
          console.error('Error fetching paper settings:', paperError);
        }
        
        const { data: newAttempt, error: attemptError } = await supabase
          .from('paper_attempts')
          .insert({
            paper_id: test.id,
            user_id: authUser.id,
            attempt_number: attemptNumber,
            started_at: startTime.toISOString(),
            current_question_index: 0,
            progress_percentage: 0,
            time_remaining: (test.time_limit_minutes || 60) * 60,
            show_results: paperData?.show_results || false
          })
          .select()
          .single();

        if (attemptError) throw attemptError;
        attemptData = newAttempt;
        setTestAttemptId(attemptData.id);

        toast({
          title: "Test Started",
          description: "Your test attempt has begun",
          variant: "default"
        });
      }

      // Load questions
      const { data: questionsData, error: questionsError } = await supabase
        .from('question_paper_questions')
        .select(`
          question_order,
          questions (
            id,
            question_text,
            option_a,
            option_b,
            option_c,
            option_d
          )
        `)
        .eq('question_paper_id', test.question_paper_id)
        .order('question_order');

      if (questionsError) throw questionsError;

      const formattedQuestions: Question[] = questionsData.map((item: any) => ({
        ...item.questions,
        question_order: item.question_order
      }));

      setQuestions(formattedQuestions);
    } catch (error) {
      console.error('Error initializing test:', error);
      toast({
        title: "Error",
        description: "Failed to start test",
        variant: "destructive"
      });
      onComplete();
    }
  };

  // Auto-save is handled by 30-second debounce in debouncedSave function

  const handleAnswer = (questionId: string, answer: string) => {
    setAnswers(prev => ({
      ...prev,
      [questionId]: answer
    }));
  };

  const toggleFlag = (questionIndex: number) => {
    setFlaggedQuestions(prev => {
      const newSet = new Set(prev);
      if (newSet.has(questionIndex)) {
        newSet.delete(questionIndex);
      } else {
        newSet.add(questionIndex);
      }
      return newSet;
    });
  };

  const navigateToQuestion = (index: number) => {
    if (index >= 0 && index < questions.length) {
      setCurrentQuestionIndex(index);
    }
  };

  const handleSubmit = async (type: 'manual' | 'auto' | 'force' | 'partial' = 'manual', reason = '', doFinalSave = false) => {
    if (!testAttemptId || isSubmitting) return;
    
    setIsSubmitting(true);
    setShowFinalConfirmDialog(false);
    setShowReviewDialog(false);

    // Final grace period save if requested
    if (doFinalSave) {
      try {
        await debouncedSave(true, true);
      } catch (error) {
        console.error('Final save failed:', error);
        // Continue with submission even if final save fails
      }
    }

    try {
      // Use the complete-paper-attempt edge function for proper submission
      const { data, error } = await supabase.functions.invoke('complete-paper-attempt', {
        body: {
          paperAttemptId: testAttemptId,
          completionType: type,
          completionReason: reason,
          answers: answers,
          flaggedQuestions: Array.from(flaggedQuestions),
          currentQuestionIndex,
          progressPercentage: Math.round((Object.keys(answers).length / questions.length) * 100),
          timeRemaining: Math.max(0, timeLeft),
          paperId: test.id
        }
      });

      if (error) {
        console.error('Submission error:', error);
        throw new Error(error.message || 'Failed to submit test');
      }

      if (data?.success) {
        toast({
          title: data.title || "Test Submitted",
          description: data.message || `Test completed successfully!`,
          variant: data.success ? "default" : "destructive"
        });
        
        onComplete();
      } else {
        throw new Error(data?.error || 'Unknown submission error');
      }
    } catch (error) {
      console.error('Error submitting test:', error);
      toast({
        title: "Submission Error",
        description: error.message || "Failed to submit test. Your progress has been saved. Please try again or contact support.",
        variant: "destructive"
      });
    } finally {
      setIsSubmitting(false);
      deactivateSecurity(); // Deactivate security monitoring
    }
  };

  const handleAutoSubmit = async () => {
    await handleSubmit('auto', 'Time expired - automatic submission', true);
  };

  const handlePause = async () => {
    if (!testAttemptId || isSubmitting) return;
    
    setIsSubmitting(true);
    
    try {
      // Save current progress
      await debouncedSave(true, false);
      
      toast({
        title: "Test Paused",
        description: "Your progress has been saved. You can resume this test later.",
        variant: "default"
      });
      
      // Exit the test
      onComplete();
    } catch (error) {
      console.error('Error pausing test:', error);
      toast({
        title: "Pause Error",
        description: "Failed to save progress while pausing. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleGoFullscreen = async () => {
    try {
      await document.documentElement.requestFullscreen();
      setShowFullscreenPrompt(false);
      toast({
        title: "Fullscreen Activated",
        description: "You are now in fullscreen mode. Do not exit during the test.",
        variant: "default"
      });
    } catch (error) {
      console.error('Fullscreen request failed:', error);
      toast({
        title: "Fullscreen Not Available",
        description: "Fullscreen mode could not be activated. The test will continue with monitoring.",
        variant: "destructive"
      });
      setShowFullscreenPrompt(false);
    }
  };

  const handleContinueWithoutFullscreen = () => {
    setShowFullscreenPrompt(false);
    toast({
      title: "Test Started",
      description: "Test started without fullscreen. Security monitoring is active.",
      variant: "default"
    });
  };

  const formatTime = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  const getAnsweredCount = () => {
    return Object.keys(answers).length;
  };

  const getUnansweredQuestions = () => {
    const unanswered: number[] = [];
    questions.forEach((question, index) => {
      if (!answers[question.id]) {
        unanswered.push(index);
      }
    });
    return unanswered;
  };

  const getFlaggedUnansweredQuestions = () => {
    return Array.from(flaggedQuestions).filter(index => !answers[questions[index].id]);
  };

  // Enhanced submission flow
  const initiateSubmission = (type: 'manual' | 'auto' | 'force' | 'partial' = 'manual', reason = '') => {
    const unanswered = getUnansweredQuestions();
    setUnansweredQuestions(unanswered);

    if (type === 'manual') {
      // Manual submission - show review dialog first
      setShowReviewDialog(true);
    } else if (type === 'auto') {
      // Auto-submit due to time expiration - show brief warning then submit
      toast({
        title: "Auto-Submitting",
        description: reason || "Time expired - automatically submitting test",
        variant: "destructive"
      });
      setTimeout(() => handleSubmit(type, reason, true), 2000); // 2 second delay for user awareness
    } else {
      // Force or partial submit - immediate submission
      handleSubmit(type, reason, true);
    }
  };

  const proceedToFinalConfirmation = () => {
    setShowReviewDialog(false);
    setShowFinalConfirmDialog(true);
  };

  const currentQuestion = questions[currentQuestionIndex];

  if (!currentQuestion || isSubmitting) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p>{isSubmitting ? "Submitting test..." : "Loading test..."}</p>
        </div>
      </div>
    );
  }  

  return (
    <div className={`min-h-screen bg-background p-4 select-none`}>
      {/* Fullscreen Prompt Dialog */}
      <AlertDialog open={showFullscreenPrompt} onOpenChange={setShowFullscreenPrompt}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center">
              <Maximize className="w-5 h-5 mr-2" />
              Fullscreen Recommended
            </AlertDialogTitle>
            <AlertDialogDescription>
              For the best test experience and to prevent distractions, we recommend using fullscreen mode.
              <br /><br />
              <strong>Note:</strong> Exiting fullscreen during the test will be recorded as a security violation.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={handleContinueWithoutFullscreen}>
              Continue Without Fullscreen
            </AlertDialogCancel>
            <AlertDialogAction onClick={handleGoFullscreen}>
              Go Fullscreen
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Header */}
      <div className="max-w-6xl mx-auto mb-6">
        <Card>
          <CardHeader className="pb-4">
            <div className="flex justify-between items-start">
              <div>
                <CardTitle className="text-xl">{test.title}</CardTitle>
                <CardDescription>{test.question_papers.subjects_parent.subject_name}</CardDescription>
              </div>
              <div className="flex items-center space-x-4">
                {/* Save Status Indicator */}
                <div className="flex items-center space-x-2">
                  {isSaving ? (
                    <div className="flex items-center text-muted-foreground">
                      <Save className="w-4 h-4 mr-1 animate-spin" />
                      <span className="text-sm">Saving...</span>
                    </div>
                  ) : lastSaved ? (
                    <div className="flex items-center text-success">
                      <Check className="w-4 h-4 mr-1" />
                      <span className="text-sm">Saved {new Date(lastSaved).toLocaleTimeString()}</span>
                    </div>
                  ) : null}
                  
                  {/* Network Status */}
                  {isOnline ? (
                    <Wifi className="w-4 h-4 text-success" />
                  ) : (
                    <div className="flex items-center text-destructive">
                      <WifiOff className="w-4 h-4 mr-1" />
                      <span className="text-sm">Offline</span>
                    </div>
                  )}
                </div>

                {violationCount > 0 && (
                  <Badge variant="destructive" className="flex items-center">
                    <AlertTriangle className="w-3 h-3 mr-1" />
                    Violations: {violationCount}/3
                  </Badge>
                )}
                <Badge variant={timeLeft <= 300 ? "destructive" : "default"} className="flex items-center text-lg px-3 py-1">
                  <Clock className="w-4 h-4 mr-2" />
                  {formatTime(timeLeft)}
                </Badge>
              </div>
            </div>
            
            <div className="flex justify-between items-center mt-4">
              <div className="text-sm text-muted-foreground">
                Question {currentQuestionIndex + 1} of {questions.length} • 
                Answered: {getAnsweredCount()}/{questions.length}
              </div>
              <div className="flex items-center space-x-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => toggleFlag(currentQuestionIndex)}
                  className={flaggedQuestions.has(currentQuestionIndex) ? 'bg-warning/20' : ''}
                >
                  <Flag className={`w-4 h-4 ${flaggedQuestions.has(currentQuestionIndex) ? 'fill-current' : ''}`} />
                </Button>
                <Badge 
                  variant={isSecurityActive ? "default" : "destructive"}
                  className="text-xs"
                >
                  {isSecurityActive ? <Shield className="w-3 h-3 mr-1" /> : <AlertTriangle className="w-3 h-3 mr-1" />}
                  Security {isSecurityActive ? 'Active' : 'Inactive'}
                </Badge>
              </div>
            </div>
            
            <Progress 
              value={(getAnsweredCount() / questions.length) * 100} 
              className="mt-2"
            />
          </CardHeader>
        </Card>
      </div>

      {/* Main Content */}
      <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Question Panel */}
        <div className="lg:col-span-3">
          {displayMode === 'single' ? (
            // Single Question Mode
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span>Question {currentQuestionIndex + 1}</span>
                  {flaggedQuestions.has(currentQuestionIndex) && (
                    <Badge variant="outline" className="bg-warning/20">
                      <Flag className="w-3 h-3 mr-1 fill-current" />
                      Flagged
                    </Badge>
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="text-lg leading-relaxed">
                  {currentQuestion.question_text}
                </div>
                
                <div className="space-y-3">
                  {['A', 'B', 'C', 'D'].map((option) => {
                    const optionKey = `option_${option.toLowerCase()}` as keyof Question;
                    const optionText = currentQuestion[optionKey] as string;
                    const isSelected = answers[currentQuestion.id] === option;
                    
                    return (
                      <Button
                        key={option}
                        variant={isSelected ? "default" : "outline"}
                        className={`w-full justify-start text-left p-4 h-auto ${
                          isSelected ? 'bg-primary text-primary-foreground' : 'hover:bg-muted'
                        }`}
                        onClick={() => handleAnswer(currentQuestion.id, option)}
                      >
                        <div className="flex items-center space-x-3">
                          <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${
                            isSelected ? 'border-primary-foreground bg-primary-foreground text-primary' : 'border-muted-foreground'
                          }`}>
                            {option}
                          </div>
                          <div className="text-wrap">{optionText}</div>
                        </div>
                      </Button>
                    );
                  })}
                </div>
                
                <div className="flex justify-between items-center pt-4">
                  <Button
                    variant="outline"
                    onClick={() => navigateToQuestion(currentQuestionIndex - 1)}
                    disabled={currentQuestionIndex === 0}
                  >
                    <ArrowLeft className="w-4 h-4 mr-2" />
                    Previous
                  </Button>
                  
                  <Button
                    variant="outline"
                    onClick={() => navigateToQuestion(currentQuestionIndex + 1)}
                    disabled={currentQuestionIndex === questions.length - 1}
                  >
                    Next
                    <ArrowRight className="w-4 h-4 ml-2" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ) : (
            // All Questions Mode
            <div className="space-y-6 max-h-[calc(100vh-200px)] overflow-y-auto pr-2">
              {questions.map((question, questionIndex) => (
                <Card key={question.id} id={`question-${questionIndex}`} className="scroll-mt-4">
                  <CardHeader>
                    <CardTitle className="flex items-center justify-between">
                      <span>Question {questionIndex + 1}</span>
                      <div className="flex items-center space-x-2">
                        {flaggedQuestions.has(questionIndex) && (
                          <Badge variant="outline" className="bg-warning/20">
                            <Flag className="w-3 h-3 mr-1 fill-current" />
                            Flagged
                          </Badge>
                        )}
                        {answers[question.id] && (
                          <Badge variant="secondary">
                            <CheckCircle2 className="w-3 h-3 mr-1" />
                            Answered
                          </Badge>
                        )}
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => toggleFlag(questionIndex)}
                          className={flaggedQuestions.has(questionIndex) ? 'bg-warning/20' : ''}
                        >
                          <Flag className={`w-4 h-4 ${flaggedQuestions.has(questionIndex) ? 'fill-current' : ''}`} />
                        </Button>
                      </div>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <div className="text-lg leading-relaxed">
                      {question.question_text}
                    </div>
                    
                    <div className="space-y-3">
                      {['A', 'B', 'C', 'D'].map((option) => {
                        const optionKey = `option_${option.toLowerCase()}` as keyof Question;
                        const optionText = question[optionKey] as string;
                        const isSelected = answers[question.id] === option;
                        
                        return (
                          <Button
                            key={option}
                            variant={isSelected ? "default" : "outline"}
                            className={`w-full justify-start text-left p-4 h-auto ${
                              isSelected ? 'bg-primary text-primary-foreground' : 'hover:bg-muted'
                            }`}
                            onClick={() => handleAnswer(question.id, option)}
                          >
                            <div className="flex items-start space-x-3">
                              <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center flex-shrink-0 mt-0.5 ${
                                isSelected ? 'border-primary-foreground bg-primary-foreground text-primary' : 'border-muted-foreground'
                              }`}>
                                {option}
                              </div>
                              <div className="text-wrap">{optionText}</div>
                            </div>
                          </Button>
                        );
                      })}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>

        {/* Navigation Panel */}
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Question Navigator</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-5 gap-2">
                {questions.map((_, index) => (
                  <Button
                    key={index}
                    variant={
                      index === currentQuestionIndex 
                        ? "default" 
                        : answers[questions[index].id] 
                        ? "secondary" 
                        : "outline"
                    }
                    size="sm"
                    className={`relative ${flaggedQuestions.has(index) ? 'ring-2 ring-warning' : ''}`}
                    onClick={() => {
                      if (displayMode === 'all') {
                        // Scroll to question in all mode
                        const questionElement = document.getElementById(`question-${index}`);
                        if (questionElement) {
                          questionElement.scrollIntoView({ behavior: 'smooth', block: 'start' });
                        }
                      } else {
                        // Navigate to question in single mode
                        navigateToQuestion(index);
                      }
                    }}
                  >
                    {index + 1}
                    {flaggedQuestions.has(index) && (
                      <Flag className="w-2 h-2 absolute -top-1 -right-1 fill-current text-warning" />
                    )}
                  </Button>
                ))}
              </div>
              
              <div className="mt-4 space-y-2 text-xs">
                <div className="flex items-center space-x-2">
                  <div className="w-3 h-3 bg-primary rounded"></div>
                  <span>{displayMode === 'single' ? 'Current' : 'Viewing'}</span>
                </div>
                <div className="flex items-center space-x-2">
                  <div className="w-3 h-3 bg-secondary rounded"></div>
                  <span>Answered</span>
                </div>
                <div className="flex items-center space-x-2">
                  <div className="w-3 h-3 border border-muted-foreground rounded"></div>
                  <span>Not Answered</span>
                </div>
                <div className="flex items-center space-x-2">
                  <div className="w-3 h-3 border-2 border-warning rounded"></div>
                  <span>Flagged</span>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <Button 
                onClick={() => initiateSubmission('manual')}
                disabled={isSubmitting || Object.keys(answers).length === 0}
                className="w-full bg-quiz hover:bg-quiz/90"
              >
                {isSubmitting ? 'Submitting...' : 'Submit Test'}
              </Button>
              
              <Button
                onClick={handlePause}
                disabled={isSubmitting}
                variant="outline"
                className="w-full mt-3"
              >
                <Pause className="w-4 h-4 mr-2" />
                {isSubmitting ? 'Pausing...' : 'Pause Test'}
              </Button>
              
              <div className="mt-4 text-xs text-muted-foreground text-center space-y-1">
                <p>Questions answered: {getAnsweredCount()}/{questions.length}</p>
                <p>Questions flagged: {flaggedQuestions.size}</p>
                <div className="flex items-center justify-center space-x-2 mt-2">
                  {isSaving ? (
                    <div className="flex items-center text-warning">
                      <Save className="w-3 h-3 mr-1 animate-spin" />
                      <span>Auto-saving...</span>
                    </div>
                  ) : lastSaved ? (
                    <div className="flex items-center text-success">
                      <Check className="w-3 h-3 mr-1" />
                      <span>Auto-saved</span>
                    </div>
                  ) : null}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Enhanced Submission Flow - Review Modal */}
      <AlertDialog open={showReviewDialog} onOpenChange={setShowReviewDialog}>
        <AlertDialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center text-xl">
              <AlertTriangle className="w-6 h-6 mr-2 text-warning" />
              Review Your Test Before Submission
            </AlertDialogTitle>
            <AlertDialogDescription className="space-y-4">
              <div className="bg-muted p-4 rounded-lg">
                <h4 className="text-center font-semibold mb-2">Test Summary:</h4>
                <div className="md:grid md:grid-cols-2 gap-4 text-sm">
                  <div>Questions Answered: <strong>{Object.keys(answers).length}/{questions.length}</strong></div>
                  <div>Questions Flagged: <strong>{Array.from(flaggedQuestions).length}</strong></div>
                  <div>Time Remaining: <strong className={timeLeft <= 300 ? "text-destructive" : ""}>{formatTime(timeLeft)}</strong></div>
                </div>
              </div>

              {unansweredQuestions.length > 0 && (
                <div className="bg-destructive/10 border border-destructive/20 p-4 rounded-lg">
                  <h4 className="font-semibold text-destructive mb-2 flex items-center">
                    <AlertTriangle className="w-4 h-4 mr-1" />
                    {unansweredQuestions.length} Unanswered Questions
                  </h4>
                  <p className="text-sm text-destructive mb-3">
                    The following questions haven't been answered yet. You can still submit, but these will be marked as incorrect.
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {unansweredQuestions.slice(0, 20).map((questionIndex) => (
                      <Button
                        key={questionIndex}
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          navigateToQuestion(questionIndex);
                          setShowReviewDialog(false);
                        }}
                        className="h-8 px-2 text-xs border-destructive text-destructive hover:bg-destructive hover:text-destructive-foreground"
                      >
                        Q{questionIndex + 1}
                      </Button>
                    ))}
                    {unansweredQuestions.length > 20 && (
                      <span className="text-xs text-muted-foreground self-center">
                        ...and {unansweredQuestions.length - 20} more
                      </span>
                    )}
                  </div>
                </div>
              )}

              {getFlaggedUnansweredQuestions().length > 0 && (
                <div className="bg-warning/10 border border-warning/20 p-4 rounded-lg">
                  <h4 className="font-semibold text-warning mb-2 flex items-center">
                    <Flag className="w-4 h-4 mr-1" />
                    Flagged & Unanswered Questions
                  </h4>
                  <p className="text-sm mb-3">
                    These questions are flagged for review but haven't been answered:
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {getFlaggedUnansweredQuestions().slice(0, 10).map((questionIndex) => (
                      <Button
                        key={questionIndex}
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          navigateToQuestion(questionIndex);
                          setShowReviewDialog(false);
                        }}
                        className="h-8 px-2 text-xs border-warning text-warning hover:bg-warning hover:text-warning-foreground"
                      >
                        Q{questionIndex + 1}
                      </Button>
                    ))}
                  </div>
                </div>
              )}

              <div className="bg-info/10 border border-info/20 p-4 rounded-lg">
                <h4 className="font-semibold mb-2">Important Reminders:</h4>
                <ul className="text-sm space-y-1 list-disc list-inside">
                  <li>Once submitted, you cannot change your answers</li>
                  <li>Unanswered questions will be marked as incorrect</li>
                  <li>Your progress has been automatically saved</li>
                  <li>You have used {test.test_attempts?.length || 0} of {test.max_attempts} allowed attempts</li>
                </ul>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex-col sm:flex-row gap-2">
            <AlertDialogCancel onClick={() => setShowReviewDialog(false)}>
              Continue Testing
            </AlertDialogCancel>
            {unansweredQuestions.length > 0 && (
              <Button
                variant="outline"
                onClick={() => {
                  navigateToQuestion(unansweredQuestions[0]);
                  setShowReviewDialog(false);
                }}
              >
                Go to First Unanswered
              </Button>
            )}
            <Button
              onClick={proceedToFinalConfirmation}
              className="bg-quiz hover:bg-quiz/90"
            >
              Proceed to Submit
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Final Confirmation Modal */}
      <AlertDialog open={showFinalConfirmDialog} onOpenChange={(open) => {
        if (!open) {
          setConfirmationText('');
        }
        setShowFinalConfirmDialog(open);
      }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center text-xl text-destructive">
              <AlertTriangle className="w-6 h-6 mr-2" />
              Final Confirmation Required
            </AlertDialogTitle>
            <AlertDialogDescription className="space-y-4">
              <div className="bg-destructive/10 border border-destructive/20 p-4 rounded-lg">
                <p className="font-semibold text-destructive mb-2">⚠️ This action cannot be undone!</p>
                <p className="text-sm">
                  You are about to finalize your test submission. After clicking "Submit Test", 
                  you will not be able to make any changes to your answers.
                </p>
              </div>
              
              <div className="text-center space-y-2">
                <div className="grid grid-cols-2 gap-4 text-sm bg-muted p-3 rounded">
                  <div className="text-lg font-semibold">Final Summary:</div>
                  <div className="flex items-center justify-center">Answered: <strong>{Object.keys(answers).length}/{questions.length}</strong></div>
                </div>
              </div>

              <p className="text-center text-sm text-muted-foreground">
                Type "SUBMIT" below to confirm your submission:
              </p>
              <input
                type="text"
                placeholder="Type SUBMIT to confirm"
                className="w-full px-3 py-2 border rounded-md text-center"
                value={confirmationText}
                onChange={(e) => setConfirmationText(e.target.value)}
              />
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => {
              setShowFinalConfirmDialog(false);
              setConfirmationText('');
            }}>
              Cancel
            </AlertDialogCancel>
            <Button
              onClick={() => handleSubmit('manual', 'Manual submission by user', true)}
              disabled={confirmationText.toUpperCase() !== 'SUBMIT' || isSubmitting}
              className="bg-destructive hover:bg-destructive/90"
            >
              {isSubmitting ? 'Submitting...' : 'Submit Test'}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};
