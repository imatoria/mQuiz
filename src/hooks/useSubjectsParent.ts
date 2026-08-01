import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface SubjectParent {
  id: string;
  parent_id: string;
  subject_name: string;
  subject_key: string | null;
  description: string | null;
  is_active: boolean;
}

export const useSubjectsParent = () => {
  const [subjects, setSubjects] = useState<SubjectParent[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchSubjects = async () => {
    try {
      setIsLoading(true);
      setError(null);

      const { data: user } = await supabase.auth.getUser();

      const { data, error } = await supabase
        .from('subjects_parent')
        .select('*')
        .eq('is_active', true)
        .order('subject_name');

      if (error) throw error;

      // Filter by parent_id if custom user subjects exist, or return all active subjects as global default
      const userSubjects = user?.user ? (data || []).filter((s: any) => s.parent_id === user.user.id) : [];
      setSubjects(userSubjects.length > 0 ? userSubjects : (data || []));
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchSubjects();
  }, []);

  const addSubject = async (subjectName: string, description?: string) => {
    const { data: user } = await supabase.auth.getUser();
    if (!user.user) throw new Error('Not authenticated');

    const { error } = await supabase
      .from('subjects_parent')
      .insert({
        parent_id: user.user.id,
        subject_name: subjectName,
        description: description || null,
      });

    if (error) throw error;
    await fetchSubjects();
  };

  const updateSubject = async (id: string, updates: Partial<SubjectParent>) => {
    const { error } = await supabase
      .from('subjects_parent')
      .update(updates)
      .eq('id', id);

    if (error) throw error;
    await fetchSubjects();
  };

  const deleteSubject = async (id: string) => {
    const { error } = await supabase
      .from('subjects_parent')
      .update({ is_active: false })
      .eq('id', id);

    if (error) throw error;
    await fetchSubjects();
  };

  return {
    subjects,
    isLoading,
    error,
    refetch: fetchSubjects,
    addSubject,
    updateSubject,
    deleteSubject,
  };
};
