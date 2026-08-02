import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/hooks/use-toast';
import { dbService } from '@/services/db';
import { authService } from '@/services/auth/authService';
import { Save, X } from 'lucide-react';
import { Switch } from '@/components/ui/switch';
import { useClassesTeacher } from '@/hooks/useClassesTeacher';
import { useSubjectsTeacher } from '@/hooks/useSubjectsTeacher';

interface StudentAcademicProfileProps {
  isOpen?: boolean;
  onClose?: () => void;
  studentId?: string;
  childId?: string;
  studentName?: string;
  childName?: string;
  onUpdate?: () => void;
  onProfileUpdate?: () => void;
}

export const StudentAcademicProfile = ({ 
  isOpen = true, 
  onClose, 
  studentId: targetStudentId, 
  childId,
  studentName: targetStudentName,
  childName,
  onUpdate,
  onProfileUpdate
}: StudentAcademicProfileProps) => {
  const effectiveStudentId = targetStudentId || childId || '';
  const effectiveStudentName = targetStudentName || childName || 'Student';

  const { classes, isLoading: classesLoading } = useClassesTeacher();
  const { subjects: allSubjects, isLoading: subjectsLoading } = useSubjectsTeacher();
  const [currentClassId, setCurrentClassId] = useState<string>('');
  const [selectedClassId, setSelectedClassId] = useState<string>('');
  const [currentSubjects, setCurrentSubjects] = useState<string[]>([]);
  const [selectedSubjects, setSelectedSubjects] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (isOpen && effectiveStudentId) {
      fetchCurrentData();
    }
  }, [effectiveStudentId, isOpen]);

  const fetchCurrentData = async () => {
    try {
      // Fetch current class assignment by student_id
      const { data: classDatas } = await dbService.getProvider().query(
        'SELECT * FROM student_class_assignments WHERE student_id = ? LIMIT 1',
        [effectiveStudentId]
      );
      const classData = classDatas?.[0];

      const classId = classData?.class_id || '';
      setCurrentClassId(classId);
      setSelectedClassId(classId);

      // Fetch current subject assignments by student_id
      const { data: subjectsData } = await dbService.getProvider().query(
        'SELECT * FROM student_subject_assignments WHERE student_id = ?',
        [effectiveStudentId]
      );

      const subjectIds = (subjectsData || []).map((s: any) => s.subject_id);
      setCurrentSubjects(subjectIds);
      setSelectedSubjects(subjectIds);
    } catch (error: any) {
      console.error('Error loading academic profile:', error);
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
      const user = authService.getCurrentUser();
      if (!user) throw new Error('Not authenticated');

      // Update class assignment
      await dbService.getProvider().execute(
        'DELETE FROM student_class_assignments WHERE student_id = ?',
        [effectiveStudentId]
      );
      await dbService.getProvider().execute(
        'INSERT INTO student_class_assignments (id, teacher_id, student_id, class_id) VALUES (?, ?, ?, ?)',
        [crypto.randomUUID(), user.id, effectiveStudentId, selectedClassId]
      );

      // Update subject assignments
      await dbService.getProvider().execute(
        'DELETE FROM student_subject_assignments WHERE student_id = ?',
        [effectiveStudentId]
      );

      for (const subjId of selectedSubjects) {
        await dbService.getProvider().execute(
          'INSERT INTO student_subject_assignments (id, teacher_id, student_id, subject_id) VALUES (?, ?, ?, ?)',
          [crypto.randomUUID(), user.id, effectiveStudentId, subjId]
        );
      }

      toast({
        title: "Academic profile updated",
        description: `Successfully updated profile for ${effectiveStudentName}`,
      });

      onUpdate?.();
      onProfileUpdate?.();
      onClose?.();
    } catch (error: any) {
      console.error('Error saving profile:', error);
      toast({
        title: "Failed to save profile",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-6 py-2">
      <div className="space-y-4">
        <div>
          <label className="text-sm font-medium mb-1.5 block">Assign Class Level</label>
          <Select value={selectedClassId} onValueChange={setSelectedClassId}>
            <SelectTrigger>
              <SelectValue placeholder="Select class..." />
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

        <Separator />

        <div>
          <label className="text-sm font-medium mb-2 block">Assign Subjects</label>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-60 overflow-y-auto p-1">
            {allSubjects.map((subject) => (
              <div key={subject.id} className="flex items-center space-x-2 border p-2.5 rounded-md">
                <Checkbox
                  id={`subj-${subject.id}`}
                  checked={selectedSubjects.includes(subject.id)}
                  onCheckedChange={(checked) => handleSubjectToggle(subject.id, !!checked)}
                />
                <label
                  htmlFor={`subj-${subject.id}`}
                  className="text-sm font-medium leading-none cursor-pointer flex-1"
                >
                  {subject.subject_name}
                </label>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="flex justify-end space-x-3 pt-4 border-t">
        {onClose && (
          <Button variant="outline" onClick={onClose} disabled={isSaving}>
            Cancel
          </Button>
        )}
        <Button onClick={handleSave} disabled={isSaving}>
          <Save className="w-4 h-4 mr-2" />
          {isSaving ? 'Saving...' : 'Save Profile'}
        </Button>
      </div>
    </div>
  );
};

export const ChildAcademicProfile = StudentAcademicProfile;
