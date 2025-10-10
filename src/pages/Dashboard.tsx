import React from 'react';
import { ParentDashboard } from '@/components/parent/ParentDashboard';
import { StudentDashboard } from '@/components/student/StudentDashboard';
import { AdminDashboard } from '@/components/admin/AdminDashboard';

interface DashboardProps {
  role: 'admin' | 'parent' | 'child' | null;
  onActiveTabChange?: (tabName: string, tabIcon: any) => void;
}

export const Dashboard = ({ role, onActiveTabChange }: DashboardProps) => {
  if (!role) return null;

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