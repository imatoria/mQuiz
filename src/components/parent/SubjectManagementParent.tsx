import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useSubjectsParent } from '@/hooks/useSubjectsParent';
import { toast } from 'sonner';
import { Trash2, Edit, Plus, Check, X } from 'lucide-react';
import { LoadingState } from '@/components/ui/loading-state';

export const SubjectManagementParent = () => {
  const { subjects, isLoading, addSubject, updateSubject, deleteSubject } = useSubjectsParent();
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
                placeholder="Subject description..."
              />
            </div>
            <div className="flex gap-2">
              <Button onClick={handleAdd}>
                <Check className="h-4 w-4 mr-2" />
                Save
              </Button>
              <Button
                variant="outline"
                onClick={() => {
                  setIsAdding(false);
                  setNewSubjectName('');
                  setNewDescription('');
                }}
              >
                <X className="h-4 w-4 mr-2" />
                Cancel
              </Button>
            </div>
          </div>
        )}

        <div className="space-y-2">
          {subjects.map((subject) => (
            <div
              key={subject.id}
              className="flex items-start justify-between p-4 border rounded-lg"
            >
              {editingId === subject.id ? (
                <div className="flex-1 space-y-4">
                  <div>
                    <Label>Subject Name</Label>
                    <Input
                      value={editSubjectName}
                      onChange={(e) => setEditSubjectName(e.target.value)}
                    />
                  </div>
                  <div>
                    <Label>Description</Label>
                    <Textarea
                      value={editDescription}
                      onChange={(e) => setEditDescription(e.target.value)}
                    />
                  </div>
                  <div className="flex gap-2">
                    <Button size="sm" onClick={() => handleUpdate(subject.id)}>
                      <Check className="h-4 w-4 mr-2" />
                      Save
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setEditingId(null)}
                    >
                      <X className="h-4 w-4 mr-2" />
                      Cancel
                    </Button>
                  </div>
                </div>
              ) : (
                <>
                  <div className="flex-1">
                    <p className="font-medium">{subject.subject_name}</p>
                    {subject.description && (
                      <p className="text-sm text-muted-foreground mt-1">
                        {subject.description}
                      </p>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        setEditingId(subject.id);
                        setEditSubjectName(subject.subject_name);
                        setEditDescription(subject.description || '');
                      }}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={() => handleDelete(subject.id)}
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
