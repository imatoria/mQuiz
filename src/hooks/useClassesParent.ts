import { useState, useEffect } from 'react';
import { dbService } from '@/services/db';
import { authService } from '@/services/auth/authService';

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

      const user = authService.getCurrentUser();
      if (!user) {
        setClasses([]);
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

      // Fetch classes attached strictly to this parent
      const { data, error } = await dbService.getProvider().query(
        'SELECT * FROM classes WHERE parent_id = ? AND is_active = 1',
        [parentId]
      );

      if (error) throw error;

      const sortedData = (data || []).sort((a: any, b: any) => (a.display_order || 0) - (b.display_order || 0));
      setClasses(sortedData);
    } catch (err: any) {
      console.error('Silenced Error:', err);
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchClasses();
  }, []);

  const addClass = async (className: string, classKey: string) => {
    const user = authService.getCurrentUser();
    if (!user) throw new Error('Not authenticated');

    const maxOrder = Math.max(...classes.map(c => c.display_order), 0);

    const { error } = await dbService.getProvider().execute(
      'INSERT INTO classes',
      [{
        id: crypto.randomUUID(),
        parent_id: user.id,
        class_name: className,
        class_key: classKey,
        display_order: maxOrder + 1,
        is_active: 1
      }]
    );

    if (error) throw error;
    await fetchClasses();
  };

  const updateClass = async (id: string, updates: Partial<ClassParent>) => {
    const { error } = await dbService.getProvider().execute(
      'UPDATE classes SET ? WHERE id = ?',
      [updates, id]
    );

    if (error) throw error;
    await fetchClasses();
  };

  const deleteClass = async (id: string) => {
    const { error } = await dbService.getProvider().execute(
      'UPDATE classes SET ? WHERE id = ?',
      [{ is_active: 0 }, id]
    );

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
