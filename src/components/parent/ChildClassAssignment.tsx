import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { dbService } from '@/services/db';
import { authService } from '@/services/auth/authService';
import { GraduationCap, Save, X } from 'lucide-react';
import { useClassesParent } from '@/hooks/useClassesParent';

interface ChildClassAssignmentProps {
  childId: string;
  childName: string;
}


export const ChildClassAssignment = ({ childId, childName }: ChildClassAssignmentProps) => {
  const { classes, isLoading: classesLoading } = useClassesParent();
  const [currentClassId, setCurrentClassId] = useState<string>('');
  const [selectedClassId, setSelectedClassId] = useState<string>('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    fetchCurrentClass();
  }, [childId]);

  const fetchCurrentClass = async () => {
    try {
      const user = authService.getCurrentUser();
      if (!user) return;

      const { data: results, error } = await dbService.getProvider().query(
        'SELECT class_id FROM child_class_assignments WHERE child_id = ? AND parent_id = ? AND is_current = ? LIMIT 1',
        [childId, user.id, true]
      );
      const data = results?.[0];

      if (error) throw error;

      const classId = data?.class_id || '';
      setCurrentClassId(classId);
      setSelectedClassId(classId);
    } catch (error: any) {
      console.error('Error fetching child class:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSave = async () => {
    if (!selectedClassId) {
      toast({
        title: "Please select a class",
        variant: "destructive",
      });
      return;
    }

    setIsSaving(true);

    try {
      const user = authService.getCurrentUser();
      if (!user) throw new Error('Not authenticated');

      // First, mark existing assignments as not current
      await dbService.getProvider().execute(
        'UPDATE child_class_assignments SET is_current = ? WHERE child_id = ? AND parent_id = ?',
        [false, childId, user.id]
      );

      // Then insert new current assignment
      const { error } = await dbService.getProvider().execute(
        'INSERT INTO child_class_assignments (id, child_id, parent_id, class_id, is_current) VALUES (?, ?, ?, ?, ?)',
        [crypto.randomUUID(), childId, user.id, selectedClassId, true]
      );

      if (error) throw error;

      setCurrentClassId(selectedClassId);
      const selectedClassName = classes.find(c => c.id === selectedClassId)?.class_name;
      toast({
        title: "Class assigned successfully",
        description: `${childName} has been assigned to ${selectedClassName}`,
      });
    } catch (error: any) {
      console.error('Error:', error);
      toast({
        title: "Failed to assign class",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
    setSelectedClassId(currentClassId);
  };

  if (isLoading || classesLoading) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="text-center">Loading class assignment...</div>
        </CardContent>
      </Card>
    );
  }

  const hasChanges = selectedClassId !== currentClassId;
  const currentClassName = classes.find(c => c.id === currentClassId)?.class_name;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <GraduationCap className="h-5 w-5" />
          Class Assignment for {childName}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          {currentClassId && (
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">Current Class:</span>
              <Badge variant="secondary">
                {currentClassName || 'Unknown Class'}
              </Badge>
            </div>
          )}
          
          <Select value={selectedClassId} onValueChange={setSelectedClassId}>
            <SelectTrigger>
              <SelectValue placeholder="Select a class level" />
            </SelectTrigger>
            <SelectContent>
              {classes.map((cls) => (
                <SelectItem key={cls.id} value={cls.id}>
                  {cls.class_name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {hasChanges && (
          <div className="flex gap-2">
            <Button onClick={handleSave} disabled={isSaving}>
              {isSaving ? (
                <>Saving...</>
              ) : (
                <>
                  <Save className="h-4 w-4 mr-2" />
                  Save Assignment
                </>
              )}
            </Button>
            <Button variant="outline" onClick={handleCancel}>
              <X className="h-4 w-4 mr-2" />
              Cancel
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
};