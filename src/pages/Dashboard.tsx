import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { ContentCreation } from '@/components/parent/ContentCreation';
import { StudentDashboard } from '@/components/student/StudentDashboard';
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
        return (
          <div className="space-y-6">
            {/* Admin Stats */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Total Users</CardTitle>
                  <Users className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">2,847</div>
                  <p className="text-xs text-muted-foreground">+12% from last month</p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Question Papers</CardTitle>
                  <FileText className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">487</div>
                  <p className="text-xs text-muted-foreground">+23% from last month</p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">AI Generations</CardTitle>
                  <BarChart3 className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">12,547</div>
                  <p className="text-xs text-muted-foreground">+8% from last month</p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Active Tests</CardTitle>
                  <Clock className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">156</div>
                  <p className="text-xs text-muted-foreground">Live sessions</p>
                </CardContent>
              </Card>
            </div>

            {/* Admin Actions */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <Settings className="w-5 h-5 mr-2" />
                    System Configuration
                  </CardTitle>
                  <CardDescription>
                    Manage AI providers and system settings
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  <Button className="w-full justify-start">
                    <Settings className="w-4 h-4 mr-2" />
                    Configure AI Providers
                  </Button>
                  <Button variant="outline" className="w-full justify-start">
                    <Users className="w-4 h-4 mr-2" />
                    Manage User Roles
                  </Button>
                  <Button variant="outline" className="w-full justify-start">
                    <BarChart3 className="w-4 h-4 mr-2" />
                    View Analytics
                  </Button>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Recent Activity</CardTitle>
                  <CardDescription>Latest system events</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="flex items-center space-x-3">
                      <div className="w-2 h-2 bg-success rounded-full"></div>
                      <span className="text-sm">New user registered - John Doe</span>
                      <span className="text-xs text-muted-foreground ml-auto">2m ago</span>
                    </div>
                    <div className="flex items-center space-x-3">
                      <div className="w-2 h-2 bg-primary rounded-full"></div>
                      <span className="text-sm">Question paper generated - Math Grade 5</span>
                      <span className="text-xs text-muted-foreground ml-auto">5m ago</span>
                    </div>
                    <div className="flex items-center space-x-3">
                      <div className="w-2 h-2 bg-warning rounded-full"></div>
                      <span className="text-sm">High API usage detected</span>
                      <span className="text-xs text-muted-foreground ml-auto">10m ago</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        );

      case 'parent':
        return <ContentCreation />;

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
      <div className="max-w-7xl mx-auto p-6">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground">
            {roleLabels[role]}
          </h1>
          <p className="text-muted-foreground mt-2">
            Welcome back! Here's what's happening in your learning environment.
          </p>
        </div>

        {/* Dashboard Content */}
        {getDashboardContent()}
      </div>
    </div>
  );
};