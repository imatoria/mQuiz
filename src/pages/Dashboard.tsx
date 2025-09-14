import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { ParentDashboard } from '@/components/parent/ParentDashboard';
import { StudentDashboard } from '@/components/student/StudentDashboard';
import { AdminDashboard } from '@/components/admin/AdminDashboard';
import { 
  BookOpen, 
  FileText, 
  Users, 
  Clock, 
  Trophy,
  Plus,
  Upload,
  BarChart3,
  Settings,
  PlayCircle,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';

interface DashboardProps {
  role: 'admin' | 'parent' | 'child';
  onActiveTabChange?: (tabName: string, tabIcon: any) => void;
}

export const Dashboard = ({ role, onActiveTabChange }: DashboardProps) => {
  const getDashboardContent = () => {
    switch (role) {
      case 'admin':
        return <AdminDashboard onActiveTabChange={onActiveTabChange} />;

      case 'parent':
        return <ParentDashboard onActiveTabChange={onActiveTabChange} />;

      case 'child':
        return <StudentDashboard onActiveTabChange={onActiveTabChange} />;

      default:
        return null;
    }
  };

  const roleLabels = {
    admin: 'Administrator Dashboard',
    parent: 'Parent Dashboard',
    child: 'Student Dashboard'
  };

  return (
    <>{getDashboardContent()}</>
  );
};