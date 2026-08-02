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

      // Fetch class assignment by child_id
      const { data: classData } = await supabase
        .from('child_class_assignments')
        .select('*')
        .eq('child_id', childId)
        .maybeSingle();

      let className: string | undefined = undefined;
      if (classData?.class_id) {
        const { data: classInfo } = await supabase
          .from('classes')
          .select('*')
          .eq('id', classData.class_id)
          .maybeSingle();
        className = classInfo?.class_name;
      }

      // Fetch subject assignments by child_id
      const { data: subjectsData } = await supabase
        .from('child_subject_assignments')
        .select('*')
        .eq('child_id', childId);

      const subjectIds = (subjectsData || []).map((s: any) => s.subject_id);

      let subjectNames: string[] = [];
      if (subjectIds.length > 0) {
        const { data: subjectsInfo } = await supabase
          .from('subjects')
          .select('*')
          .in('id', subjectIds);
        subjectNames = (subjectsInfo || []).map((s: any) => s.subject_name).filter(Boolean);
      }

      setAcademicData({
        child_id: childId,
        class_level: className,
        subject_ids: subjectIds,
        subject_names: subjectNames
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