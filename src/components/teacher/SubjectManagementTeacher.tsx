import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useSubjectsTeacher } from '@/hooks/useSubjectsTeacher';
import { toast } from 'sonner';
import { Trash2, Edit, Plus, Check, X } from 'lucide-react';
import { LoadingState } from '@/components/ui/loading-state';

export const SubjectManagementTeacher = () => {
  const { subjects, isLoading, addSubject, updateSubject, deleteSubject } = useSubjectsTeacher();
  const [isAdding, setIsAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [newSubjectName, setNewSubjectName] = useState('');
  const [newDescription, setNewDescription] = useState('');
  const [editSubjectName, setEditSubjectName] = useState('');
  const [editDescription, setEditDescription] = useState('');

  const handleAdd = async () => {
    if (!newSubjectName.trim()) {
      toast.error('Please enter a subject name');
      return;
    }

    try {
      await addSubject(newSubjectName, newDescription);
      toast.success('Subject added successfully');
      setNewSubjectName('');
      setNewDescription('');
      setIsAdding(false);
    } catch (error: any) {
      console.error('Silenced Error:', error);
      toast.error(error.message || 'Failed to add subject');
    }
  };

  const handleUpdate = async (id: string) => {
    if (!editSubjectName.trim()) {
      toast.error('Please enter a subject name');
      return;
    }

    try {
      await updateSubject(id, {
        subject_name: editSubjectName,
        description: editDescription,
      });
      toast.success('Subject updated successfully');
      setEditingId(null);
    } catch (error: any) {
      console.error('Silenced Error:', error);
      toast.error(error.message || 'Failed to update subject');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this subject?')) return;

    try {
      await deleteSubject(id);
      toast.success('Subject deleted successfully');
    } catch (error: any) {
      console.error('Silenced Error:', error);
      toast.error(error.message || 'Failed to delete subject');
    }
  };

  if (isLoading) return <LoadingState />;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Subject Management</CardTitle>
        <CardDescription>Manage your custom subjects</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex justify-end">
          <Button onClick={() => setIsAdding(true)} disabled={isAdding}>
            <Plus className="h-4 w-4 mr-2" />
            Add Subject
          </Button>
        </div>

        {isAdding && (
          <div className="space-y-4 p-4 bg-muted rounded-lg">
            <div>
              <Label htmlFor="new-subject">Subject Name</Label>
              <Input
                id="new-subject"
                value={newSubjectName}
                onChange={(e) => setNewSubjectName(e.target.value)}
                placeholder="e.g., Advanced Physics"
              />
            </div>
            <div>
              <Label htmlFor="new-description">Description (Optional)</Label>
              <Textarea
                id="new-description"
                value={newDescription}
                onChange={(e) => setNewDescription(e.target.value)}
                placeholder="Brief description of the subject"
              />
            </div>
            <div className="flex gap-2">
              <Button size="sm" onClick={handleAdd}>
                <Check className="h-4 w-4 mr-2" /> Save
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  setIsAdding(false);
                  setNewSubjectName('');
                  setNewDescription('');
                }}
              >
                <X className="h-4 w-4 mr-2" /> Cancel
              </Button>
            </div>
          </div>
        )}

        <div className="space-y-2">
          {subjects.map((subj) => (
            <div
              key={subj.id}
              className="flex items-center justify-between p-4 border rounded-lg"
            >
              {editingId === subj.id ? (
                <div className="space-y-2 flex-1 mr-2">
                  <Input
                    value={editSubjectName}
                    onChange={(e) => setEditSubjectName(e.target.value)}
                  />
                  <Textarea
                    value={editDescription}
                    onChange={(e) => setEditDescription(e.target.value)}
                  />
                  <div className="flex gap-2">
                    <Button size="sm" onClick={() => handleUpdate(subj.id)}>
                      <Check className="h-4 w-4 mr-1" /> Save
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setEditingId(null)}
                    >
                      <X className="h-4 w-4 mr-1" /> Cancel
                    </Button>
                  </div>
                </div>
              ) : (
                <>
                  <div>
                    <p className="font-medium">{subj.subject_name}</p>
                    {subj.description && (
                      <p className="text-sm text-muted-foreground">{subj.description}</p>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => {
                        setEditingId(subj.id);
                        setEditSubjectName(subj.subject_name);
                        setEditDescription(subj.description || '');
                      }}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => handleDelete(subj.id)}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
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

