import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface ClassAssignment {
  class_level: string;
  child_id: string;
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
        .select('class_level, child_id')
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
    const uniqueClasses = [...new Set(childClasses.map(cc => cc.class_level))];
    return uniqueClasses;
  };

  const getClassesForChild = (childId: string) => {
    return childClasses.filter(cc => cc.child_id === childId).map(cc => cc.class_level);
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