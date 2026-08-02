import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { useToast } from '@/hooks/use-toast';
import { dbService } from '@/services/db';
import { authService } from '@/services/auth/authService';
import { BookOpen, Save, X } from 'lucide-react';
import { useSubjectsParent } from '@/hooks/useSubjectsParent';

interface ChildSubjectAssignmentProps {
  childId: string;
  childName: string;
}


export const ChildSubjectAssignment = ({ childId, childName }: ChildSubjectAssignmentProps) => {
  const { subjects: allSubjects, isLoading: subjectsLoading } = useSubjectsParent();
  const [currentSubjects, setCurrentSubjects] = useState<string[]>([]);
  const [selectedSubjects, setSelectedSubjects] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    fetchCurrentSubjects();
  }, [childId]);

  const fetchCurrentSubjects = async () => {
    try {
      const user = authService.getCurrentUser();
      if (!user) return;

      // Fetch current subject assignments
      const { data: assignmentsData, error: assignmentsError } = await dbService.getProvider().query(
        'SELECT subject_id FROM child_subject_assignments WHERE child_id = ? AND parent_id = ? AND is_current = ?',
        [childId, user.id, true]
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

      // First, mark existing assignments as not current
      await dbService.getProvider().execute(
        'UPDATE child_subject_assignments SET is_current = ? WHERE child_id = ? AND parent_id = ?',
        [false, childId, user.id]
      );

      // Then insert new current assignments
      if (selectedSubjects.length > 0) {
        let err = null;
        for (const subjectId of selectedSubjects) {
          const { error } = await dbService.getProvider().execute(
            'INSERT INTO child_subject_assignments (id, child_id, parent_id, subject_id, is_current) VALUES (?, ?, ?, ?, ?)',
            [crypto.randomUUID(), childId, user.id, subjectId, true]
          );
          if (error) err = error;
        }

        if (err) throw err;
      }

      setCurrentSubjects(selectedSubjects);
      toast({
        title: "Subjects assigned successfully",
        description: `${selectedSubjects.length} subjects assigned to ${childName}`,
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

  if (isLoading || subjectsLoading) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="text-center">Loading subject assignments...</div>
        </CardContent>
      </Card>
    );
  }

  const hasChanges = JSON.stringify(selectedSubjects.sort()) !== JSON.stringify(currentSubjects.sort());

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <BookOpen className="h-5 w-5" />
          Subject Assignments for {childName}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
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
            <span className="text-sm font-medium">Select Subjects:</span>
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
        </div>

        {hasChanges && (
          <div className="flex gap-2">
            <Button onClick={handleSave} disabled={isSaving}>
              {isSaving ? (
                <>Saving...</>
              ) : (
                <>
                  <Save className="h-4 w-4 mr-2" />
                  Save Assignments
                </>
              )}
            </Button>
            <Button variant="outline" onClick={handleCancel}>
              <X className="h-4 w-4 mr-2" />
              Cancel
            </Button>
          </div>
        )}

        {selectedSubjects.length === 0 && (
          <div className="text-sm text-muted-foreground">
            No subjects selected. The child will not have access to any subject-specific content.
          </div>
        )}
      </CardContent>
    </Card>
  );
};