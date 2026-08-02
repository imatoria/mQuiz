import { ReactNode } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Shield, AlertCircle } from 'lucide-react';

interface RoleBasedAccessProps {
  children: ReactNode;
  allowedRoles?: string[];
  requireApproval?: boolean;
  fallback?: ReactNode;
  showError?: boolean;
}

export const RoleBasedAccess = ({ 
  children, 
  allowedRoles = [], 
  requireApproval = true,
  fallback,
  showError = true
}: RoleBasedAccessProps) => {
  const { profile, isAuthenticated, loading } = useAuth();

  // Show loading state
  if (loading) {
    return <div className="text-center py-4">Loading...</div>;
  }

  // Check authentication
  if (!isAuthenticated || !profile) {
    if (fallback) return <>{fallback}</>;
    
    if (showError) {
      return (
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            You must be logged in to access this content.
          </AlertDescription>
        </Alert>
      );
    }
    
    return null;
  }

  // Check role permissions
  if (allowedRoles.length > 0 && !allowedRoles.includes(profile.role)) {
    if (fallback) return <>{fallback}</>;
    
    if (showError) {
      return (
        <Alert variant="destructive">
          <Shield className="h-4 w-4" />
          <AlertDescription>
            You don't have permission to access this content. Required roles: {allowedRoles.join(', ')}.
          </AlertDescription>
        </Alert>
      );
    }
    
    return null;
  }

  // Check approval status
  if (requireApproval && !profile.is_approved) {
    if (fallback) return <>{fallback}</>;
    
    if (showError) {
      return (
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Your account is pending approval. Please contact an administrator.
          </AlertDescription>
        </Alert>
      );
    }
    
    return null;
  }

  // All checks passed, render content
  return <>{children}</>;
};

// Convenience components for specific roles
export const AdminOnly = ({ children, ...props }: Omit<RoleBasedAccessProps, 'allowedRoles'>) => (
  <RoleBasedAccess allowedRoles={['admin']} {...props}>
    {children}
  </RoleBasedAccess>
);

export const TeacherOnly = ({ children, ...props }: Omit<RoleBasedAccessProps, 'allowedRoles'>) => (
  <RoleBasedAccess allowedRoles={['teacher']} {...props}>
    {children}
  </RoleBasedAccess>
);

export const StudentOnly = ({ children, ...props }: Omit<RoleBasedAccessProps, 'allowedRoles'>) => (
  <RoleBasedAccess allowedRoles={['student']} requireApproval={false} {...props}>
    {children}
  </RoleBasedAccess>
);

export const TeacherOrAdmin = ({ children, ...props }: Omit<RoleBasedAccessProps, 'allowedRoles'>) => (
  <RoleBasedAccess allowedRoles={['teacher', 'admin']} {...props}>
    {children}
  </RoleBasedAccess>
);

export const ApprovedUsers = ({ children, ...props }: Omit<RoleBasedAccessProps, 'allowedRoles'>) => (
  <RoleBasedAccess allowedRoles={['admin', 'teacher', 'student']} {...props}>
    {children}
  </RoleBasedAccess>
);