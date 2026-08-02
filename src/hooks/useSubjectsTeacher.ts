import { useState, useEffect } from 'react';
import { dbService } from '@/services/db';
import { authService } from '@/services/auth/authService';

interface SubjectTeacher {
  id: string;
  teacher_id: string;
  subject_name: string;
  subject_key: string | null;
  description: string | null;
  is_active: boolean;
}

export const useSubjectsTeacher = () => {
  const [subjects, setSubjects] = useState<SubjectTeacher[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchSubjects = async () => {
    try {
      setIsLoading(true);
      setError(null);

      const user = authService.getCurrentUser();
      if (!user) {
        setSubjects([]);
        return;
      }

      let teacherId = user.id;

      // If the current user is a student, find their teacher_id from teacher_student_relationships
      const { data: rel } = await dbService.getProvider().queryOne(
        'SELECT teacher_id FROM teacher_student_relationships WHERE student_id = ?',
        [user.id]
      );

      if (rel?.teacher_id) {
        teacherId = rel.teacher_id;
      }

      // Fetch subjects attached strictly to this teacher
      const { data, error } = await dbService.getProvider().query(
        'SELECT * FROM subjects WHERE teacher_id = ? AND is_active = 1',
        [teacherId]
      );

      if (error) throw error;

      const sortedData = (data || []).sort((a: any, b: any) => (a.subject_name || '').localeCompare(b.subject_name || ''));
      setSubjects(sortedData);
    } catch (err: any) {
      console.error('Silenced Error:', err);
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchSubjects();
  }, []);

  const addSubject = async (subjectName: string, description?: string) => {
    const user = authService.getCurrentUser();
    if (!user) throw new Error('Not authenticated');

    const { error } = await dbService.getProvider().execute(
      'INSERT INTO subjects',
      [{
        id: crypto.randomUUID(),
        teacher_id: user.id,
        subject_name: subjectName,
        description: description || null,
        is_active: 1
      }]
    );

    if (error) throw error;
    await fetchSubjects();
  };

  const updateSubject = async (id: string, updates: Partial<SubjectTeacher>) => {
    const { error } = await dbService.getProvider().execute(
      'UPDATE subjects SET ? WHERE id = ?',
      [updates, id]
    );

    if (error) throw error;
    await fetchSubjects();
  };

  const deleteSubject = async (id: string) => {
    const { error } = await dbService.getProvider().execute(
      'UPDATE subjects SET ? WHERE id = ?',
      [{ is_active: 0 }, id]
    );

    if (error) throw error;
    await fetchSubjects();
  };

  return {
    subjects,
    isLoading,
    error,
    addSubject,
    updateSubject,
    deleteSubject,
    refetch: fetchSubjects
  };
};
