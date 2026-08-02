import { useAuth } from './useAuth';

export const useRBAC = () => {
  const { profile, isAuthenticated, loading } = useAuth();

  const hasRole = (allowedRoles: string[]) => {
    if (!isAuthenticated || !profile) return false;
    return allowedRoles.includes(profile.role);
  };

  const hasPermission = (allowedRoles: string[], requireApproval = true) => {
    if (loading) return false;
    if (!isAuthenticated || !profile) return false;
    
    // Check role permission
    if (!allowedRoles.includes(profile.role)) return false;
    
    // Check approval if required (students don't need approval by default)
    if (requireApproval && profile.role !== 'student' && !profile.is_approved) return false;
    
    return true;
  };

  const isAdmin = () => hasRole(['admin']) && profile?.is_approved;
  const isTeacher = () => hasRole(['teacher']) && profile?.is_approved;
  const isStudent = () => hasRole(['student']);
  const isApproved = () => profile?.is_approved || profile?.role === 'student';

  return {
    hasRole,
    hasPermission,
    isAdmin,
    isTeacher,
    isParent: isTeacher,
    isStudent,
    isChild: isStudent,
    isApproved,
    profile,
    isAuthenticated,
    loading
  };
};