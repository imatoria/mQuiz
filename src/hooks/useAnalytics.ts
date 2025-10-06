import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface QuestionStats {
  question_id: string;
  question_text: string;
  subject_name: string;
  difficulty: string;
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

export function useAnalytics(selectedPeriod: string, selectedDifficulty: string) {
  const [questionStats, setQuestionStats] = useState<QuestionStats[]>([]);
  const [paperPerformance, setPaperPerformance] = useState<PaperPerformance[]>([]);
  const [overallStats, setOverallStats] = useState<OverallStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    fetchAnalytics();
  }, [selectedPeriod, selectedDifficulty]);

  const fetchAnalytics = async () => {
    try {
      setIsLoading(true);
      
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        throw new Error('User not authenticated');
      }

      // Convert period to days
      const periodDays = selectedPeriod === 'all' ? 365 * 10 : parseInt(selectedPeriod);

      // Fetch question analytics
      const { data: questionData, error: questionError } = await supabase.rpc(
        'get_question_analytics',
        {
          parent_user_id: user.id,
          time_period_days: periodDays,
          difficulty_filter: selectedDifficulty
        }
      );

      if (questionError) throw questionError;

      // Fetch paper performance
      const { data: paperData, error: paperError } = await supabase.rpc(
        'get_paper_performance',
        {
          parent_user_id: user.id,
          time_period_days: periodDays
        }
      );

      if (paperError) throw paperError;

      // Fetch overall stats
      const { data: overallData, error: overallError } = await supabase.rpc(
        'get_overall_analytics',
        {
          parent_user_id: user.id,
          time_period_days: periodDays
        }
      );

      if (overallError) throw overallError;

      setQuestionStats(questionData || []);
      setPaperPerformance(paperData || []);
      setOverallStats(overallData && overallData.length > 0 ? overallData[0] : null);
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
