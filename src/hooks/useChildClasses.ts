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

      const { data: user } = await supabase.auth.getUser();
      if (!user.user) {
        throw new Error('Not authenticated');
      }

      // Get all current class assignments for children of this parent
      const { data, error } = await supabase
        .from('child_class_assignments')
        .select(`
          class_parent_id,
          child_id,
          classes_parent (
            id,
            class_name,
            class_key
          )
        `)
        .eq('parent_id', user.user.id)
        .eq('is_current', true);

      if (error) throw error;

      setChildClasses(data || []);
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
        class_name: assignment?.classes_parent?.class_name || 'Unknown Class',
        class_key: assignment?.classes_parent?.class_key || ''
      };
    });
  };

  const getClassesForChild = (childId: string) => {
    return childClasses
      .filter(cc => cc.child_id === childId)
      .map(cc => ({
        id: cc.class_parent_id,
        name: cc.classes_parent?.class_name || 'Unknown Class',
        key: cc.classes_parent?.class_key || ''
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