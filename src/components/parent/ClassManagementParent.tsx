import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useClassesParent } from '@/hooks/useClassesParent';
import { toast } from 'sonner';
import { Trash2, Edit, Plus, Check, X } from 'lucide-react';
import { LoadingState } from '@/components/ui/loading-state';

export const ClassManagementParent = () => {
  const { classes, isLoading, addClass, updateClass, deleteClass } = useClassesParent();
  const [isAdding, setIsAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [newClassName, setNewClassName] = useState('');
  const [editClassName, setEditClassName] = useState('');

  const handleAdd = async () => {
    if (!newClassName.trim()) {
      toast.error('Please enter a class name');
      return;
    }

    try {
      const classKey = newClassName.toLowerCase().replace(/\s+/g, '_');
      await addClass(newClassName, classKey);
      toast.success('Class added successfully');
      setNewClassName('');
      setIsAdding(false);
    } catch (error: any) {
      toast.error(error.message || 'Failed to add class');
    }
  };

  const handleUpdate = async (id: string) => {
    if (!editClassName.trim()) {
      toast.error('Please enter a class name');
      return;
    }

    try {
      await updateClass(id, { class_name: editClassName });
      toast.success('Class updated successfully');
      setEditingId(null);
    } catch (error: any) {
      toast.error(error.message || 'Failed to update class');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this class?')) return;

    try {
      await deleteClass(id);
      toast.success('Class deleted successfully');
    } catch (error: any) {
      toast.error(error.message || 'Failed to delete class');
    }
  };

  if (isLoading) return <LoadingState />;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Class Level Management</CardTitle>
        <CardDescription>Manage your custom class levels</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex justify-end">
          <Button onClick={() => setIsAdding(true)} disabled={isAdding}>
            <Plus className="h-4 w-4 mr-2" />
            Add Class
          </Button>
        </div>

        {isAdding && (
          <div className="flex items-center gap-2 p-4 bg-muted rounded-lg">
            <div className="flex-1">
              <Label htmlFor="new-class">Class Name</Label>
              <Input
                id="new-class"
                value={newClassName}
                onChange={(e) => setNewClassName(e.target.value)}
                placeholder="e.g., Grade 13"
              />
            </div>
            <div className="flex gap-2 mt-6">
              <Button size="sm" onClick={handleAdd}>
                <Check className="h-4 w-4" />
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  setIsAdding(false);
                  setNewClassName('');
                }}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}

        <div className="space-y-2">
          {classes.map((cls) => (
            <div
              key={cls.id}
              className="flex items-center justify-between p-4 border rounded-lg"
            >
              {editingId === cls.id ? (
                <div className="flex items-center gap-2 flex-1">
                  <Input
                    value={editClassName}
                    onChange={(e) => setEditClassName(e.target.value)}
                    className="flex-1"
                  />
                  <Button size="sm" onClick={() => handleUpdate(cls.id)}>
                    <Check className="h-4 w-4" />
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setEditingId(null)}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ) : (
                <>
                  <div>
                    <p className="font-medium">{cls.class_name}</p>
                    <p className="text-sm text-muted-foreground">{cls.class_key}</p>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        setEditingId(cls.id);
                        setEditClassName(cls.class_name);
                      }}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={() => handleDelete(cls.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </>
              )}
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};
