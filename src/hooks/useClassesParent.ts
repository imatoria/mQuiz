import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface ClassParent {
  id: string;
  parent_id: string;
  class_name: string;
  class_key: string;
  display_order: number;
  is_active: boolean;
}

export const useClassesParent = () => {
  const [classes, setClasses] = useState<ClassParent[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchClasses = async () => {
    try {
      setIsLoading(true);
      setError(null);

      const { data: user } = await supabase.auth.getUser();

      const { data, error } = await supabase
        .from('classes_parent')
        .select('*')
        .eq('is_active', true)
        .order('display_order');

      if (error) throw error;

      let rawClasses: ClassParent[] = (data || []);
      if (user?.user) {
        const userClasses = rawClasses.filter((c: any) => c.parent_id === user.user.id);
        if (userClasses.length > 0) {
          rawClasses = userClasses;
        }
      }

      // Deduplicate by class_name so duplicates like 'Grade 9' are never displayed twice
      const uniqueClassesMap = new Map<string, ClassParent>();
      rawClasses.forEach((c: ClassParent) => {
        const key = (c.class_name || c.class_key || '').trim().toLowerCase();
        if (key && !uniqueClassesMap.has(key)) {
          uniqueClassesMap.set(key, c);
        }
      });

      setClasses(Array.from(uniqueClassesMap.values()));
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchClasses();
  }, []);

  const addClass = async (className: string, classKey: string) => {
    const { data: user } = await supabase.auth.getUser();
    if (!user.user) throw new Error('Not authenticated');

    const maxOrder = Math.max(...classes.map(c => c.display_order), 0);

    const { error } = await supabase
      .from('classes_parent')
      .insert({
        parent_id: user.user.id,
        class_name: className,
        class_key: classKey,
        display_order: maxOrder + 1,
      });

    if (error) throw error;
    await fetchClasses();
  };

  const updateClass = async (id: string, updates: Partial<ClassParent>) => {
    const { error } = await supabase
      .from('classes_parent')
      .update(updates)
      .eq('id', id);

    if (error) throw error;
    await fetchClasses();
  };

  const deleteClass = async (id: string) => {
    const { error } = await supabase
      .from('classes_parent')
      .update({ is_active: false })
      .eq('id', id);

    if (error) throw error;
    await fetchClasses();
  };

  return {
    classes,
    isLoading,
    error,
    refetch: fetchClasses,
    addClass,
    updateClass,
    deleteClass,
  };
};
