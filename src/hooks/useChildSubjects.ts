import { useState, useEffect } from 'react';
import { dbService } from '@/services/db';
import { authService } from '@/services/auth/authService';

interface SubjectAssignment {
  subject_id: string;
  child_id: string;
  subjects?: {
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

      const user = authService.getCurrentUser();
      if (!user) {
        setChildSubjects([]);
        return;
      }

      let parentId = user.id;

      // If the current user is a child, find their parent_id from parent_child_relationships
      const { data: rel } = await dbService.getProvider().queryOne(
        'SELECT parent_id FROM parent_child_relationships WHERE child_id = ?',
        [user.id]
      );

      if (rel?.parent_id) {
        parentId = rel.parent_id;
      }

      // Get current subject assignments strictly for this parent
      const { data: assignments, error: assignmentsError } = await dbService.getProvider().query(
        'SELECT * FROM child_subject_assignments WHERE parent_id = ? AND is_current = 1',
        [parentId]
      );

      if (assignmentsError) throw assignmentsError;

      const { data: allSubjects } = await dbService.getProvider().query('SELECT * FROM subjects');
      const subjMap = new Map((allSubjects || []).map((s: any) => [s.id, s]));

      const enriched: SubjectAssignment[] = (assignments || []).map((assignment: any) => {
        const subj = subjMap.get(assignment.subject_id) || {};
        return {
          subject_id: assignment.subject_id,
          child_id: assignment.child_id,
          subjects: {
            id: subj.id || assignment.subject_id,
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
    const uniqueSubjectIds = [...new Set(childSubjects.map(cs => cs.subject_id))];
    return uniqueSubjectIds.map(subjectId => {
      const assignment = childSubjects.find(cs => cs.subject_id === subjectId);
      return {
        id: subjectId,
        subject_name: assignment?.subjects?.subject_name || 'General'
      };
    });
  };

  const getSubjectsForChild = (childId: string) => {
    return childSubjects
      .filter(cs => cs.child_id === childId)
      .map(cs => ({
        id: cs.subject_id,
        name: cs.subjects?.subject_name || 'General'
      }));
  };

  const getSubjectIds = () => {
    return [...new Set(childSubjects.map(cs => cs.subject_id))];
  };

  const getSubjectIdsForChild = (childId: string) => {
    return childSubjects
      .filter(cs => cs.child_id === childId)
      .map(cs => cs.subject_id);
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