import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface ClassAssignment {
  class_parent_id: string;
  child_id: string;
  classes_parent?: {
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

      const { data: assignments } = await supabase
        .from('child_class_assignments')
        .select('*');

      const { data: allClasses } = await supabase.from('classes_parent').select('*');
      const classMap = new Map((allClasses || []).map((c: any) => [c.id, c]));

      const enriched: ClassAssignment[] = (assignments || []).map((assignment: any) => {
        const cls = classMap.get(assignment.class_parent_id) || {};
        return {
          class_parent_id: assignment.class_parent_id,
          child_id: assignment.child_id,
          classes_parent: {
            id: cls.id || assignment.class_parent_id,
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
    const uniqueClassIds = [...new Set(childClasses.map(cc => cc.class_parent_id))];
    return uniqueClassIds.map(classId => {
      const assignment = childClasses.find(cc => cc.class_parent_id === classId);
      return {
        id: classId,
        class_name: assignment?.classes_parent?.class_name || 'Class 10',
        class_key: assignment?.classes_parent?.class_key || assignment?.classes_parent?.class_name || 'class_10'
      };
    });
  };

  const getClassesForChild = (childId: string) => {
    return childClasses
      .filter(cc => cc.child_id === childId)
      .map(cc => ({
        id: cc.class_parent_id,
        name: cc.classes_parent?.class_name || 'Class 10',
        key: cc.classes_parent?.class_key || cc.classes_parent?.class_name || 'class_10'
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