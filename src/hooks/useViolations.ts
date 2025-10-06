import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface Violation {
  id: string;
  paper_attempt_id: string;
  violation_type: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  details: Record<string, any>;
  occurred_at: string;
  auto_resolved: boolean;
  created_at: string;
  paper_attempts?: {
    user_id: string;
    paper_id: string;
    started_at: string;
    completed_at: string | null;
    profiles?: {
      full_name: string;
      email: string;
    };
    question_papers?: {
      title: string;
    };
  };
}

export const useViolations = (attemptId?: string) => {
  const [violations, setViolations] = useState<Violation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchViolations();
  }, [attemptId]);

  const fetchViolations = async () => {
    try {
      setLoading(true);
      setError(null);

      let query = supabase
        .from('paper_violations')
        .select(`
          *,
          paper_attempts!inner (
            user_id,
            paper_id,
            started_at,
            completed_at
          )
        `)
        .order('occurred_at', { ascending: false });

      if (attemptId) {
        query = query.eq('paper_attempt_id', attemptId);
      }

      const { data, error: fetchError } = await query;

      if (fetchError) throw fetchError;

      // Fetch additional user and paper details
      const enrichedData = await Promise.all((data || []).map(async (violation: any) => {
        const [userResult, paperResult] = await Promise.all([
          supabase
            .from('profiles')
            .select('full_name, email')
            .eq('user_id', violation.paper_attempts.user_id)
            .single(),
          supabase
            .from('question_papers')
            .select('title')
            .eq('id', violation.paper_attempts.paper_id)
            .single()
        ]);

        return {
          ...violation,
          paper_attempts: {
            ...violation.paper_attempts,
            profiles: userResult.data,
            question_papers: paperResult.data
          }
        };
      }));

      setViolations(enrichedData as Violation[]);
    } catch (err) {
      console.error('Error fetching violations:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch violations');
    } finally {
      setLoading(false);
    }
  };

  const getViolationStats = () => {
    const stats = {
      total: violations.length,
      critical: violations.filter(v => v.severity === 'critical').length,
      high: violations.filter(v => v.severity === 'high').length,
      medium: violations.filter(v => v.severity === 'medium').length,
      low: violations.filter(v => v.severity === 'low').length,
      byType: {} as Record<string, number>
    };

    violations.forEach(v => {
      stats.byType[v.violation_type] = (stats.byType[v.violation_type] || 0) + 1;
    });

    return stats;
  };

  return {
    violations,
    loading,
    error,
    refetch: fetchViolations,
    stats: getViolationStats()
  };
};
