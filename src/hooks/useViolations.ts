import { useState, useEffect } from 'react';
import { dbService } from '@/services/db';

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

      let sql = 'SELECT * FROM paper_violations';
      let params: any[] = [];
      if (attemptId) {
        sql += ' WHERE paper_attempt_id = ?';
        params.push(attemptId);
      }

      const { data: violationsData, error: fetchError } = await dbService.getProvider().query(sql, params);
      if (fetchError) throw fetchError;

      const { data: attemptsData } = await dbService.getProvider().query('SELECT * FROM paper_attempts');
      const { data: profilesData } = await dbService.getProvider().query('SELECT * FROM profiles');
      const { data: papersData } = await dbService.getProvider().query('SELECT * FROM question_papers');

      const attemptMap = new Map((attemptsData || []).map((a: any) => [a.id, a]));
      const profileMap = new Map((profilesData || []).map((p: any) => [p.user_id || p.id, p]));
      const paperMap = new Map((papersData || []).map((p: any) => [p.id, p]));

      const enrichedData = (violationsData || []).map((violation: any) => {
        const attempt = attemptMap.get(violation.paper_attempt_id) || {};
        const profile = profileMap.get(attempt.user_id) || {};
        const paper = paperMap.get(attempt.paper_id) || {};

        return {
          ...violation,
          paper_attempts: {
            user_id: attempt.user_id || '',
            paper_id: attempt.paper_id || '',
            started_at: attempt.started_at || '',
            completed_at: attempt.completed_at || null,
            profiles: {
              full_name: profile.full_name || 'User',
              email: profile.email || ''
            },
            question_papers: {
              title: paper.title || 'Question Paper'
            }
          }
        };
      });

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
