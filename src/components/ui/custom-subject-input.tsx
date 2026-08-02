
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Plus } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/components/ui/use-toast';

interface CustomSubjectInputProps {
  subjects: any[];
  value: string;
  onChange: (value: string) => void;
  onSubjectsUpdate: () => void;
}

export const CustomSubjectInput: React.FC<CustomSubjectInputProps> = ({
  subjects,
  value,
  onChange,
  onSubjectsUpdate,
}) => {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [newSubjectName, setNewSubjectName] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const { toast } = useToast();

  const handleCreateSubject = async () => {
    if (!newSubjectName.trim()) {
      toast({
        title: 'Subject name required',
        description: 'Please enter a subject name.',
        variant: 'destructive',
      });
      return;
    }

    setIsCreating(true);
    try {
      const { data: user } = await supabase.auth.getUser();
      if (!user.user) throw new Error('Not authenticated');

      // Check user permissions (admin or parent only can create subjects)
      const { data: profile } = await supabase
        .from('profiles')
        .select('role, is_approved')
        .eq('user_id', user.user.id)
        .single();

      if (!profile || !['admin', 'parent'].includes(profile.role) || !profile.is_approved) {
        toast({
          title: 'Permission denied',
          description: 'Only approved parents can create subjects.',
          variant: 'destructive',
        });
        return;
      }

      // Check if subject already exists for this parent
      const { data: existingSubjects } = await supabase
        .from('subjects')
        .select('*')
        .eq('parent_id', user.user.id)
        .eq('subject_name', newSubjectName.trim());

      if (existingSubjects && existingSubjects.length > 0) {
        toast({
          title: 'Subject exists',
          description: 'You already have a subject with this name.',
          variant: 'destructive',
        });
        return;
      }

      const { data: newSubject, error } = await supabase
        .from('subjects')
        .insert({
          parent_id: user.user.id,
          subject_name: newSubjectName.trim(),
        })
        .select()
        .single();

      if (error) throw error;

      toast({
        title: 'Subject created',
        description: `${newSubjectName} has been added to your subjects.`,
      });

      setNewSubjectName('');
      setIsDialogOpen(false);
      onChange(newSubject.id);
      onSubjectsUpdate();
    } catch (error: any) {
      toast({
        title: 'Failed to create subject',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <div className="space-y-2">
      <Label htmlFor="subject">Subject</Label>
      <div className="flex gap-2">
        <Select value={value} onValueChange={onChange}>
          <SelectTrigger className="flex-1">
            <SelectValue placeholder="Select subject" />
          </SelectTrigger>
          <SelectContent>
            {subjects.map((subj) => (
              <SelectItem key={subj.id} value={subj.id}>
                {subj.subject_name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button type="button" variant="outline" size="icon" className="h-10 w-10">
              <Plus className="h-4 w-4" />
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add Custom Subject</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="new-subject-name">Subject Name</Label>
                <Input
                  id="new-subject-name"
                  value={newSubjectName}
                  onChange={(e) => setNewSubjectName(e.target.value)}
                  placeholder="Enter subject name"
                  onKeyPress={(e) => e.key === 'Enter' && handleCreateSubject()}
                />
              </div>
              <div className="flex justify-end gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsDialogOpen(false)}
                >
                  Cancel
                </Button>
                <Button
                  type="button"
                  onClick={handleCreateSubject}
                  disabled={isCreating || !newSubjectName.trim()}
                >
                  {isCreating ? 'Creating...' : 'Create Subject'}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
};

export default CustomSubjectInput;
