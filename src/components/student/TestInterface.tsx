import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { 
  Clock, 
  AlertTriangle, 
  CheckCircle2, 
  ArrowLeft, 
  ArrowRight,
  Flag,
  Eye,
  EyeOff
} from 'lucide-react';

interface Question {
  id: string;
  question_text: string;
  option_a: string;
  option_b: string;
  option_c: string;
  option_d: string;
  correct_answer: string;
  question_order: number;
}

interface TestInterfaceProps {
  test: {
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
    test_attempts: Array<{ attempt_number: number; completed_at: string | null }>;
  };
  onComplete: () => void;
}

export const TestInterface = ({ test, onComplete }: TestInterfaceProps) => {
  const [questions, setQuestions] = useState<Question[]>([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [flaggedQuestions, setFlaggedQuestions] = useState<Set<number>>(new Set());
  const [timeLeft, setTimeLeft] = useState(test.question_papers.time_limit_minutes * 60);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showSubmitDialog, setShowSubmitDialog] = useState(false);
  const [testAttemptId, setTestAttemptId] = useState<string | null>(null);
  const [tabSwitchWarnings, setTabSwitchWarnings] = useState(0);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [preventCheating, setPreventCheating] = useState(true);
  const { user } = useAuth();
  const { toast } = useToast();

  // Initialize test attempt and load questions
  useEffect(() => {
    initializeTest();
    enableFullscreen();
    
    // Prevent right-click, copy, paste, etc.
    if (preventCheating) {
      document.addEventListener('contextmenu', preventContextMenu);
      document.addEventListener('keydown', preventKeyboardShortcuts);
      document.addEventListener('visibilitychange', handleVisibilityChange);
      window.addEventListener('blur', handleWindowBlur);
    }

    return () => {
      document.removeEventListener('contextmenu', preventContextMenu);
      document.removeEventListener('keydown', preventKeyboardShortcuts);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('blur', handleWindowBlur);
      exitFullscreen();
    };
  }, []);

  // Timer countdown
  useEffect(() => {
    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          handleAutoSubmit();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  const initializeTest = async () => {
    try {
      // Create test attempt
      const attemptNumber = (test.test_attempts?.length || 0) + 1;
      const { data: attemptData, error: attemptError } = await supabase
        .from('test_attempts')
        .insert({
          scheduled_test_id: test.id,
          user_id: user?.id,
          attempt_number: attemptNumber,
          started_at: new Date().toISOString()
        })
        .select()
        .single();

      if (attemptError) throw attemptError;
      setTestAttemptId(attemptData.id);

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
            option_d,
            correct_answer
          )
        `)
        .eq('question_paper_id', test.id)
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

  const enableFullscreen = () => {
    if (document.documentElement.requestFullscreen) {
      document.documentElement.requestFullscreen().then(() => {
        setIsFullscreen(true);
      }).catch(() => {
        toast({
          title: "Fullscreen Required",
          description: "Please enable fullscreen mode for the test",
          variant: "destructive"
        });
      });
    }
  };

  const exitFullscreen = () => {
    if (document.exitFullscreen && document.fullscreenElement) {
      document.exitFullscreen();
    }
  };

  const preventContextMenu = (e: Event) => {
    e.preventDefault();
  };

  const preventKeyboardShortcuts = (e: KeyboardEvent) => {
    // Prevent common cheating shortcuts
    if (
      (e.ctrlKey && ['c', 'v', 'x', 'a', 's', 'z', 'y'].includes(e.key.toLowerCase())) ||
      e.key === 'F12' ||
      (e.ctrlKey && e.shiftKey && e.key === 'I') ||
      (e.ctrlKey && e.shiftKey && e.key === 'J')
    ) {
      e.preventDefault();
      toast({
        title: "Action Blocked",
        description: "This action is not allowed during the test",
        variant: "destructive"
      });
    }
  };

  const handleVisibilityChange = () => {
    if (document.hidden) {
      setTabSwitchWarnings(prev => prev + 1);
      toast({
        title: "Warning!",
        description: `Tab switching detected. Warning ${tabSwitchWarnings + 1}/3`,
        variant: "destructive"
      });

      if (tabSwitchWarnings >= 2) {
        toast({
          title: "Test Terminated",
          description: "Too many tab switches. Test will be auto-submitted.",
          variant: "destructive"
        });
        handleAutoSubmit();
      }
    }
  };

  const handleWindowBlur = () => {
    // Additional anti-cheating measure for window focus loss
    handleVisibilityChange();
  };

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

  const calculateScore = useCallback(() => {
    let correct = 0;
    questions.forEach(question => {
      if (answers[question.id] === question.correct_answer) {
        correct++;
      }
    });
    return Math.round((correct / questions.length) * 100);
  }, [questions, answers]);

  const handleSubmit = async () => {
    if (!testAttemptId) return;
    
    setIsSubmitting(true);
    try {
      const score = calculateScore();
      const { error } = await supabase
        .from('test_attempts')
        .update({
          answers: answers,
          score: score,
          total_questions: questions.length,
          completed_at: new Date().toISOString()
        })
        .eq('id', testAttemptId);

      if (error) throw error;

      toast({
        title: "Test Submitted",
        description: `Your score: ${score}%`,
        variant: score >= 70 ? "default" : "destructive"
      });

      onComplete();
    } catch (error) {
      console.error('Error submitting test:', error);
      toast({
        title: "Error",
        description: "Failed to submit test",
        variant: "destructive"
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAutoSubmit = () => {
    if (!isSubmitting) {
      handleSubmit();
    }
  };

  const formatTime = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  const getAnsweredCount = () => {
    return Object.keys(answers).length;
  };

  const currentQuestion = questions[currentQuestionIndex];

  if (!currentQuestion) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p>Loading test...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-4 select-none">
      {/* Header */}
      <div className="max-w-6xl mx-auto mb-6">
        <Card>
          <CardHeader className="pb-4">
            <div className="flex justify-between items-start">
              <div>
                <CardTitle className="text-xl">{test.title}</CardTitle>
                <CardDescription>{test.question_papers.subjects.name}</CardDescription>
              </div>
              <div className="flex items-center space-x-4">
                {tabSwitchWarnings > 0 && (
                  <Badge variant="destructive" className="flex items-center">
                    <AlertTriangle className="w-3 h-3 mr-1" />
                    Warnings: {tabSwitchWarnings}/3
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
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPreventCheating(!preventCheating)}
                >
                  {preventCheating ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </Button>
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
                    onClick={() => navigateToQuestion(index)}
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
                  <span>Current</span>
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
                onClick={() => setShowSubmitDialog(true)}
                disabled={isSubmitting || Object.keys(answers).length === 0}
                className="w-full bg-quiz hover:bg-quiz/90"
              >
                {isSubmitting ? 'Submitting...' : 'Submit Test'}
              </Button>
              
              <div className="mt-4 text-xs text-muted-foreground text-center">
                <p>Questions answered: {getAnsweredCount()}/{questions.length}</p>
                <p>Questions flagged: {flaggedQuestions.size}</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Submit Confirmation Dialog */}
      <AlertDialog open={showSubmitDialog} onOpenChange={setShowSubmitDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center">
              <AlertTriangle className="w-5 h-5 mr-2 text-warning" />
              Submit Test?
            </AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to submit your test? This action cannot be undone.
              <br /><br />
              <strong>Summary:</strong>
              <br />• Questions answered: {getAnsweredCount()}/{questions.length}
              <br />• Questions flagged: {flaggedQuestions.size}
              <br />• Time remaining: {formatTime(timeLeft)}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Review Answers</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleSubmit}
              disabled={isSubmitting}
              className="bg-quiz hover:bg-quiz/90"
            >
              {isSubmitting ? 'Submitting...' : 'Submit Test'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};