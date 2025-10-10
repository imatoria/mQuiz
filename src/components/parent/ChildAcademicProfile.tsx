import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Save, X } from 'lucide-react';
import { Switch } from '@/components/ui/switch';
import { useClassesParent } from '@/hooks/useClassesParent';
import { useSubjectsParent } from '@/hooks/useSubjectsParent';

interface ChildAcademicProfileProps {
  isOpen: boolean;
  onClose: () => void;
  childId: string;
  childName: string;
  onUpdate?: () => void;
}

export const ChildAcademicProfile = ({ 
  isOpen, 
  onClose, 
  childId, 
  childName,
  onUpdate
}: ChildAcademicProfileProps) => {
  const { classes, isLoading: classesLoading } = useClassesParent();
  const { subjects: allSubjects, isLoading: subjectsLoading } = useSubjectsParent();
  const [currentClassId, setCurrentClassId] = useState<string>('');
  const [selectedClassId, setSelectedClassId] = useState<string>('');
  const [currentSubjects, setCurrentSubjects] = useState<string[]>([]);
  const [selectedSubjects, setSelectedSubjects] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (isOpen) {
      fetchCurrentData();
    }
  }, [childId, isOpen]);

  const fetchCurrentData = async () => {
    try {
      const { data: user } = await supabase.auth.getUser();
      if (!user.user) return;

      // Fetch current class assignment
      const { data: classData, error: classError } = await supabase
        .from('child_class_assignments')
        .select('class_parent_id')
        .eq('child_id', childId)
        .eq('parent_id', user.user.id)
        .eq('is_current', true)
        .maybeSingle();

      if (classError) throw classError;

      const classId = classData?.class_parent_id || '';
      setCurrentClassId(classId);
      setSelectedClassId(classId);

      // Fetch current subject assignments
      const { data: subjectsData, error: subjectsError } = await supabase
        .from('child_subject_assignments')
        .select('subject_parent_id')
        .eq('child_id', childId)
        .eq('parent_id', user.user.id)
        .eq('is_current', true);

      if (subjectsError) throw subjectsError;

      const subjectIds = subjectsData?.map(s => s.subject_parent_id) || [];
      setCurrentSubjects(subjectIds);
      setSelectedSubjects(subjectIds);
    } catch (error: any) {
      console.error('Error fetching academic data:', error);
      toast({
        title: "Error loading academic profile",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubjectToggle = (subjectId: string, checked: boolean) => {
    if (checked) {
      setSelectedSubjects(prev => [...prev, subjectId]);
    } else {
      setSelectedSubjects(prev => prev.filter(id => id !== subjectId));
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
      const { data: user } = await supabase.auth.getUser();
      if (!user.user) throw new Error('Not authenticated');

      // Update class assignment
      const currentYear = new Date().getFullYear().toString();
      
      // Delete existing assignment for current year
      await supabase
        .from('child_class_assignments')
        .delete()
        .eq('child_id', childId)
        .eq('parent_id', user.user.id)
        .eq('academic_year', currentYear);

      // Insert new assignment
      const { error: classError } = await supabase
        .from('child_class_assignments')
        .insert({
          child_id: childId,
          parent_id: user.user.id,
          class_parent_id: selectedClassId,
          is_current: true,
          academic_year: currentYear,
        });

      if (classError) throw classError;

      // Update subject assignments
      // Delete existing assignments for current year
      await supabase
        .from('child_subject_assignments')
        .delete()
        .eq('child_id', childId)
        .eq('parent_id', user.user.id)
        .eq('academic_year', currentYear);

      if (selectedSubjects.length > 0) {
        const assignments = selectedSubjects.map(subjectParentId => ({
          child_id: childId,
          parent_id: user.user.id,
          subject_parent_id: subjectParentId,
          is_current: true,
          academic_year: currentYear,
        }));

        const { error: subjectsError } = await supabase
          .from('child_subject_assignments')
          .insert(assignments);

        if (subjectsError) throw subjectsError;
      }

      setCurrentClassId(selectedClassId);
      setCurrentSubjects(selectedSubjects);
      
      const selectedClassName = classes.find(c => c.id === selectedClassId)?.class_name;
      toast({
        title: "Academic profile updated",
        description: `${childName} assigned to ${selectedClassName} with ${selectedSubjects.length} subjects`,
      });
      
      // Close modal and notify parent to refresh
      onUpdate?.();
      onClose();
    } catch (error: any) {
      toast({
        title: "Failed to update academic profile",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
    setSelectedClassId(currentClassId);
    setSelectedSubjects(currentSubjects);
  };

  if (isLoading || classesLoading || subjectsLoading) {
    return (
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle className="text-xl">
              Academic Profile - {childName}
            </DialogTitle>
          </DialogHeader>
          <div className="text-center py-8">Loading academic profile...</div>
        </DialogContent>
      </Dialog>
    );
  }

  const hasChanges = 
    selectedClassId !== currentClassId || 
    JSON.stringify(selectedSubjects.sort()) !== JSON.stringify(currentSubjects.sort());
  
  const currentClassName = classes.find(c => c.id === currentClassId)?.class_name;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl">
            Academic Profile - {childName}
          </DialogTitle>
        </DialogHeader>

        <Separator className="my-4" />

        <div className="space-y-6">
          {/* Class Level Section */}
          <div className="space-y-3">
            {currentClassId && (
              <div className="flex items-center gap-2 mb-2">
                <span className="text-sm text-muted-foreground">Current Class:</span>
                <Badge variant="secondary">
                  {currentClassName || 'Unknown Class'}
                </Badge>
              </div>
            )}
            
            <div className="space-y-2">
              <label className="text-sm font-medium">Select Class Level:</label>
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
          </div>

          {/* Subjects Section */}
          <div className="space-y-3">
            {currentSubjects.length > 0 && (
              <div className="space-y-2">
                <span className="text-sm text-muted-foreground">Currently Assigned:</span>
                <div className="flex flex-wrap gap-2">
                  {currentSubjects.map(subjectId => {
                    const subject = allSubjects.find(s => s.id === subjectId);
                    return (
                      <Badge key={subjectId} variant="secondary">
                        {subject?.subject_name || 'Unknown Subject'}
                      </Badge>
                    );
                  })}
                </div>
              </div>
            )}

            <div className="space-y-3">
              <label className="text-sm font-medium">Select Subjects:</label>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                {allSubjects.map((subject) => (
                  <div key={subject.id} className="flex items-center space-x-2">
                    <Checkbox
                      id={`subject-${subject.id}`}
                      checked={selectedSubjects.includes(subject.id)}
                      onCheckedChange={(checked) => 
                        handleSubjectToggle(subject.id, checked as boolean)
                      }
                    />
                    <label 
                      htmlFor={`subject-${subject.id}`} 
                      className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                    >
                      {subject.subject_name}
                    </label>
                  </div>
                ))}
              </div>
            </div>

            {selectedSubjects.length === 0 && (
              <div className="text-sm text-muted-foreground">
                No subjects selected. The child will not have access to any subject-specific content.
              </div>
            )}
          </div>

          {/* Action Buttons */}
          <div className="flex gap-2 pt-4">
            <Button onClick={handleSave} disabled={isSaving || !hasChanges}>
              {isSaving ? (
                <>Saving...</>
              ) : (
                <>
                  <Save className="h-4 w-4 mr-2" />
                  Save Changes
                </>
              )}
            </Button>
            <Button variant="outline" onClick={onClose}>
              <X className="h-4 w-4 mr-2" />
              Cancel
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};