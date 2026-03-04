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
import { cn } from '@/lib/utils';
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
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
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
    
    // For resumed attempts, use stored time_remaining if available
    if (attemptData.time_remaining !== null && attemptData.time_remaining !== undefined) {
      const remainingSeconds = Math.max(0, attemptData.time_remaining);
      
      // Check if stored time has expired
      if (remainingSeconds <= 0) {
        toast({
          title: "Attempt Time Expired",
          description: "Your individual attempt time has expired. The test will be auto-submitted.",
          variant: "destructive"
        });
        // Auto-submit the expired attempt
        await handleSubmit('auto', 'Individual attempt time limit exceeded', true);
        return false;
      }
      
      setTimeLeft(remainingSeconds);
    } else {
      // For new attempts, calculate from start time
      const attemptStartTime = new Date(attemptData.started_at);
      const totalMinutes = test.question_papers?.time_limit_minutes || 
                          (test.time_limit_hours || 1) * 60 + (test.time_limit_minutes || 0);
      const timeLimitMs = totalMinutes * 60000;
      const attemptEndTime = new Date(attemptStartTime.getTime() + timeLimitMs);
      
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
    }
    
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
      setHasUnsavedChanges(false);

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
    setAnswers(prev => {
      // If clicking the already selected option, unselect it
      if (prev[questionId] === answer) {
        const newAnswers = { ...prev };
        delete newAnswers[questionId];
        return newAnswers;
      }
      // Otherwise, select the new option
      return {
        ...prev,
        [questionId]: answer
      };
    });
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
      <div className="min-h-screen w-full flex items-center justify-center p-4">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground font-medium">{isSubmitting ? "Submitting test..." : "Loading test..."}</p>
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
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
               <div>
                  <div className="flex flex-wrap items-center gap-3 mb-1">
                    <CardTitle className="text-xl">{test.title}</CardTitle>
                    <Badge variant={isSecurityActive ? "secondary" : "destructive"} className="text-xs bg-muted">
                      {isSecurityActive ? <Shield className="w-3 h-3 mr-1 text-success" /> : <AlertTriangle className="w-3 h-3 mr-1" />}
                      {isSecurityActive ? 'Secure' : 'Unsecured'}
                    </Badge>
                    {violationCount > 0 && (
                      <Badge variant="destructive" className="flex items-center text-xs">
                        <AlertTriangle className="w-3 h-3 mr-1" />
                        Violations: {violationCount}/3
                      </Badge>
                    )}
                  </div>
                  <CardDescription>{test.question_papers.subjects_parent.subject_name}</CardDescription>
               </div>
               
               <div className="flex flex-wrap items-center gap-3">
                  <div className="flex items-center text-xs px-2.5 py-1.5 bg-muted/50 rounded-md border text-muted-foreground whitespace-nowrap">
                    {isSaving ? (
                      <div className="flex items-center">
                        <Save className="w-3.5 h-3.5 mr-1.5 animate-spin" />
                        <span>Saving...</span>
                      </div>
                    ) : hasUnsavedChanges ? (
                      <div className="flex items-center text-warning animate-pulse">
                        <AlertTriangle className="w-3.5 h-3.5 mr-1.5" />
                        <span className="font-medium">Unsaved</span>
                      </div>
                    ) : lastSaved ? (
                      <div className="flex items-center text-success">
                        <Check className="w-3.5 h-3.5 mr-1.5" />
                        <span>Saved {new Date(lastSaved).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                      </div>
                    ) : (
                       <div className="flex items-center">
                         <span className="w-2 h-2 rounded-full bg-muted-foreground/30 mr-1.5"></span>
                         <span>Not saved yet</span>
                       </div>
                    )}
                    
                    {!isOnline && (
                      <>
                        <span className="mx-2.5 border-l border-border h-3.5"></span>
                        <div className="flex items-center text-destructive font-medium">
                          <WifiOff className="w-3.5 h-3.5 mr-1.5" />
                          <span>Offline</span>
                        </div>
                      </>
                    )}
                  </div>

                  <Badge variant={timeLeft <= 300 ? "destructive" : "default"} className="flex flex-shrink-0 items-center text-lg px-3 py-1 bg-quiz shadow-sm font-mono tracking-wider">
                    <Clock className="w-4 h-4 mr-2" />
                    {formatTime(timeLeft)}
                  </Badge>
               </div>
            </div>
            
            <div className="mt-4">
              <div className="flex justify-between items-end mb-1.5">
                <div className="text-sm text-muted-foreground font-medium">
                  {displayMode === 'single' && (
                    <span className="mr-3 hidden sm:inline-block">Question <span className="text-foreground">{currentQuestionIndex + 1}</span> of {questions.length}</span>
                  )}
                  <span>Answered: <span className="text-foreground">{getAnsweredCount()} / {questions.length}</span></span>
                </div>
                <div className="text-sm font-medium text-foreground">
                  {Math.round((getAnsweredCount() / questions.length) * 100)}%
                </div>
              </div>
              <Progress 
                value={(getAnsweredCount() / questions.length) * 100} 
                className="h-2"
              />
            </div>
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
                  <div className="flex items-center space-x-3">
                    {flaggedQuestions.has(currentQuestionIndex) && (
                      <Badge variant="outline" className="bg-warning/10 text-warning border-warning/50">
                        <Flag className="w-3 h-3 mr-1 fill-current" />
                        Flagged
                      </Badge>
                    )}
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => toggleFlag(currentQuestionIndex)}
                      className={flaggedQuestions.has(currentQuestionIndex) ? 'bg-warning/20 hover:bg-warning/30 border-warning border-2' : ''}
                    >
                      <Flag className={`w-4 h-4 ${flaggedQuestions.has(currentQuestionIndex) ? 'fill-current text-warning' : 'text-muted-foreground'}`} />
                      <span className="ml-2 hidden sm:inline">{flaggedQuestions.has(currentQuestionIndex) ? 'Unflag' : 'Flag Question'}</span>
                    </Button>
                  </div>
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
                        className={`relative w-full justify-start text-left py-4 pr-4 pl-4 h-auto border-2 transition-all overflow-visible ${
                          isSelected 
                            ? 'border-primary bg-primary text-primary-foreground shadow-md' 
                            : 'border-muted hover:border-primary/50 hover:bg-muted/50'
                        }`}
                        onClick={() => handleAnswer(currentQuestion.id, option)}
                      >
                        <div className={`absolute left-0 top-1/2 -translate-y-1/2 -translate-x-1/2 w-8 h-8 rounded-full border-2 flex items-center justify-center flex-shrink-0 font-bold bg-background ${
                          isSelected 
                            ? 'border-primary text-primary shadow-sm' 
                            : 'border-muted-foreground text-muted-foreground'
                        }`}>
                          {option}
                        </div>
                        <div className="text-wrap text-base ml-2">{optionText}</div>
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
                            className={`relative w-full justify-start text-left py-4 pr-4 pl-4 h-auto border-2 transition-all overflow-visible ${
                              isSelected 
                                ? 'border-primary bg-primary text-primary-foreground shadow-md' 
                                : 'border-muted hover:border-primary/50 hover:bg-muted/50'
                            }`}
                            onClick={() => handleAnswer(question.id, option)}
                          >
                            <div className={`absolute left-0 top-1/2 -translate-y-1/2 -translate-x-1/2 w-8 h-8 rounded-full border-2 flex items-center justify-center flex-shrink-0 font-bold bg-background ${
                              isSelected 
                                ? 'border-primary text-primary shadow-sm' 
                                : 'border-muted-foreground text-muted-foreground'
                            }`}>
                              {option}
                            </div>
                            <div className="text-wrap text-base ml-2 leading-tight">{optionText}</div>
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
        <div className="space-y-4 lg:sticky lg:top-4 h-fit">
          <Card className="flex flex-col">
            <CardHeader className="pb-3 border-b">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg">Navigator</CardTitle>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="lg:hidden"
                  onClick={() => {
                    const el = document.getElementById('mobile-navigator-content');
                    if (el) el.classList.toggle('hidden');
                  }}
                >
                  Toggle
                </Button>
              </div>
            </CardHeader>
            <CardContent id="mobile-navigator-content" className="hidden lg:block pt-4">
              <div className="grid grid-cols-5 md:grid-cols-8 lg:grid-cols-5 gap-2">
                {questions.map((_, index) => {
                  const isCurrent = index === currentQuestionIndex;
                  const isAnswered = !!answers[questions[index].id];
                  const isFlagged = flaggedQuestions.has(index);
                  
                  return (
                    <Button
                      key={index}
                      variant="outline"
                      size="sm"
                      className={cn(
                        "relative h-10 w-full transition-all border-2",
                        isCurrent && "border-primary bg-primary/10 text-primary font-bold shadow-sm ring-1 ring-primary",
                        !isCurrent && isAnswered && "border-success/50 bg-success/20 text-green-950 dark:text-green-50 font-medium",
                        !isCurrent && !isAnswered && !isFlagged && "border-muted-foreground/30 hover:border-primary/50 text-muted-foreground",
                        isFlagged && "border-warning bg-warning/10 text-warning-foreground shadow-sm"
                      )}
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
                      {isFlagged && (
                        <Flag className="w-3 h-3 absolute -top-1.5 -right-1.5 fill-warning text-warning drop-shadow-sm" />
                       )}
                    </Button>
                  );
                })}
              </div>
              
              <div className="mt-4 space-y-2 text-xs font-medium">
                <div className="flex items-center space-x-2">
                  <div className="w-3 h-3 border-2 border-primary bg-primary/10 rounded-sm"></div>
                  <span>{displayMode === 'single' ? 'Current' : 'Viewing'}</span>
                </div>
                <div className="flex items-center space-x-2">
                  <div className="w-3 h-3 border-2 border-success/50 bg-success/10 rounded-sm"></div>
                  <span>Answered</span>
                </div>
                <div className="flex items-center space-x-2">
                  <div className="w-3 h-3 border-2 border-muted-foreground/30 bg-background rounded-sm"></div>
                  <span>Not Answered</span>
                </div>
                <div className="flex items-center space-x-2">
                  <div className="w-3 h-3 border-2 border-warning bg-warning/10 rounded-sm"></div>
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
              
              <div className="mt-4 text-xs text-muted-foreground text-center space-y-1 pb-2">
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
                        onClick={() => {
                          setShowReviewDialog(false);
                          setTimeout(() => {
                            if (displayMode === 'all') {
                              const el = document.getElementById(`question-${questionIndex}`);
                              if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
                            } else {
                              navigateToQuestion(questionIndex);
                            }
                          }, 100);
                        }}
                        className="h-8 px-2 text-sm border-2 border-destructive text-destructive font-medium hover:bg-destructive hover:text-destructive-foreground transition-colors"
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
                        onClick={() => {
                          setShowReviewDialog(false);
                          setTimeout(() => {
                            if (displayMode === 'all') {
                              const el = document.getElementById(`question-${questionIndex}`);
                              if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
                            } else {
                              navigateToQuestion(questionIndex);
                            }
                          }, 100);
                        }}
                        className="h-8 px-2 text-sm border-2 border-warning text-warning font-medium hover:bg-warning hover:text-warning-foreground transition-colors"
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
                  setShowReviewDialog(false);
                  setTimeout(() => {
                    const firstUnanswered = unansweredQuestions[0];
                    if (displayMode === 'all') {
                      const el = document.getElementById(`question-${firstUnanswered}`);
                      if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
                    } else {
                      navigateToQuestion(firstUnanswered);
                    }
                  }, 100);
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
