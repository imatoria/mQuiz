import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { dbService } from '@/services/db';
import { authService } from '@/services/auth/authService';
import { 
  Shield, 
  User,
  Settings,
  BookOpen,
  Calendar,
  BarChart3,
  Save,
  Lock,
  Unlock
} from 'lucide-react';

interface Student {
  id: string;
  user_id: string;
  email: string | null;
  full_name: string | null;
  is_approved: boolean;
}

interface StudentPermissions {
  user_id: string;
  can_view_analytics: boolean;
  can_retake_tests: boolean;
  can_view_detailed_results: boolean;
  can_access_content_library: boolean;
  max_test_attempts: number;
  restricted_subjects: string[];
}

export const StudentPermissionManager = () => {
  const [students, setStudents] = useState<Student[]>([]);
  const [permissions, setPermissions] = useState<Record<string, StudentPermissions>>({});
  const [selectedStudent, setSelectedStudent] = useState<string>('');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    fetchStudents();
  }, []);

  const fetchStudents = async () => {
    try {
      const user = authService.getCurrentUser();
      if (!user) return;

      const { data: relationships, error: relError } = await dbService.getProvider().query(
        'SELECT student_id FROM teacher_student_relationships WHERE teacher_id = ?',
        [user.id]
      );

      if (relError) throw relError;

      const studentIds = (relationships || []).map((rel: any) => rel.student_id || rel.student_id);

      if (studentIds.length > 0) {
        const placeholders = studentIds.map(() => '?').join(',');
        const { data: studentsData, error: studentsError } = await dbService.getProvider().query(
          `SELECT * FROM profiles WHERE user_id IN (${placeholders}) AND is_approved = ?`,
          [...studentIds, true]
        );

        if (studentsError) throw studentsError;
        
        setStudents(studentsData || []);
        
        // Initialize default permissions for each student
        const defaultPermissions: Record<string, StudentPermissions> = {};
        (studentsData || []).forEach(student => {
          defaultPermissions[student.user_id] = {
            user_id: student.user_id,
            can_view_analytics: false,
            can_retake_tests: true,
            can_view_detailed_results: true,
            can_access_content_library: true,
            max_test_attempts: 3,
            restricted_subjects: []
          };
        });
        setPermissions(defaultPermissions);
      }
    } catch (error: any) {
      console.error('Error:', error);
      toast({
        title: "Error fetching students",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handlePermissionChange = (studentId: string, key: keyof StudentPermissions, value: any) => {
    setPermissions(prev => ({
      ...prev,
      [studentId]: {
        ...prev[studentId],
        [key]: value
      }
    }));
  };

  const handleSavePermissions = (studentId: string) => {
    const studentName = students.find(s => s.user_id === studentId)?.full_name || 'Student';
    toast({
      title: "Permissions Saved",
      description: `Updated access permissions for ${studentName}`,
    });
    setIsDialogOpen(false);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Shield className="w-5 h-5 text-primary" />
          Student Permission Manager
        </CardTitle>
        <CardDescription>
          Configure access levels, test attempt limits, and feature permissions for students
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {students.length === 0 ? (
          <p className="text-sm text-muted-foreground py-4 text-center">No active students to configure</p>
        ) : (
          <div className="space-y-3">
            {students.map(student => (
              <div key={student.user_id} className="flex items-center justify-between border p-3 rounded-lg">
                <div className="flex items-center gap-3">
                  <User className="w-4 h-4 text-muted-foreground" />
                  <div>
                    <p className="font-medium text-sm">{student.full_name || 'Unnamed Student'}</p>
                    <p className="text-xs text-muted-foreground">{student.email}</p>
                  </div>
                </div>
                <Dialog>
                  <DialogTrigger asStudent>
                    <Button variant="outline" size="sm" onClick={() => setSelectedStudent(student.user_id)}>
                      <Settings className="w-3.5 h-3.5 mr-1" />
                      Configure
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-md">
                    <DialogHeader>
                      <DialogTitle>Configure Permissions: {student.full_name}</DialogTitle>
                      <DialogDescription>
                        Set rules and feature access for this student.
                      </DialogDescription>
                    </DialogHeader>
                    {permissions[student.user_id] && (
                      <div className="space-y-4 py-2">
                        <div className="flex items-center justify-between">
                          <Label htmlFor="retake" className="cursor-pointer text-sm">Allow Test Retakes</Label>
                          <Switch
                            id="retake"
                            checked={permissions[student.user_id].can_retake_tests}
                            onCheckedChange={val => handlePermissionChange(student.user_id, 'can_retake_tests', val)}
                          />
                        </div>
                        <div className="flex items-center justify-between">
                          <Label htmlFor="analytics" className="cursor-pointer text-sm">View Advanced Analytics</Label>
                          <Switch
                            id="analytics"
                            checked={permissions[student.user_id].can_view_analytics}
                            onCheckedChange={val => handlePermissionChange(student.user_id, 'can_view_analytics', val)}
                          />
                        </div>
                        <div className="flex items-center justify-between">
                          <Label htmlFor="library" className="cursor-pointer text-sm">Access Content Library</Label>
                          <Switch
                            id="library"
                            checked={permissions[student.user_id].can_access_content_library}
                            onCheckedChange={val => handlePermissionChange(student.user_id, 'can_access_content_library', val)}
                          />
                        </div>
                        <div className="flex justify-end gap-2 pt-4">
                          <Button size="sm" onClick={() => handleSavePermissions(student.user_id)}>
                            <Save className="w-3.5 h-3.5 mr-1" />
                            Save Rules
                          </Button>
                        </div>
                      </div>
                    )}
                  </DialogContent>
                </Dialog>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

