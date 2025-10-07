import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface ChildAcademicData {
  child_id: string;
  class_level?: string;
  subject_ids: string[];
  subject_names: string[];
}

export const useChildAcademicProfile = (childId?: string) => {
  const [academicData, setAcademicData] = useState<ChildAcademicData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (childId) {
      fetchAcademicProfile();
    }
  }, [childId]);

  const fetchAcademicProfile = async () => {
    if (!childId) return;

    try {
      setIsLoading(true);
      setError(null);

      const { data: user } = await supabase.auth.getUser();
      if (!user.user) {
        throw new Error('Not authenticated');
      }

      // Fetch class assignment
      const { data: classData, error: classError } = await supabase
        .from('child_class_assignments')
        .select('class_parent_id, classes_parent(class_name)')
        .eq('child_id', childId)
        .eq('parent_id', user.user.id)
        .eq('is_current', true)
        .maybeSingle();

      if (classError) throw classError;

      // Fetch subject assignments with subject names
      const { data: subjectsData, error: subjectsError } = await supabase
        .from('child_subject_assignments')
        .select(`
          subject_parent_id,
          subjects_parent (
            id,
            subject_name
          )
        `)
        .eq('child_id', childId)
        .eq('parent_id', user.user.id)
        .eq('is_current', true);

      if (subjectsError) throw subjectsError;

      const subjectIds = subjectsData?.map(s => s.subject_parent_id) || [];
      const subjectNames = subjectsData?.map(s => s.subjects_parent?.subject_name).filter(Boolean) || [];

      setAcademicData({
        child_id: childId,
        class_level: classData?.classes_parent?.class_name,
        subject_ids: subjectIds,
        subject_names: subjectNames as string[]
      });

    } catch (err: any) {
      console.error('Error fetching academic profile:', err);
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const hasClass = () => {
    return Boolean(academicData?.class_level);
  };

  const hasSubjects = () => {
    return Boolean(academicData?.subject_ids.length);
  };

  const isProfileComplete = () => {
    return hasClass() && hasSubjects();
  };

  const refetch = () => {
    if (childId) {
      fetchAcademicProfile();
    }
  };

  return {
    academicData,
    isLoading,
    error,
    hasClass,
    hasSubjects,
    isProfileComplete,
    refetch
  };
};