import React, { useState, useEffect, useCallback, useRef } from 'react';
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

interface PaperInterfaceProps {
  paper: {
    id: string;
    title: string;
    start_time: string;
    end_time: string;
    max_attempts: number;
    time_limit_hours?: number;
    time_limit_minutes?: number;
    time_limit_minutes_total?: number;
    total_questions: number;
    subjects: { name: string };
    paper_attempts: Array<{ attempt_number: number; completed_at: string | null }>;
  };
  onComplete: () => void;
  displayMode?: 'single' | 'all';
}

export const PaperInterface = ({ paper, onComplete, displayMode = 'single' }: PaperInterfaceProps) => {
  const [questions, setQuestions] = useState<Question[]>([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [flaggedQuestions, setFlaggedQuestions] = useState<Set<number>>(new Set());
  const [timeLeft, setTimeLeft] = useState(() => {
    const hours = paper.time_limit_hours || Math.floor((paper.time_limit_minutes_total || 60) / 60);
    const minutes = paper.time_limit_minutes || ((paper.time_limit_minutes_total || 60) % 60);
    return (hours * 60 + minutes) * 60;
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showReviewDialog, setShowReviewDialog] = useState(false);
  const [showFinalConfirmDialog, setShowFinalConfirmDialog] = useState(false);
  const [unansweredQuestions, setUnansweredQuestions] = useState<number[]>([]);
  const [paperAttemptId, setPaperAttemptId] = useState<string | null>(null);
  const [showSecurityModal, setShowSecurityModal] = useState(false);
  const [showFullscreenPrompt, setShowFullscreenPrompt] = useState(false);
  const [testExpired, setTestExpired] = useState(false);
  const [confirmationText, setConfirmationText] = useState<string>('');
  
  // Auto-save states
  const [isSaving, setIsSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [saveQueue, setSaveQueue] = useState<any[]>([]);
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const [serverTime, setServerTime] = useState<Date>(new Date());
  
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
    activateSecurity,
    deactivateSecurity,
    enableFullscreen,
    addViolation
  } = useTestSecurity({
    testAttemptId: paperAttemptId,
    enabled: true,
    onAutoSubmit: handleForceSubmit,
    maxViolations: 3
  });

  // Check if paper attempt is within time limits
  const validatePaperTimeLimit = useCallback(async (attemptData: any) => {
    const now = new Date();
    const paperEndTime = new Date(paper.end_time);
    const attemptStartTime = new Date(attemptData.started_at);
    
    // Calculate individual attempt time limit
    const totalMinutes = paper.time_limit_minutes_total || 
                        (paper.time_limit_hours || 1) * 60 + (paper.time_limit_minutes || 0);
    const timeLimitMs = totalMinutes * 60000;
    const attemptEndTime = new Date(attemptStartTime.getTime() + timeLimitMs);
    
    // Check if paper window has expired
    if (now > paperEndTime) {
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
  }, [paper, onComplete, toast]);

  // Network status monitoring
  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      setTimeout(() => {
        processSaveQueue();
      }, 100);
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
  }, []);

  // Initialize paper and check time limits
  useEffect(() => {
    initializePaper();
    
    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, []);

  // Simplified security activation - just start monitoring, no fullscreen requirement
  useEffect(() => {
    if (paperAttemptId && !isSecurityActive && !testExpired) {
      // Start security monitoring immediately
      activateSecurity();
      
      // Prompt user to go fullscreen but don't block test
      setShowFullscreenPrompt(true);
    }
  }, [paperAttemptId, isSecurityActive, testExpired, activateSecurity]);

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
    if (!paperAttemptId || (isSubmitting && !isGracePeriod)) return;

    const progressData = {
      paperAttemptId,
      answers,
      currentQuestionIndex,
      progressPercentage: Math.round((Object.keys(answers).length / questions.length) * 100),
      timeRemaining: Math.max(0, timeLeft),
      flaggedQuestions: Array.from(flaggedQuestions),
      paperId: paper.id
    };

    if (!isOnline && !forceSync && !isGracePeriod) {
      setSaveQueue(prev => [...prev, progressData]);
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
  }, [paperAttemptId, answers, currentQuestionIndex, timeLeft, flaggedQuestions, questions.length, paper.id, isOnline, isSubmitting]);

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
      if (data?.serverTime) {
        setServerTime(new Date(data.serverTime));
      }

      if (saveResponseTime > 10000 && timeLeft <= 60) {
        toast({
          title: "Save Delay Warning",
          description: "Saves are taking longer than usual. Consider submitting soon.",
          variant: "destructive"
        });
      }

      setSaveQueue([]);

    } catch (error) {
      console.error('Save failed:', error);
      
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
      
      // Queue for retry if online
      if (isOnline) {
        setSaveQueue(prev => [...prev, progressData]);
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
  }, []);

  // Phase 2: Single server time sync at test start only
  const [clientServerOffset, setClientServerOffset] = useState(0);
  
  useEffect(() => {
    if (!paperAttemptId) return;

    const syncServerTime = async () => {
      try {
        const clientTimeBefore = Date.now();
        const { data } = await supabase.functions.invoke('save-paper-progress', {
          body: {
            paperAttemptId: 'sync-time',
            answers: {},
            currentQuestionIndex: 0,
            progressPercentage: 0,
            timeRemaining: 0,
            flaggedQuestions: [],
            paperId: paper.id
          }
        });
        
        if (data?.serverTime) {
          const serverTime = new Date(data.serverTime).getTime();
          const clientTimeAfter = Date.now();
          const clientTimeMidpoint = (clientTimeBefore + clientTimeAfter) / 2;
          
          // Calculate offset: positive means server is ahead
          const offset = serverTime - clientTimeMidpoint;
          setClientServerOffset(offset);
          setServerTime(new Date(serverTime));
          
          console.log('Time sync complete. Offset:', offset, 'ms');
        }
      } catch (error) {
        console.log('Time sync failed:', error);
      }
    };

    // Sync only once at test start
    syncServerTime();
  }, [paperAttemptId, paper.id]);

  const initializePaper = async () => {
    try {
      const { data: { user: authUser } } = await supabase.auth.getUser();
      if (!authUser) {
        throw new Error('User not authenticated');
      }

      // Check for existing active attempt first
      const { data: existingAttempt, error: existingError } = await supabase
        .from('paper_attempts')
        .select('*')
        .eq('paper_id', paper.id)
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
        const isValid = await validatePaperTimeLimit(attemptData);
        if (!isValid) {
          return;
        }
        
        // Restore state from existing attempt
        setPaperAttemptId(attemptData.id);
        setCurrentQuestionIndex(attemptData.current_question_index || 0);
        
        if (attemptData.answers && attemptData.answers.encrypted) {
          try {
            const decryptedAnswers = JSON.parse(atob(attemptData.answers.encrypted));
            setAnswers(decryptedAnswers);
          } catch (error) {
            console.error('Error decrypting answers:', error);
            if (attemptData.answers && typeof attemptData.answers === 'object') {
              setAnswers(attemptData.answers);
            }
          }
        } else if (attemptData.answers && typeof attemptData.answers === 'object') {
          setAnswers(attemptData.answers);
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
        const attemptNumber = (paper.paper_attempts?.length || 0) + 1;
        const startTime = new Date();
        
        // Check if we're still within the paper window
        const paperEndTime = new Date(paper.end_time);
        if (startTime > paperEndTime) {
          toast({
            title: "Test Expired",
            description: "The test window has closed. You can no longer start this test.",
            variant: "destructive"
          });
          onComplete();
          return;
        }
        
        const { data: newAttempt, error: attemptError } = await supabase
          .from('paper_attempts')
          .insert({
            paper_id: paper.id,
            user_id: authUser.id,
            attempt_number: attemptNumber,
            started_at: startTime.toISOString(),
            current_question_index: 0,
            progress_percentage: 0,
            time_remaining: timeLeft,
            answers: {},
            show_results: false
          })
          .select()
          .single();

        if (attemptError) throw attemptError;
        
        setPaperAttemptId(newAttempt.id);
        
        toast({
          title: "Test Started",
          description: `Beginning attempt ${attemptNumber} of ${paper.max_attempts}`,
          variant: "default"
        });
      }

      // Load questions for the paper
      const { data: paperQuestions, error: questionsError } = await supabase
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
        .eq('question_paper_id', paper.id)
        .order('question_order');

      if (questionsError) throw questionsError;

      const formattedQuestions: Question[] = paperQuestions.map(pq => ({
        id: pq.questions.id,
        question_text: pq.questions.question_text,
        option_a: pq.questions.option_a,
        option_b: pq.questions.option_b,
        option_c: pq.questions.option_c,
        option_d: pq.questions.option_d,
        question_order: pq.question_order
      }));

      setQuestions(formattedQuestions);

    } catch (error: any) {
      console.error('Failed to initialize paper:', error);
      toast({
        title: "Initialization Error",
        description: error.message,
        variant: "destructive"
      });
      onComplete();
    }
  };

  const processSaveQueue = async () => {
    if (saveQueue.length === 0 || !isOnline) return;
    
    const queue = [...saveQueue];
    setSaveQueue([]);
    
    for (const item of queue) {
      await debouncedSave(true);
    }
  };

  const handleAutoSubmit = async () => {
    if (isSubmitting) return;
    
    setConfirmationText('Test time has expired. Auto-submitting...');
    await handleSubmit('auto', 'Time limit reached');
  };

  const handleSubmit = async (submitType = 'manual', reason = '', skipDialog = false) => {
    if (isSubmitting) return;
    
    setIsSubmitting(true);
    setConfirmationText(submitType === 'auto' ? `Auto-submitting: ${reason}` : 'Submitting your test...');

    try {
      const submissionTime = new Date();
      
      let score = 0;
      let totalQuestions = questions.length;
      
      if (answers && Object.keys(answers).length > 0) {
        const { data: correctAnswers, error: correctError } = await supabase
          .from('question_paper_questions')
          .select(`
            questions (id, correct_answer)
          `)
          .eq('question_paper_id', paper.id);

        if (!correctError && correctAnswers) {
          const answerKey = correctAnswers.reduce((acc, item) => {
            if (item.questions) {
              acc[item.questions.id] = item.questions.correct_answer;
            }
            return acc;
          }, {} as Record<string, string>);

          let correct = 0;
          Object.entries(answers).forEach(([questionId, answer]) => {
            if (answerKey[questionId] === answer) {
              correct++;
            }
          });
          score = totalQuestions > 0 ? Math.round((correct / totalQuestions) * 100) : 0;
        }
      }

      const { error: submitError } = await supabase
        .from('paper_attempts')
        .update({
          answers: {
            encrypted: btoa(JSON.stringify(answers)),
            flagged: btoa(JSON.stringify(Array.from(flaggedQuestions))),
            lastSaved: submissionTime.toISOString(),
            submitType,
            submitReason: reason || (submitType === 'manual' ? 'Manual submission' : 'Auto submission')
          },
          current_question_index: currentQuestionIndex,
          progress_percentage: Math.round((Object.keys(answers).length / questions.length) * 100),
          completed_at: submissionTime.toISOString(),
          time_remaining: Math.max(0, timeLeft),
          score: score,
          total_questions: totalQuestions,
          is_paused: false
        })
        .eq('id', paperAttemptId);

      if (submitError) throw submitError;

      toast({
        title: "Test Submitted Successfully",
        description: `Your test has been submitted with a score of ${score}%.`,
        variant: "default"
      });

      // Deactivate security and clean up
      deactivateSecurity();
      onComplete();

    } catch (error: any) {
      console.error('Submission failed:', error);
      toast({
        title: "Submission Failed",
        description: error.message,
        variant: "destructive"
      });
      setIsSubmitting(false);
    }
  };

  const formatTimeLeft = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    
    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${minutes}:${secs.toString().padStart(2, '0')}`;
  };

  const getTimeColor = (seconds: number) => {
    if (seconds <= 60) return 'text-red-600';
    if (seconds <= 300) return 'text-yellow-600';
    return 'text-green-600';
  };

  const handleAnswerChange = (questionId: string, answer: string) => {
    setAnswers(prev => ({
      ...prev,
      [questionId]: answer
    }));
    
    // Debounced auto-save
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }
    
    saveTimeoutRef.current = setTimeout(() => {
      debouncedSave();
    }, 500);
  };

  const toggleFlag = (index: number) => {
    setFlaggedQuestions(prev => {
      const newSet = new Set(prev);
      if (newSet.has(index)) {
        newSet.delete(index);
      } else {
        newSet.add(index);
      }
      return newSet;
    });
  };

  const handleReview = () => {
    const unanswered = questions
      .map((q, index) => ({ question: q, index }))
      .filter(({ question }) => !answers[question.id])
      .map(({ index }) => index);
    
    setUnansweredQuestions(unanswered);
    setShowReviewDialog(true);
  };

  const handleFinalSubmission = () => {
    setShowReviewDialog(false);
    setShowFinalConfirmDialog(true);
  };

  const confirmSubmission = () => {
    setShowFinalConfirmDialog(false);
    handleSubmit('manual', 'User confirmed submission');
  };

  const currentQuestion = questions[currentQuestionIndex];
  const progressPercentage = (Object.keys(answers).length / questions.length) * 100;

  if (!currentQuestion) {
    return (
      <Card className="max-w-4xl mx-auto">
        <CardContent className="p-8">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
            <p>Loading test questions...</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="max-w-6xl mx-auto space-y-4">
      {/* Security and Status Bar */}
      <Card className="bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-200">
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2">
                <Shield className={`h-5 w-5 ${isSecurityActive ? 'text-green-600' : 'text-gray-400'}`} />
                <span className="text-sm font-medium">
                  Security: {isSecurityActive ? 'Active' : 'Inactive'}
                </span>
              </div>
              
              <div className="flex items-center space-x-2">
                {isOnline ? (
                  <Wifi className="h-4 w-4 text-green-600" />
                ) : (
                  <WifiOff className="h-4 w-4 text-red-600" />
                )}
                <span className="text-sm">{isOnline ? 'Online' : 'Offline'}</span>
              </div>

              {isSaving && (
                <div className="flex items-center space-x-2 text-blue-600">
                  <Save className="h-4 w-4 animate-pulse" />
                  <span className="text-sm">Saving...</span>
                </div>
              )}

              {lastSaved && !isSaving && (
                <div className="flex items-center space-x-2 text-green-600">
                  <Check className="h-4 w-4" />
                  <span className="text-sm">Saved {lastSaved.toLocaleTimeString()}</span>
                </div>
              )}
            </div>

            <div className="flex items-center space-x-4">
              <div className={`text-2xl font-mono font-bold ${getTimeColor(timeLeft)}`}>
                {formatTimeLeft(timeLeft)}
              </div>
              
              {violations.length > 0 && (
                <Badge variant="destructive" className="animate-pulse">
                  {violations.length} Warning{violations.length > 1 ? 's' : ''}
                </Badge>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Main Test Interface */}
      <div className="grid lg:grid-cols-4 gap-4">
        {/* Question Panel */}
        <div className="lg:col-span-3 space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center space-x-2">
                  <span>Question {currentQuestionIndex + 1} of {questions.length}</span>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => toggleFlag(currentQuestionIndex)}
                    className={flaggedQuestions.has(currentQuestionIndex) ? 'text-yellow-600' : 'text-gray-400'}
                  >
                    <Flag className="h-4 w-4" />
                  </Button>
                </CardTitle>
                
                <div className="flex items-center space-x-2">
                  <Progress value={progressPercentage} className="w-32" />
                  <span className="text-sm text-muted-foreground">
                    {Math.round(progressPercentage)}%
                  </span>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="text-lg font-medium leading-relaxed">
                {currentQuestion.question_text}
              </div>

              <div className="space-y-3">
                {['A', 'B', 'C', 'D'].map((option) => (
                  <label
                    key={option}
                    className={`flex items-start space-x-3 p-4 border rounded-lg cursor-pointer transition-colors
                      ${answers[currentQuestion.id] === option 
                        ? 'border-blue-500 bg-blue-50' 
                        : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                      }`}
                  >
                    <input
                      type="radio"
                      name={`question-${currentQuestion.id}`}
                      value={option}
                      checked={answers[currentQuestion.id] === option}
                      onChange={(e) => handleAnswerChange(currentQuestion.id, e.target.value)}
                      className="mt-1"
                    />
                    <div className="flex-1">
                      <div className="font-medium">{option}.</div>
                      <div className="text-gray-700">
                        {currentQuestion[`option_${option.toLowerCase()}` as keyof Question]}
                      </div>
                    </div>
                  </label>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Navigation */}
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <Button
                  variant="outline"
                  onClick={() => setCurrentQuestionIndex(Math.max(0, currentQuestionIndex - 1))}
                  disabled={currentQuestionIndex === 0}
                  className="flex items-center space-x-2"
                >
                  <ArrowLeft className="h-4 w-4" />
                  <span>Previous</span>
                </Button>

                <div className="flex items-center space-x-2">
                  <Button
                    variant="outline"
                    onClick={handleReview}
                    className="flex items-center space-x-2"
                  >
                    <Eye className="h-4 w-4" />
                    <span>Review & Submit</span>
                  </Button>
                </div>

                <Button
                  variant="outline"
                  onClick={() => setCurrentQuestionIndex(Math.min(questions.length - 1, currentQuestionIndex + 1))}
                  disabled={currentQuestionIndex === questions.length - 1}
                  className="flex items-center space-x-2"
                >
                  <span>Next</span>
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Question Navigator */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Question Navigator</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-5 gap-2">
              {questions.map((_, index) => (
                <Button
                  key={index}
                  variant={currentQuestionIndex === index ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setCurrentQuestionIndex(index)}
                  className={`relative ${
                    answers[questions[index].id] 
                      ? 'bg-green-100 border-green-300 text-green-800' 
                      : ''
                  } ${
                    flaggedQuestions.has(index) 
                      ? 'ring-2 ring-yellow-400' 
                      : ''
                  }`}
                >
                  {index + 1}
                  {flaggedQuestions.has(index) && (
                    <Flag className="h-3 w-3 absolute -top-1 -right-1 text-yellow-600" />
                  )}
                </Button>
              ))}
            </div>
            
            <div className="mt-4 space-y-2 text-sm">
              <div className="flex items-center space-x-2">
                <div className="w-4 h-4 bg-green-100 border-green-300 border rounded"></div>
                <span>Answered</span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-4 h-4 border-2 border-yellow-400 rounded"></div>
                <span>Flagged</span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-4 h-4 border border-gray-300 rounded"></div>
                <span>Not answered</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Modals and Dialogs */}
      <SecurityWarningModal
        open={showSecurityModal}
        onClose={() => setShowSecurityModal(false)}
        onContinue={() => {
          setShowSecurityModal(false);
        }}
        onTerminate={() => {
          // Auto-submit the test
          handleSubmit('force', 'Security violations exceeded');
        }}
        violations={violations}
        violationCount={violations.length}
        maxViolations={3}
        canContinue={violations.length < 3}
      />

      {/* Fullscreen Prompt */}
      <AlertDialog open={showFullscreenPrompt} onOpenChange={setShowFullscreenPrompt}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <Maximize className="h-5 w-5" />
              Fullscreen Recommended
            </AlertDialogTitle>
            <AlertDialogDescription>
              For the best test-taking experience and to minimize distractions, we recommend using fullscreen mode. 
              This is optional, but exiting fullscreen during the test will be logged as a security event.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setShowFullscreenPrompt(false)}>
              Continue Without Fullscreen
            </AlertDialogCancel>
            <AlertDialogAction onClick={() => {
              enableFullscreen();
              setShowFullscreenPrompt(false);
            }}>
              Enable Fullscreen
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Review Dialog */}
      <AlertDialog open={showReviewDialog} onOpenChange={setShowReviewDialog}>
        <AlertDialogContent className="max-w-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle>Review Your Answers</AlertDialogTitle>
            <AlertDialogDescription>
              Please review your test before submitting. You have answered {Object.keys(answers).length} out of {questions.length} questions.
            </AlertDialogDescription>
          </AlertDialogHeader>
          
          <div className="max-h-96 overflow-y-auto space-y-2">
            {unansweredQuestions.length > 0 && (
              <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                <h4 className="font-medium text-yellow-800 mb-2">Unanswered Questions:</h4>
                <div className="flex flex-wrap gap-2">
                  {unansweredQuestions.map(index => (
                    <Badge key={index} variant="outline" className="text-yellow-700">
                      Question {index + 1}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
            
            {flaggedQuestions.size > 0 && (
              <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <h4 className="font-medium text-blue-800 mb-2">Flagged Questions:</h4>
                <div className="flex flex-wrap gap-2">
                  {Array.from(flaggedQuestions).map(index => (
                    <Badge key={index} variant="outline" className="text-blue-700">
                      Question {index + 1}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
          </div>
          
          <AlertDialogFooter>
            <AlertDialogCancel>Continue Editing</AlertDialogCancel>
            <AlertDialogAction onClick={handleFinalSubmission}>
              Proceed to Submit
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Final Confirmation Dialog */}
      <AlertDialog open={showFinalConfirmDialog} onOpenChange={setShowFinalConfirmDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-red-500" />
              Final Submission Confirmation
            </AlertDialogTitle>
            <AlertDialogDescription>
              This will submit your test permanently. You cannot make any changes after submission. 
              Are you absolutely sure you want to submit now?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isSubmitting}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction 
              onClick={confirmSubmission}
              disabled={isSubmitting}
              className="bg-red-600 hover:bg-red-700"
            >
              {isSubmitting ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Submitting...
                </>
              ) : (
                'Submit Test'
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Submission Progress */}
      {isSubmitting && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <Card className="w-96">
            <CardContent className="p-8 text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
              <h3 className="text-lg font-medium mb-2">Submitting Your Test</h3>
              <p className="text-sm text-muted-foreground">{confirmationText}</p>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
};