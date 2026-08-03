import { useState, useEffect } from 'react';
import { useToast } from '@/hooks/use-toast';
import { authService } from '@/services/auth/authService';

interface QuestionStats {
  question_id: string;
  question_text: string;
  subject_name: string;
  total_attempts: number;
  correct_attempts: number;
  success_rate: number;
  avg_time_spent: number | null;
}

interface PaperPerformance {
  paper_id: string;
  paper_title: string;
  total_attempts: number;
  avg_score: number;
  completion_rate: number;
}

interface OverallStats {
  total_questions_used: number;
  total_attempts: number;
  avg_success_rate: number | null;
  active_students: number;
  avg_completion_time: number | null;
}

export function useAnalytics(selectedPeriod: string) {
  const [questionStats, setQuestionStats] = useState<QuestionStats[]>([]);
  const [paperPerformance, setPaperPerformance] = useState<PaperPerformance[]>([]);
  const [overallStats, setOverallStats] = useState<OverallStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    fetchAnalytics();
  }, [selectedPeriod]);

  const fetchAnalytics = async () => {
    try {
      setIsLoading(true);
      
      const user = authService.getCurrentUser();
      if (!user) {
        throw new Error('User not authenticated');
      }

      // Convert period to days
      const periodDays = selectedPeriod === 'all' ? 365 * 10 : parseInt(selectedPeriod);

      // We are in offline SQLite mode, so we mock these complex RPC calls for now.
      // In a real scenario, we would write complex SQLite aggregations here.
      setQuestionStats([]);
      setPaperPerformance([]);
      setOverallStats({
        total_questions_used: 0,
        total_attempts: 0,
        avg_success_rate: 0,
        active_students: 0,
        avg_completion_time: 0
      });
    } catch (error) {
      console.error('Error fetching analytics:', error);
      toast({
        title: "Error",
        description: "Failed to fetch analytics data. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return {
    questionStats,
    paperPerformance,
    overallStats,
    isLoading,
    refetch: fetchAnalytics
  };
}
