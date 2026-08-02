import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { dbService } from '@/services/db';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/hooks/use-toast';
import { GraduationCap } from 'lucide-react';
import { 
  User, 
  Mail, 
  Calendar, 
  Shield, 
  Users, 
  Baby, 
  Crown,
  Camera,
  Save,
  Loader2
} from 'lucide-react';

interface ChildProfile {
  id: string;
  user_id: string;
  full_name: string | null;
  email: string | null;
  created_at: string;
}

export const ProfileManagement = () => {
  const { user, profile, updateProfile } = useAuth();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [children, setChildren] = useState<ChildProfile[]>([]);
  const [studentClass, setStudentClass] = useState<string | null>(null);
  const [studentSubjects, setStudentSubjects] = useState<string[]>([]);
  const [parentGuardian, setParentGuardian] = useState<{ full_name: string; email: string } | null>(null);
  const [profileData, setProfileData] = useState({
    full_name: profile?.full_name || '',
    email: profile?.email || '',
  });

  useEffect(() => {
    if (profile) {
      setProfileData({
        full_name: profile.full_name || '',
        email: profile.email || '',
      });

      if (profile.role === 'parent') {
        loadChildren(profile.user_id);
      } else if (profile.role === 'student' || profile.role === 'child') {
        loadStudentAcademicInfo();
      }
    }
  }, [profile]);

  const loadStudentAcademicInfo = async () => {
    if (!user) return;
    try {
      // Load current class assignment
      const classAssignData = await dbService.getProvider().query(
        'SELECT * FROM child_class_assignments WHERE child_id = ? AND is_current = true LIMIT 1',
        [user.id]
      );
      const classAssign = classAssignData[0];

      if (classAssign?.class_id) {
        const classObjData = await dbService.getProvider().query(
          'SELECT class_name FROM classes WHERE id = ? LIMIT 1',
          [classAssign.class_id]
        );
        if (classObjData[0]) setStudentClass(classObjData[0].class_name);
      }

      // Load subject assignments
      const subjAssigns = await dbService.getProvider().query(
        'SELECT * FROM child_subject_assignments WHERE child_id = ? AND is_current = true',
        [user.id]
      );

      if (subjAssigns && subjAssigns.length > 0) {
        const sIds = subjAssigns.map((s: any) => s.subject_id);
        const subjs = await dbService.getProvider().query(
          `SELECT subject_name FROM subjects WHERE id IN (${sIds.map(() => '?').join(',')})`,
          sIds
        );
        setStudentSubjects((subjs || []).map((s: any) => s.subject_name));
      }

      // Load parent guardian relationship
      const relData = await dbService.getProvider().query(
        'SELECT parent_id FROM parent_child_relationships WHERE child_id = ? LIMIT 1',
        [user.id]
      );
      const rel = relData[0];

      if (rel?.parent_id) {
        const parentProfData = await dbService.getProvider().query(
          'SELECT full_name, email FROM profiles WHERE user_id = ? LIMIT 1',
          [rel.parent_id]
        );
        if (parentProfData[0]) setParentGuardian({ full_name: parentProfData[0].full_name, email: parentProfData[0].email });
      }
    } catch (err) {
      console.error('Error loading student academic info:', err);
    }
  };

  const loadChildren = async (userId: string) => {
    if (!userId) return;

    try {
      // First get the child relationships
      const { data: relationships } = await dbService.getProvider().query(
        'SELECT child_id FROM parent_child_relationships WHERE parent_id = ?',
        [userId]
      );

      if (relationships && relationships.length > 0) {
        const childIds = new Set(relationships.map((rel: any) => rel.child_id));

        // Then get the profiles for those child IDs
        // Note: fetching all profiles and filtering in JS, as the custom SQL parser
        // does not reliably handle dynamic IN clauses with multiple params
        const { data: allProfiles } = await dbService.getProvider().query(
          'SELECT id, user_id, full_name, email, created_at FROM profiles'
        );

        setChildren((allProfiles || []).filter((p: any) => childIds.has(p.user_id)));
      }
    } catch (error) {
      console.error('Error loading children:', error);
    }
  };

  const handleSaveProfile = async () => {
    if (!profileData.full_name.trim()) {
      toast({
        title: 'Error',
        description: 'Full name is required',
        variant: 'destructive',
      });
      return;
    }

    setIsLoading(true);
    try {
      const { error } = await updateProfile({
        full_name: profileData.full_name.trim(),
      });

      if (error) throw new Error(error);

      toast({
        title: 'Success',
        description: 'Profile updated successfully',
      });
    } catch (error: any) {
      console.error('Error:', error);
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const getRoleIcon = (role: string) => {
    switch (role) {
      case 'admin': return <Crown className="h-5 w-5" />;
      case 'parent': return <Users className="h-5 w-5" />;
      case 'child':
      case 'student': return <Baby className="h-5 w-5" />;
      default: return <User className="h-5 w-5" />;
    }
  };

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'admin': return 'bg-purple-100 text-purple-800 border-purple-200';
      case 'parent': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'child':
      case 'student': return 'bg-green-100 text-green-800 border-green-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  if (!profile) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="text-center">Loading profile...</div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Profile Information */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="h-5 w-5" />
            Profile Information
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Basic Info */}
          <div className="flex items-start gap-6">
            <div className="relative">
              <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center text-2xl font-semibold">
                {profile.full_name?.[0] || profile.email?.[0]?.toUpperCase() || 'U'}
              </div>
              <Button
                variant="outline"
                size="sm"
                className="absolute -bottom-2 -right-2 h-8 w-8 rounded-full p-0"
              >
                <Camera className="h-3 w-3" />
              </Button>
            </div>
            
            <div className="flex-1 space-y-4">
              <div className="flex items-center gap-3">
                {(() => {
                  const roleStr = profile.role || 'user';
                  return (
                    <Badge className={`flex items-center gap-1 ${getRoleColor(roleStr)}`}>
                      {getRoleIcon(roleStr)}
                      {roleStr.charAt(0).toUpperCase() + roleStr.slice(1)}
                    </Badge>
                  );
                })()}
                <Badge variant={profile.is_approved ? "default" : "secondary"}>
                  {profile.is_approved ? "Approved" : "Pending Approval"}
                </Badge>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="full_name">Full Name</Label>
                  <Input
                    id="full_name"
                    value={profileData.full_name}
                    onChange={(e) => setProfileData(prev => ({ ...prev, full_name: e.target.value }))}
                    placeholder="Enter your full name"
                  />
                </div>
                
                <div>
                  <Label htmlFor="email">Email</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="email"
                      value={profileData.email}
                      disabled
                      className="pl-9"
                    />
                  </div>
                </div>
              </div>
              
              <Button onClick={handleSaveProfile} disabled={isLoading} className="w-full md:w-auto">
                {isLoading ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4 mr-2" />
                    Save Changes
                  </>
                )}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Account Details */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Account Details
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-sm">
                <Mail className="h-4 w-4 text-muted-foreground" />
                <span className="text-muted-foreground">Email:</span>
                <span>{profile.email}</span>
              </div>
              
              <div className="flex items-center gap-2 text-sm">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <span className="text-muted-foreground">Member since:</span>
                <span>{new Date(profile.created_at).toLocaleDateString()}</span>
              </div>
            </div>
            
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-sm">
                <Shield className="h-4 w-4 text-muted-foreground" />
                <span className="text-muted-foreground">Role:</span>
                {(() => {
                  const roleStr = profile.role || 'user';
                  return (
                    <Badge className={`${getRoleColor(roleStr)}`}>
                      {getRoleIcon(roleStr)}
                      {roleStr.charAt(0).toUpperCase() + roleStr.slice(1)}
                    </Badge>
                  );
                })()}
              </div>
              
              <div className="flex items-center gap-2 text-sm">
                <User className="h-4 w-4 text-muted-foreground" />
                <span className="text-muted-foreground">Status:</span>
                <Badge variant={profile.is_approved ? "default" : "secondary"}>
                  {profile.is_approved ? "Approved" : "Pending"}
                </Badge>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Children (for parents) */}
      {profile.role === 'parent' && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Baby className="h-5 w-5" />
              My Children
            </CardTitle>
          </CardHeader>
          <CardContent>
            {children.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Baby className="h-12 w-12 mx-auto mb-4" />
                <p>No children added yet</p>
                <p className="text-sm">Children can be added by creating accounts with their information</p>
              </div>
            ) : (
              <div className="space-y-3">
                {children.map((child) => (
                  <div key={child.id} className="flex items-center gap-3 p-3 border rounded-lg">
                    <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center">
                      <Baby className="h-5 w-5 text-green-600" />
                    </div>
                    <div className="flex-1">
                      <div className="font-medium">{child.full_name || 'Unknown'}</div>
                      <div className="text-sm text-muted-foreground">{child.email}</div>
                    </div>
                    <div className="text-sm text-muted-foreground">
                      Added {new Date(child.created_at).toLocaleDateString()}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}
      {/* Academic & Guardian Information for Students */}
      {(profile.role === 'student' || profile.role === 'child') && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <GraduationCap className="h-5 w-5" />
              Academic & Guardian Information
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <span className="text-sm font-medium text-muted-foreground">Class Level:</span>
                <p className="text-base font-semibold">{studentClass || 'Not assigned yet'}</p>
              </div>
              <div>
                <span className="text-sm font-medium text-muted-foreground">Parent / Guardian:</span>
                <p className="text-base font-semibold">
                  {parentGuardian ? `${parentGuardian.full_name} (${parentGuardian.email})` : 'Not linked yet'}
                </p>
              </div>
            </div>

            <div>
              <span className="text-sm font-medium text-muted-foreground">Enrolled Subjects:</span>
              {studentSubjects.length > 0 ? (
                <div className="flex flex-wrap gap-2 mt-2">
                  {studentSubjects.map((subject, idx) => (
                    <Badge key={`${subject}-${idx}`} variant="secondary">
                      {subject}
                    </Badge>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground mt-1">No subjects assigned yet</p>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Security Notice for Admin */}
      {profile.role === 'admin' && !profile.is_approved && (
        <Card className="border-orange-200 bg-orange-50">
          <CardContent className="pt-6">
            <div className="flex items-start gap-3">
              <Shield className="h-5 w-5 text-orange-600 mt-0.5" />
              <div>
                <h3 className="font-medium text-orange-800">Account Pending Approval</h3>
                <p className="text-sm text-orange-700 mt-1">
                  Your admin account requires approval from an existing administrator. 
                  Please contact the system administrator to activate your account.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};