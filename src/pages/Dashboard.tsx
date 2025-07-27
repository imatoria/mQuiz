import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
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
        return (
          <div className="space-y-6">
            {/* Parent Quick Stats */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">My Documents</CardTitle>
                  <BookOpen className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">24</div>
                  <p className="text-xs text-muted-foreground">Course materials uploaded</p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Question Papers</CardTitle>
                  <FileText className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">12</div>
                  <p className="text-xs text-muted-foreground">Created this month</p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Student Results</CardTitle>
                  <Trophy className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">89%</div>
                  <p className="text-xs text-muted-foreground">Average score</p>
                </CardContent>
              </Card>
            </div>

            {/* Parent Actions */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <Plus className="w-5 h-5 mr-2" />
                    Create New Content
                  </CardTitle>
                  <CardDescription>
                    Upload documents and generate question papers
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  <Button className="w-full justify-start bg-gradient-success">
                    <Upload className="w-4 h-4 mr-2" />
                    Upload Course Document
                  </Button>
                  <Button variant="outline" className="w-full justify-start">
                    <FileText className="w-4 h-4 mr-2" />
                    Generate Question Paper
                  </Button>
                  <Button variant="outline" className="w-full justify-start">
                    <Clock className="w-4 h-4 mr-2" />
                    Schedule Test
                  </Button>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Recent Papers</CardTitle>
                  <CardDescription>Your latest question papers</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
                      <div>
                        <h4 className="text-sm font-medium">Mathematics - Algebra</h4>
                        <p className="text-xs text-muted-foreground">Grade 8 • 20 questions</p>
                      </div>
                      <Badge variant="secondary">Draft</Badge>
                    </div>
                    <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
                      <div>
                        <h4 className="text-sm font-medium">Science - Physics</h4>
                        <p className="text-xs text-muted-foreground">Grade 9 • 15 questions</p>
                      </div>
                      <Badge className="bg-success">Active</Badge>
                    </div>
                    <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
                      <div>
                        <h4 className="text-sm font-medium">English - Grammar</h4>
                        <p className="text-xs text-muted-foreground">Grade 7 • 25 questions</p>
                      </div>
                      <Badge variant="outline">Completed</Badge>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        );

      case 'child':
        return (
          <div className="space-y-6">
            {/* Child Stats */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Tests Available</CardTitle>
                  <PlayCircle className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">7</div>
                  <p className="text-xs text-muted-foreground">Ready to attempt</p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Completed</CardTitle>
                  <CheckCircle2 className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">23</div>
                  <p className="text-xs text-muted-foreground">This semester</p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Average Score</CardTitle>
                  <Trophy className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">85%</div>
                  <p className="text-xs text-success">+5% improvement</p>
                </CardContent>
              </Card>
            </div>

            {/* Available Tests */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <PlayCircle className="w-5 h-5 mr-2" />
                  Available Tests
                </CardTitle>
                <CardDescription>
                  Tests ready for you to attempt
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-4 border rounded-lg hover:shadow-md transition-shadow">
                    <div className="flex-1">
                      <h4 className="font-medium">Mathematics - Quadratic Equations</h4>
                      <p className="text-sm text-muted-foreground">Grade 9 • 20 questions • 45 minutes</p>
                      <div className="flex items-center mt-2 space-x-4">
                        <Badge variant="outline">Medium</Badge>
                        <span className="text-xs text-muted-foreground flex items-center">
                          <Clock className="w-3 h-3 mr-1" />
                          Due: Tomorrow 5:00 PM
                        </span>
                      </div>
                    </div>
                    <Button className="bg-quiz">
                      Start Test
                    </Button>
                  </div>
                  
                  <div className="flex items-center justify-between p-4 border rounded-lg hover:shadow-md transition-shadow">
                    <div className="flex-1">
                      <h4 className="font-medium">Science - Chemical Reactions</h4>
                      <p className="text-sm text-muted-foreground">Grade 9 • 15 questions • 30 minutes</p>
                      <div className="flex items-center mt-2 space-x-4">
                        <Badge variant="outline">Easy</Badge>
                        <span className="text-xs text-muted-foreground flex items-center">
                          <Clock className="w-3 h-3 mr-1" />
                          Due: Friday 3:00 PM
                        </span>
                      </div>
                    </div>
                    <Button variant="outline">
                      Start Test
                    </Button>
                  </div>
                  
                  <div className="flex items-center justify-between p-4 border rounded-lg opacity-60">
                    <div className="flex-1">
                      <h4 className="font-medium">English - Literature Analysis</h4>
                      <p className="text-sm text-muted-foreground">Grade 9 • 18 questions • 40 minutes</p>
                      <div className="flex items-center mt-2 space-x-4">
                        <Badge variant="outline">Hard</Badge>
                        <span className="text-xs text-muted-foreground flex items-center">
                          <AlertCircle className="w-3 h-3 mr-1" />
                          Scheduled for next week
                        </span>
                      </div>
                    </div>
                    <Button disabled>
                      Not Available
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Recent Results */}
            <Card>
              <CardHeader>
                <CardTitle>Recent Results</CardTitle>
                <CardDescription>Your latest test performances</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
                    <div>
                      <h4 className="text-sm font-medium">Physics - Motion</h4>
                      <p className="text-xs text-muted-foreground">Completed 2 days ago</p>
                    </div>
                    <div className="text-right">
                      <div className="text-lg font-bold text-success">92%</div>
                      <Badge className="bg-success text-xs">Excellent</Badge>
                    </div>
                  </div>
                  
                  <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
                    <div>
                      <h4 className="text-sm font-medium">History - World Wars</h4>
                      <p className="text-xs text-muted-foreground">Completed 1 week ago</p>
                    </div>
                    <div className="text-right">
                      <div className="text-lg font-bold text-warning">78%</div>
                      <Badge variant="outline" className="text-xs">Good</Badge>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        );

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