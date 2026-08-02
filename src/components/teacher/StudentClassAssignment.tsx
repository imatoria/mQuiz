import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { dbService } from '@/services/db';
import { authService } from '@/services/auth/authService';
import { GraduationCap, Save, X } from 'lucide-react';
import { useClassesTeacher } from '@/hooks/useClassesTeacher';

interface StudentClassAssignmentProps {
  studentId?: string;
  childId?: string;
  studentName?: string;
  childName?: string;
}

export const StudentClassAssignment = ({ 
  studentId: targetStudentId, 
  childId, 
  studentName: targetStudentName, 
  childName 
}: StudentClassAssignmentProps) => {
  const effectiveStudentId = targetStudentId || childId || '';
  const effectiveStudentName = targetStudentName || childName || 'Student';

  const { classes, isLoading: classesLoading } = useClassesTeacher();
  const [currentClassId, setCurrentClassId] = useState<string>('');
  const [selectedClassId, setSelectedClassId] = useState<string>('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (effectiveStudentId) fetchCurrentClass();
  }, [effectiveStudentId]);

  const fetchCurrentClass = async () => {
    try {
      const user = authService.getCurrentUser();
      if (!user) return;

      const { data: results, error } = await dbService.getProvider().query(
        'SELECT class_id FROM student_class_assignments WHERE student_id = ? AND teacher_id = ? AND is_current = ? LIMIT 1',
        [effectiveStudentId, user.id, true]
      );
      const data = results?.[0];

      if (error) throw error;

      const classId = data?.class_id || '';
      setCurrentClassId(classId);
      setSelectedClassId(classId);
    } catch (error: any) {
      console.error('Error fetching student class:', error);
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

      // Mark existing assignments as not current
      await dbService.getProvider().execute(
        'UPDATE student_class_assignments SET is_current = ? WHERE student_id = ? AND teacher_id = ?',
        [false, effectiveStudentId, user.id]
      );

      // Insert new current assignment
      const { error } = await dbService.getProvider().execute(
        'INSERT INTO student_class_assignments (id, student_id, teacher_id, class_id, is_current) VALUES (?, ?, ?, ?, ?)',
        [crypto.randomUUID(), effectiveStudentId, user.id, selectedClassId, true]
      );

      if (error) throw error;

      setCurrentClassId(selectedClassId);
      const selectedClassName = classes.find(c => c.id === selectedClassId)?.class_name;
      toast({
        title: "Class assigned successfully",
        description: `${effectiveStudentName} has been assigned to ${selectedClassName}`,
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

  const currentClassName = classes.find(c => c.id === currentClassId)?.class_name;
  const hasChanges = selectedClassId !== currentClassId;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <GraduationCap className="w-5 h-5 text-primary" />
          Class Level Assignment
        </CardTitle>
      </CardHeader>

      <CardContent className="space-y-4">
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium">Current Assignment:</span>
          {currentClassName ? (
            <Badge variant="default" className="text-xs">
              {currentClassName}
            </Badge>
          ) : (
            <Badge variant="secondary" className="text-xs">
              Not Assigned
            </Badge>
          )}
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium">Assign New Class</label>
          <Select
            value={selectedClassId}
            onValueChange={setSelectedClassId}
            disabled={classesLoading || isLoading}
          >
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

        {hasChanges && (
          <div className="flex items-center justify-end space-x-2 pt-2">
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
              {isSaving ? 'Saving...' : 'Save Class'}
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export const ChildClassAssignment = StudentClassAssignment;
