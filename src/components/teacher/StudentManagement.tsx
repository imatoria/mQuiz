import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Switch } from '@/components/ui/switch';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { dbService } from '@/services/db';
import { authService } from '@/services/auth/authService';
import { StudentAcademicProfile } from './StudentAcademicProfile';
import { 
  Plus, 
  UserPlus, 
  Mail, 
  Trash2, 
  Users, 
  AlertCircle,
  CheckCircle,
  Clock,
  Key,
  Settings,
  GraduationCap
} from 'lucide-react';

interface Student {
  id: string;
  user_id: string;
  email: string | null;
  full_name: string | null;
  is_approved: boolean;
  created_at: string;
  class_name?: string;
  subject_names?: string[];
}

interface StudentManagementProps {
  onStudentsUpdate?: () => void;
}

export const StudentManagement = ({ onStudentsUpdate }: StudentManagementProps) => {
  const [students, setStudents] = useState<Student[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isAddingStudent, setIsAddingStudent] = useState(false);
  const [newStudentEmail, setNewStudentEmail] = useState('');
  const [newStudentName, setNewStudentName] = useState('');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedStudentForProfile, setSelectedStudentForProfile] = useState<Student | null>(null);
  const [togglingStudentId, setTogglingStudentId] = useState<string | null>(null);
  const [fetchingAcademicInfo, setFetchingAcademicInfo] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    fetchStudents();
  }, []);

  const fetchStudents = async () => {
    try {
      const user = authService.getCurrentUser();
      if (!user) {
        console.log('StudentManagement: No authenticated user');
        return;
      }

      console.log('StudentManagement: Fetching students for teacher:', user.id);

      // Get students associated with this teacher
      const { data: relationships, error: relError } = await dbService.getProvider().query(
        'SELECT * FROM teacher_student_relationships WHERE teacher_id = ?',
        [user.id]
      );

      if (relError) throw relError;

      let studentIds = (relationships || []).map((rel: any) => rel.student_id || rel.student_id);

      // Fallback: If logged in as admin or demo teacher without explicit relationship rows, show assigned students
      if (studentIds.length === 0) {
        const { data: allRels } = await dbService.getProvider().query('SELECT * FROM teacher_student_relationships');
        if (allRels && allRels.length > 0) {
          studentIds = allRels.map((r: any) => r.student_id || r.student_id);
        }
      }

      if (studentIds.length > 0) {
        const placeholders = studentIds.map(() => '?').join(',');
        const { data: studentsData, error: studentsError } = await dbService.getProvider().query(
          `SELECT * FROM profiles WHERE user_id IN (${placeholders})`,
          studentIds
        );

        if (studentsError) throw studentsError;

        const { data: allClasses } = await dbService.getProvider().query('SELECT * FROM classes');
        const { data: allSubjects } = await dbService.getProvider().query('SELECT * FROM subjects');
        const classMap = new Map((allClasses || []).map((c: any) => [c.id, c.class_name]));
        const subjMap = new Map((allSubjects || []).map((s: any) => [s.id, s.subject_name]));

        setFetchingAcademicInfo(true);
        const studentsWithAcademicInfo = await Promise.all(
          (studentsData || []).map(async (student: any) => {
            // Fetch class assignment by student_id
            const { data: classDataRes } = await dbService.getProvider().query(
              'SELECT * FROM student_class_assignments WHERE student_id = ? LIMIT 1',
              [student.user_id]
            );
            const classData = classDataRes?.[0];

            // Fetch subject assignments by student_id
            const { data: subjectsData } = await dbService.getProvider().query(
              'SELECT * FROM student_subject_assignments WHERE student_id = ?',
              [student.user_id]
            );

            const className = classData?.class_id ? classMap.get(classData.class_id) : undefined;
            const subjectNames = (subjectsData || []).map((s: any) => subjMap.get(s.subject_id)).filter(Boolean) as string[];

            return {
              ...student,
              class_name: className,
              subject_names: subjectNames
            };
          })
        );
        setFetchingAcademicInfo(false);
        setStudents(studentsWithAcademicInfo);
      } else {
        setStudents([]);
      }
    } catch (error: any) {
      console.error('StudentManagement: Error fetching students:', error);
      toast({
        title: "Error fetching students",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddStudent = async () => {
    if (!newStudentEmail || !newStudentName) {
      toast({
        title: "Missing information",
        description: "Please provide both email and name for the student.",
        variant: "destructive",
      });
      return;
    }

    setIsAddingStudent(true);

    try {
      const user = authService.getCurrentUser();
      if (!user) throw new Error('Not authenticated');

      const newStudentId = crypto.randomUUID();
      await dbService.getProvider().execute(
        'INSERT INTO profiles (user_id, email, full_name, role, is_approved) VALUES (?, ?, ?, ?, ?)',
        [newStudentId, newStudentEmail, newStudentName, 'student', true]
      );
      await dbService.getProvider().execute(
        'INSERT INTO teacher_student_relationships (id, teacher_id, student_id) VALUES (?, ?, ?)',
        [crypto.randomUUID(), user.id, newStudentId]
      );

      toast({
        title: "Student added successfully",
        description: `${newStudentName} has been added to your students list.`,
      });

      // Reset form and refresh
      setNewStudentEmail('');
      setNewStudentName('');
      setIsDialogOpen(false);
      fetchStudents();
      onStudentsUpdate?.();
      onStudentsUpdate?.();

    } catch (error: any) {
      console.error('Error:', error);
      toast({
        title: "Failed to add student",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsAddingStudent(false);
    }
  };

  const handleRemoveStudent = async (studentId: string, studentName: string) => {
    if (!confirm(`Are you sure you want to remove ${studentName} from your students list?`)) {
      return;
    }

    try {
      const user = authService.getCurrentUser();
      if (!user) throw new Error('Not authenticated');

      const { error } = await dbService.getProvider().execute(
        'DELETE FROM teacher_student_relationships WHERE teacher_id = ? AND student_id = ?',
        [user.id, studentId]
      );

      if (error) throw error;

      toast({
        title: "Student removed",
        description: `${studentName} has been removed from your students list.`,
      });

      fetchStudents();
      onStudentsUpdate?.();
      onStudentsUpdate?.();

    } catch (error: any) {
      console.error('Error:', error);
      toast({
        title: "Failed to remove student",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleToggleActive = async (studentId: string, currentStatus: boolean) => {
    setTogglingStudentId(studentId);
    try {
      const { error } = await dbService.getProvider().execute(
        'UPDATE profiles SET is_approved = ? WHERE user_id = ?',
        [!currentStatus, studentId]
      );

      if (error) throw error;

      toast({
        title: "Status updated",
        description: `Student account is now ${!currentStatus ? 'active' : 'inactive'}`,
      });

      fetchStudents();
    } catch (error: any) {
      console.error('Error:', error);
      toast({
        title: "Failed to update status",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setTogglingStudentId(null);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Student Management</h2>
          <p className="text-muted-foreground">Manage student profiles, assign classes and subjects</p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button className="w-full sm:w-auto">
              <UserPlus className="w-4 h-4 mr-2" />
              Add Student
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle>Add Student</DialogTitle>
              <DialogDescription>
                Enter the details to add a new student to your list.
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="name">Full Name</Label>
                <Input
                  id="name"
                  value={newStudentName}
                  onChange={(e) => setNewStudentName(e.target.value)}
                  placeholder="John Doe"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={newStudentEmail}
                  onChange={(e) => setNewStudentEmail(e.target.value)}
                  placeholder="john@example.com"
                />
              </div>
            </div>
            <div className="flex justify-end gap-3">
              <Button variant="outline" onClick={() => setIsDialogOpen(false)}>Cancel</Button>
              <Button onClick={handleAddStudent} disabled={isAddingStudent}>
                {isAddingStudent ? 'Adding...' : 'Add Student'}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <Card key={i}>
              <CardHeader className="pb-3">
                <Skeleton className="h-5 w-1/2" />
                <Skeleton className="h-4 w-3/4" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-8 w-full" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : students.length === 0 ? (
        <Card className="text-center py-12">
          <CardContent className="space-y-4">
            <div className="w-12 h-12 rounded-full bg-primary/10 text-primary flex items-center justify-center mx-auto">
              <Users className="w-6 h-6" />
            </div>
            <div className="space-y-2">
              <h3 className="text-lg font-semibold">No students added yet</h3>
              <p className="text-sm text-muted-foreground max-w-sm mx-auto">
                Add students to assign classes, subjects, and monitor their performance.
              </p>
            </div>
            <Button onClick={() => setIsDialogOpen(true)}>
              <UserPlus className="w-4 h-4 mr-2" />
              Add Your First Student
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {students.map((student) => (
            <Card key={student.id} className="relative overflow-hidden">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="space-y-1">
                    <CardTitle className="text-lg">{student.full_name || 'Unnamed Student'}</CardTitle>
                    <CardDescription className="flex items-center text-xs">
                      <Mail className="w-3 h-3 mr-1" />
                      {student.email || 'No email provided'}
                    </CardDescription>
                  </div>
                  <Badge variant={student.is_approved ? "default" : "secondary"}>
                    {student.is_approved ? 'Active' : 'Inactive'}
                  </Badge>
                </div>
              </CardHeader>

              <CardContent className="space-y-4">
                <div className="space-y-2 text-xs">
                  <div className="flex items-center justify-between text-muted-foreground">
                    <span>Class Level:</span>
                    <span className="font-medium text-foreground">
                      {student.class_name || 'Not assigned'}
                    </span>
                  </div>
                  <div className="flex items-start justify-between text-muted-foreground">
                    <span>Assigned Subjects:</span>
                    <div className="flex flex-wrap gap-1 justify-end max-w-[60%]">
                      {student.subject_names && student.subject_names.length > 0 ? (
                        student.subject_names.map((subject, idx) => (
                          <Badge key={idx} variant="outline" className="text-[10px]">
                            {subject}
                          </Badge>
                        ))
                      ) : (
                        <span className="font-medium text-foreground">None</span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="pt-2 border-t flex items-center justify-between gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1 text-xs"
                    onClick={() => setSelectedStudentForProfile(student)}
                  >
                    <GraduationCap className="w-3.5 h-3.5 mr-1" />
                    Academic Profile
                  </Button>

                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-destructive hover:bg-destructive/10 hover:text-destructive"
                    onClick={() => handleRemoveStudent(student.user_id, student.full_name || 'Student')}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {selectedStudentForProfile && (
        <Dialog open={!!selectedStudentForProfile} onOpenChange={() => setSelectedStudentForProfile(null)}>
          <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Academic Profile: {selectedStudentForProfile.full_name}</DialogTitle>
              <DialogDescription>
                Assign class level and subjects for this student.
              </DialogDescription>
            </DialogHeader>
            <StudentAcademicProfile
              studentId={selectedStudentForProfile.user_id}
              studentName={selectedStudentForProfile.full_name || undefined}
              onProfileUpdate={() => {
                fetchStudents();
              }}
            />
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
};

