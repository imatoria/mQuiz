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
      if (!user?.user) {
        setChildSubjects([]);
        return;
      }

      let parentId = user.user.id;

      // If the current user is a child, find their parent_id from parent_child_relationships
      const { data: rel } = await supabase
        .from('parent_child_relationships')
        .select('parent_id')
        .eq('child_id', user.user.id)
        .maybeSingle();

      if (rel?.parent_id) {
        parentId = rel.parent_id;
      }

      // Get current subject assignments strictly for this parent
      const { data: assignments, error: assignmentsError } = await supabase
        .from('child_subject_assignments')
        .select('*')
        .eq('parent_id', parentId)
        .eq('is_current', true);

      if (assignmentsError) throw assignmentsError;

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