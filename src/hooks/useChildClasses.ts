import { useState, useEffect } from 'react';
import { dbService } from '@/services/db';
import { authService } from '@/services/auth/authService';

interface ClassAssignment {
  class_id: string;
  child_id: string;
  classes?: {
    id: string;
    class_name: string;
    class_key: string;
  };
}

export const useChildClasses = () => {
  const [childClasses, setChildClasses] = useState<ClassAssignment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchChildClasses();
  }, []);

  const fetchChildClasses = async () => {
    try {
      setIsLoading(true);
      setError(null);

      const user = authService.getCurrentUser();
      if (!user) {
        setChildClasses([]);
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

      // Get current class assignments strictly for this parent
      const { data: assignments, error: assignmentsError } = await dbService.getProvider().query(
        'SELECT * FROM child_class_assignments WHERE parent_id = ? AND is_current = 1',
        [parentId]
      );

      if (assignmentsError) throw assignmentsError;

      const { data: allClasses } = await dbService.getProvider().query('SELECT * FROM classes');
      const classMap = new Map((allClasses || []).map((c: any) => [c.id, c]));

      const enriched: ClassAssignment[] = (assignments || []).map((assignment: any) => {
        const cls = classMap.get(assignment.class_id) || {};
        return {
          class_id: assignment.class_id,
          child_id: assignment.child_id,
          classes: {
            id: cls.id || assignment.class_id,
            class_name: cls.class_name || 'Class 10',
            class_key: cls.class_key || cls.class_name || 'class_10'
          }
        };
      });

      setChildClasses(enriched);
    } catch (err: any) {
      console.error('Error fetching child classes:', err);
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const getUniqueClasses = () => {
    const uniqueClassIds = [...new Set(childClasses.map(cc => cc.class_id))];
    return uniqueClassIds.map(classId => {
      const assignment = childClasses.find(cc => cc.class_id === classId);
      return {
        id: classId,
        class_name: assignment?.classes?.class_name || 'Class 10',
        class_key: assignment?.classes?.class_key || assignment?.classes?.class_name || 'class_10'
      };
    });
  };

  const getClassesForChild = (childId: string) => {
    return childClasses
      .filter(cc => cc.child_id === childId)
      .map(cc => ({
        id: cc.class_id,
        name: cc.classes?.class_name || 'Class 10',
        key: cc.classes?.class_key || cc.classes?.class_name || 'class_10'
      }));
  };

  const refetch = () => {
    fetchChildClasses();
  };

  return {
    childClasses,
    uniqueClasses: getUniqueClasses(),
    getClassesForChild,
    isLoading,
    error,
    refetch
  };
};