import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { GraduationCap, Save, X } from 'lucide-react';

interface ChildClassAssignmentProps {
  childId: string;
  childName: string;
}

const classLevels = [
  { value: 'grade_1', label: 'Grade 1' },
  { value: 'grade_2', label: 'Grade 2' },
  { value: 'grade_3', label: 'Grade 3' },
  { value: 'grade_4', label: 'Grade 4' },
  { value: 'grade_5', label: 'Grade 5' },
  { value: 'grade_6', label: 'Grade 6' },
  { value: 'grade_7', label: 'Grade 7' },
  { value: 'grade_8', label: 'Grade 8' },
  { value: 'grade_9', label: 'Grade 9' },
  { value: 'grade_10', label: 'Grade 10' },
  { value: 'grade_11', label: 'Grade 11' },
  { value: 'grade_12', label: 'Grade 12' },
];

export const ChildClassAssignment = ({ childId, childName }: ChildClassAssignmentProps) => {
  const [currentClass, setCurrentClass] = useState<string>('');
  const [selectedClass, setSelectedClass] = useState<string>('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    fetchCurrentClass();
  }, [childId]);

  const fetchCurrentClass = async () => {
    try {
      const { data: user } = await supabase.auth.getUser();
      if (!user.user) return;

      const { data, error } = await supabase
        .from('child_class_assignments')
        .select('class_level')
        .eq('child_id', childId)
        .eq('parent_id', user.user.id)
        .eq('is_current', true)
        .maybeSingle();

      if (error) throw error;

      const classLevel = data?.class_level || '';
      setCurrentClass(classLevel);
      setSelectedClass(classLevel);
    } catch (error: any) {
      console.error('Error fetching child class:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSave = async () => {
    if (!selectedClass) {
      toast({
        title: "Please select a class",
        variant: "destructive",
      });
      return;
    }

    setIsSaving(true);

    try {
      const { data: user } = await supabase.auth.getUser();
      if (!user.user) throw new Error('Not authenticated');

      // First, mark existing assignments as not current
      await supabase
        .from('child_class_assignments')
        .update({ is_current: false })
        .eq('child_id', childId)
        .eq('parent_id', user.user.id);

      // Then insert new current assignment
      const { error } = await supabase
        .from('child_class_assignments')
        .upsert({
          child_id: childId,
          parent_id: user.user.id,
          class_level: selectedClass as any,
          is_current: true,
        });

      if (error) throw error;

      setCurrentClass(selectedClass);
      toast({
        title: "Class assigned successfully",
        description: `${childName} has been assigned to ${classLevels.find(c => c.value === selectedClass)?.label}`,
      });
    } catch (error: any) {
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
    setSelectedClass(currentClass);
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="text-center">Loading class assignment...</div>
        </CardContent>
      </Card>
    );
  }

  const hasChanges = selectedClass !== currentClass;

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
          {currentClass && (
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">Current Class:</span>
              <Badge variant="secondary">
                {classLevels.find(c => c.value === currentClass)?.label || currentClass}
              </Badge>
            </div>
          )}
          
          <Select value={selectedClass} onValueChange={setSelectedClass}>
            <SelectTrigger>
              <SelectValue placeholder="Select a class level" />
            </SelectTrigger>
            <SelectContent>
              {classLevels.map((classLevel) => (
                <SelectItem key={classLevel.value} value={classLevel.value}>
                  {classLevel.label}
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