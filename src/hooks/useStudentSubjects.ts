import { useState, useEffect } from 'react';
import { dbService } from '@/services/db';
import { authService } from '@/services/auth/authService';

interface StudentSubjectAssignment {
  subject_id: string;
  student_id: string;
  subjects?: {
    id: string;
    subject_name: string;
  };
}

export const useStudentSubjects = () => {
  const [studentSubjects, setStudentSubjects] = useState<StudentSubjectAssignment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchStudentSubjects();
  }, []);

  const fetchStudentSubjects = async () => {
    try {
      setIsLoading(true);
      setError(null);

      const user = authService.getCurrentUser();
      if (!user) {
        setStudentSubjects([]);
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

      // Get current subject assignments strictly for this teacher
      const { data: assignments, error: assignmentsError } = await dbService.getProvider().query(
        'SELECT * FROM student_subject_assignments WHERE teacher_id = ? AND is_current = 1',
        [teacherId]
      );

      if (assignmentsError) throw assignmentsError;

      const { data: allSubjects } = await dbService.getProvider().query('SELECT * FROM subjects');
      const subjMap = new Map((allSubjects || []).map((s: any) => [s.id, s]));

      const enriched: StudentSubjectAssignment[] = (assignments || []).map((assignment: any) => {
        const subj = subjMap.get(assignment.subject_id) || {};
        return {
          subject_id: assignment.subject_id,
          student_id: assignment.student_id || assignment.child_id,
          subjects: {
            id: subj.id || assignment.subject_id,
            subject_name: subj.subject_name || 'General'
          }
        };
      });

      setStudentSubjects(enriched);
    } catch (err: any) {
      console.error('Error fetching student subjects:', err);
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const getUniqueSubjects = () => {
    const uniqueSubjectIds = [...new Set(studentSubjects.map(cs => cs.subject_id))];
    return uniqueSubjectIds.map(subjectId => {
      const assignment = studentSubjects.find(cs => cs.subject_id === subjectId);
      return {
        id: subjectId,
        subject_name: assignment?.subjects?.subject_name || 'General'
      };
    });
  };

  const getSubjectsForStudent = (studentId: string) => {
    return studentSubjects
      .filter(cs => cs.student_id === studentId)
      .map(cs => ({
        id: cs.subject_id,
        name: cs.subjects?.subject_name || 'General'
      }));
  };

  const getSubjectIds = () => {
    return [...new Set(studentSubjects.map(cs => cs.subject_id))];
  };

  return {
    studentSubjects,
    childSubjects: studentSubjects,
    isLoading,
    error,
    getUniqueSubjects,
    getSubjectsForStudent,
    getSubjectsForChild: getSubjectsForStudent,
    getSubjectIds,
    refetch: fetchStudentSubjects
  };
};

export const useChildSubjects = useStudentSubjects;
