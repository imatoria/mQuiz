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
      if (!user.user) throw new Error('Not authenticated');

      const { data, error } = await supabase
        .from('classes_parent')
        .select('*')
        .eq('parent_id', user.user.id)
        .eq('is_active', true)
        .order('display_order');

      if (error) throw error;
      setClasses(data || []);
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
