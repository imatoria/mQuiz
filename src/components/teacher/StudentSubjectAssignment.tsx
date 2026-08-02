import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { useToast } from '@/hooks/use-toast';
import { dbService } from '@/services/db';
import { authService } from '@/services/auth/authService';
import { BookOpen, Save, X } from 'lucide-react';
import { useSubjectsTeacher } from '@/hooks/useSubjectsTeacher';

interface StudentSubjectAssignmentProps {
  studentId?: string;
  childId?: string;
  studentName?: string;
  childName?: string;
}

export const StudentSubjectAssignment = ({ 
  studentId: targetStudentId, 
  childId, 
  studentName: targetStudentName, 
  childName 
}: StudentSubjectAssignmentProps) => {
  const effectiveStudentId = targetStudentId || childId || '';
  const effectiveStudentName = targetStudentName || childName || 'Student';

  const { subjects: allSubjects, isLoading: subjectsLoading } = useSubjectsTeacher();
  const [currentSubjects, setCurrentSubjects] = useState<string[]>([]);
  const [selectedSubjects, setSelectedSubjects] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (effectiveStudentId) fetchCurrentSubjects();
  }, [effectiveStudentId]);

  const fetchCurrentSubjects = async () => {
    try {
      const user = authService.getCurrentUser();
      if (!user) return;

      const { data: assignmentsData, error: assignmentsError } = await dbService.getProvider().query(
        'SELECT subject_id FROM student_subject_assignments WHERE student_id = ? AND teacher_id = ? AND is_current = ?',
        [effectiveStudentId, user.id, true]
      );

      if (assignmentsError) throw assignmentsError;

      const subjectIds = assignmentsData?.map(a => a.subject_id) || [];
      
      setCurrentSubjects(subjectIds);
      setSelectedSubjects(subjectIds);
    } catch (error: any) {
      console.error('Error fetching subject data:', error);
      toast({
        title: "Error loading subjects",
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
    setIsSaving(true);

    try {
      const user = authService.getCurrentUser();
      if (!user) throw new Error('Not authenticated');

      // Mark existing assignments as not current
      await dbService.getProvider().execute(
        'UPDATE student_subject_assignments SET is_current = ? WHERE student_id = ? AND teacher_id = ?',
        [false, effectiveStudentId, user.id]
      );

      // Insert new current assignments
      if (selectedSubjects.length > 0) {
        let err = null;
        for (const subjectId of selectedSubjects) {
          const { error } = await dbService.getProvider().execute(
            'INSERT INTO student_subject_assignments (id, student_id, teacher_id, subject_id, is_current) VALUES (?, ?, ?, ?, ?)',
            [crypto.randomUUID(), effectiveStudentId, user.id, subjectId, true]
          );
          if (error) err = error;
        }

        if (err) throw err;
      }

      setCurrentSubjects(selectedSubjects);
      toast({
        title: "Subjects assigned successfully",
        description: `${selectedSubjects.length} subjects assigned to ${effectiveStudentName}`,
      });
    } catch (error: any) {
      console.error('Error:', error);
      toast({
        title: "Failed to assign subjects",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
    setSelectedSubjects(currentSubjects);
  };

  const hasChanges = 
    selectedSubjects.length !== currentSubjects.length ||
    !selectedSubjects.every(id => currentSubjects.includes(id));

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <BookOpen className="w-5 h-5 text-primary" />
          Subject Assignments
        </CardTitle>
      </CardHeader>

      <CardContent className="space-y-4">
        <div className="space-y-2">
          <label className="text-sm font-medium">Select Subjects</label>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-60 overflow-y-auto p-1">
            {allSubjects.map((subject) => (
              <div key={subject.id} className="flex items-center space-x-2 border p-2.5 rounded-md">
                <Checkbox
                  id={`subj-assign-${subject.id}`}
                  checked={selectedSubjects.includes(subject.id)}
                  onCheckedChange={(checked) => handleSubjectToggle(subject.id, !!checked)}
                  disabled={subjectsLoading || isLoading}
                />
                <label
                  htmlFor={`subj-assign-${subject.id}`}
                  className="text-sm font-medium leading-none cursor-pointer flex-1"
                >
                  {subject.subject_name}
                </label>
              </div>
            ))}
          </div>
        </div>

        {hasChanges && (
          <div className="flex items-center justify-end space-x-2 pt-2 border-t">
            <Button
              variant="outline"
              size="sm"
              onClick={handleCancel}
              disabled={isSaving}
            >
              <X className="w-4 h-4 mr-1" />
              Cancel
            </Button>
            <Button
              size="sm"
              onClick={handleSave}
              disabled={isSaving}
            >
              <Save className="w-4 h-4 mr-1" />
              {isSaving ? 'Saving...' : 'Save Subjects'}
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export const ChildSubjectAssignment = StudentSubjectAssignment;
