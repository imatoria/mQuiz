import { useState, useEffect } from 'react';
import { dbService } from '@/services/db';

interface StudentAcademicData {
  student_id: string;
  class_level?: string;
  subject_ids: string[];
  subject_names: string[];
}

export const useStudentAcademicProfile = (studentId?: string) => {
  const [academicData, setAcademicData] = useState<StudentAcademicData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (studentId) {
      fetchAcademicProfile();
    }
  }, [studentId]);

  const fetchAcademicProfile = async () => {
    if (!studentId) return;

    try {
      setIsLoading(true);
      setError(null);

      // Fetch class assignment by student_id
      const { data: classData } = await dbService.getProvider().queryOne(
        'SELECT * FROM student_class_assignments WHERE student_id = ?',
        [studentId]
      );

      let className: string | undefined = undefined;
      if (classData?.class_id) {
        const { data: classInfo } = await dbService.getProvider().queryOne(
          'SELECT * FROM classes WHERE id = ?',
          [classData.class_id]
        );
        className = classInfo?.class_name;
      }

      // Fetch subject assignments by student_id
      const { data: subjectsData } = await dbService.getProvider().query(
        'SELECT * FROM student_subject_assignments WHERE student_id = ?',
        [studentId]
      );

      const subjectIds = (subjectsData || []).map((s: any) => s.subject_id);

      let subjectNames: string[] = [];
      if (subjectIds.length > 0) {
        const placeholders = subjectIds.map(() => '?').join(', ');
        const { data: subjectsInfo } = await dbService.getProvider().query(
          `SELECT * FROM subjects WHERE id IN (${placeholders})`,
          subjectIds
        );
        subjectNames = (subjectsInfo || []).map((s: any) => s.subject_name).filter(Boolean);
      }

      setAcademicData({
        student_id: studentId,
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
    if (studentId) {
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

export const useChildAcademicProfile = useStudentAcademicProfile;
