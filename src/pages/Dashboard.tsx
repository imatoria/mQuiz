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
}

export const Dashboard = ({ role }: DashboardProps) => {
  const getDashboardContent = () => {
    switch (role) {
      case 'admin':
        return <AdminDashboard />;

      case 'parent':
        return <ParentDashboard />;

      case 'child':
        return <StudentDashboard />;

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
    <div className="min-h-screen bg-gradient-subtle">
      <div className="max-w-7xl mx-auto p-3 sm:p-4 md:p-6">
        {/* Header */}
        <div className="mb-4 md:mb-8">
          <h1 className="text-2xl md:text-3xl font-bold text-foreground">
            {roleLabels[role]}
          </h1>
          <p className="text-sm md:text-base text-muted-foreground mt-1 md:mt-2">
            {role === 'admin' 
              ? 'Manage users, monitor system performance, and configure platform settings'
              : "Welcome back! Here's what's happening in your learning environment."
            }
          </p>
        </div>

        {/* Dashboard Content */}
        {getDashboardContent()}
      </div>
    </div>
  );
};