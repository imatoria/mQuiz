import { useState, useEffect } from 'react';
import { dbService } from '@/services/db';
import { authService } from '@/services/auth/authService';

interface StudentClassAssignment {
  class_id: string;
  student_id: string;
  classes?: {
    id: string;
    class_name: string;
    class_key: string;
  };
}

export const useStudentClasses = () => {
  const [studentClasses, setStudentClasses] = useState<StudentClassAssignment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchStudentClasses();
  }, []);

  const fetchStudentClasses = async () => {
    try {
      setIsLoading(true);
      setError(null);

      const user = authService.getCurrentUser();
      if (!user) {
        setStudentClasses([]);
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

      // Get current class assignments strictly for this teacher
      const { data: assignments, error: assignmentsError } = await dbService.getProvider().query(
        'SELECT * FROM student_class_assignments WHERE teacher_id = ? AND is_current = 1',
        [teacherId]
      );

      if (assignmentsError) throw assignmentsError;

      const { data: allClasses } = await dbService.getProvider().query('SELECT * FROM classes');
      const classMap = new Map((allClasses || []).map((c: any) => [c.id, c]));

      const enriched: StudentClassAssignment[] = (assignments || []).map((assignment: any) => {
        const cls = classMap.get(assignment.class_id) || {};
        return {
          class_id: assignment.class_id,
          student_id: assignment.student_id ,
          classes: {
            id: cls.id || assignment.class_id,
            class_name: cls.class_name || 'Class 10',
            class_key: cls.class_key || cls.class_name || 'class_10'
          }
        };
      });

      setStudentClasses(enriched);
    } catch (err: any) {
      console.error('Error fetching student classes:', err);
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const getUniqueClasses = () => {
    const uniqueClassIds = [...new Set(studentClasses.map(cc => cc.class_id))];
    return uniqueClassIds.map(classId => {
      const assignment = studentClasses.find(cc => cc.class_id === classId);
      return {
        id: classId,
        class_name: assignment?.classes?.class_name || 'Class 10',
        class_key: assignment?.classes?.class_key || assignment?.classes?.class_name || 'class_10'
      };
    });
  };

  const getClassesForStudent = (studentId: string) => {
    return studentClasses
      .filter(cc => cc.student_id === studentId)
      .map(cc => ({
        id: cc.class_id,
        name: cc.classes?.class_name || 'Class 10',
        key: cc.classes?.class_key || cc.classes?.class_name || 'class_10'
      }));
  };

  return {
    studentClasses,
    isLoading,
    error,
    getUniqueClasses,
    getClassesForStudent,
    refetch: fetchStudentClasses
  };
};
