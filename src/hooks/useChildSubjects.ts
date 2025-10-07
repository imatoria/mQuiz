import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface SubjectAssignment {
  subject_parent_id: string;
  child_id: string;
  subjects_parent?: {
    id: string;
    subject_name: string;
  };
}

export const useChildSubjects = () => {
  const [childSubjects, setChildSubjects] = useState<SubjectAssignment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchChildSubjects();
  }, []);

  const fetchChildSubjects = async () => {
    try {
      setIsLoading(true);
      setError(null);

      const { data: user } = await supabase.auth.getUser();
      if (!user.user) {
        throw new Error('Not authenticated');
      }

      // Get all current subject assignments for children of this parent
      const { data, error } = await supabase
        .from('child_subject_assignments')
        .select(`
          subject_parent_id,
          child_id,
          subjects_parent (
            id,
            subject_name
          )
        `)
        .eq('parent_id', user.user.id)
        .eq('is_current', true);

      if (error) throw error;

      setChildSubjects(data || []);
    } catch (err: any) {
      console.error('Error fetching child subjects:', err);
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const getUniqueSubjects = () => {
    const uniqueSubjectIds = [...new Set(childSubjects.map(cs => cs.subject_parent_id))];
    return uniqueSubjectIds.map(subjectId => {
      const assignment = childSubjects.find(cs => cs.subject_parent_id === subjectId);
      return {
        id: subjectId,
        subject_name: assignment?.subjects_parent?.subject_name || 'Unknown Subject'
      };
    });
  };

  const getSubjectsForChild = (childId: string) => {
    return childSubjects
      .filter(cs => cs.child_id === childId)
      .map(cs => ({
        id: cs.subject_parent_id,
        name: cs.subjects_parent?.subject_name || 'Unknown Subject'
      }));
  };

  const getSubjectIds = () => {
    return [...new Set(childSubjects.map(cs => cs.subject_parent_id))];
  };

  const getSubjectIdsForChild = (childId: string) => {
    return childSubjects
      .filter(cs => cs.child_id === childId)
      .map(cs => cs.subject_parent_id);
  };

  const refetch = () => {
    fetchChildSubjects();
  };

  return {
    childSubjects,
    uniqueSubjects: getUniqueSubjects(),
    getSubjectsForChild,
    getSubjectIds,
    getSubjectIdsForChild,
    isLoading,
    error,
    refetch
  };
};