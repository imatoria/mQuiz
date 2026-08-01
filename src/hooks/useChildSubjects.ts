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

      const { data: assignments } = await supabase
        .from('child_subject_assignments')
        .select('*');

      const { data: allSubjects } = await supabase.from('subjects_parent').select('*');
      const subjMap = new Map((allSubjects || []).map((s: any) => [s.id, s]));

      const enriched: SubjectAssignment[] = (assignments || []).map((assignment: any) => {
        const subj = subjMap.get(assignment.subject_parent_id) || {};
        return {
          subject_parent_id: assignment.subject_parent_id,
          child_id: assignment.child_id,
          subjects_parent: {
            id: subj.id || assignment.subject_parent_id,
            subject_name: subj.subject_name || 'General'
          }
        };
      });

      setChildSubjects(enriched);
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
        subject_name: assignment?.subjects_parent?.subject_name || 'General'
      };
    });
  };

  const getSubjectsForChild = (childId: string) => {
    return childSubjects
      .filter(cs => cs.child_id === childId)
      .map(cs => ({
        id: cs.subject_parent_id,
        name: cs.subjects_parent?.subject_name || 'General'
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