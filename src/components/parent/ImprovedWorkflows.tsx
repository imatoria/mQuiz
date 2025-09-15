import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { 
  FileText, 
  Calendar, 
  Plus, 
  ArrowRight,
  Clock,
  Users,
  BookOpen,
  Zap,
  CheckCircle2,
  AlertCircle,
  TrendingUp
} from 'lucide-react';

interface WorkflowStep {
  id: string;
  title: string;
  description: string;
  icon: React.ComponentType<any>;
  status: 'pending' | 'current' | 'completed';
  action?: () => void;
}

interface QuickAction {
  id: string;
  title: string;
  description: string;
  icon: React.ComponentType<any>;
  color: string;
  action: () => void;
}

export const ImprovedWorkflows = () => {
  const [activeWorkflow, setActiveWorkflow] = useState<string | null>(null);
  const [workflowProgress, setWorkflowProgress] = useState<Record<string, number>>({});
  
  const { user } = useAuth();
  const { toast } = useToast();

  // Workflow: Create Paper & Schedule Test
  const createAndScheduleSteps: WorkflowStep[] = [
    {
      id: 'basic-info',
      title: 'Basic Information',
      description: 'Enter paper title, subject, and class level',
      icon: FileText,
      status: 'current',
      action: () => window.location.href = '/create-paper?workflow=create-schedule&step=basic'
    },
    {
      id: 'questions',
      title: 'Configure Questions',
      description: 'Set number of questions and difficulty level',
      icon: BookOpen,
      status: 'pending'
    },
    {
      id: 'schedule',
      title: 'Schedule Test',
      description: 'Set test timing and assignment rules',
      icon: Calendar,
      status: 'pending'
    },
    {
      id: 'review',
      title: 'Review & Publish',
      description: 'Review settings and publish the test',
      icon: CheckCircle2,
      status: 'pending'
    }
  ];

  // Workflow: Schedule Existing Paper
  const scheduleExistingSteps: WorkflowStep[] = [
    {
      id: 'select-paper',
      title: 'Select Paper',
      description: 'Choose from your existing question papers',
      icon: FileText,
      status: 'current',
      action: () => window.location.href = '/papers?action=schedule'
    },
    {
      id: 'configure-schedule',
      title: 'Configure Schedule',
      description: 'Set start time, end time, and attempt limits',
      icon: Clock,
      status: 'pending'
    },
    {
      id: 'assign-students',
      title: 'Assign Students',
      description: 'Choose which students can take the test',
      icon: Users,
      status: 'pending'
    },
    {
      id: 'activate',
      title: 'Activate Test',
      description: 'Make the test available to students',
      icon: Zap,
      status: 'pending'
    }
  ];

  // Quick Actions
  const quickActions: QuickAction[] = [
    {
      id: 'create-paper',
      title: 'Create New Paper',
      description: 'Start with a blank question paper',
      icon: Plus,
      color: 'bg-blue-500',
      action: () => window.location.href = '/create-paper'
    },
    {
      id: 'schedule-existing',
      title: 'Schedule Existing Paper',
      description: 'Turn an existing paper into a timed test',
      icon: Calendar,
      color: 'bg-green-500',
      action: () => window.location.href = '/papers?action=schedule'
    },
    {
      id: 'bulk-operations',
      title: 'Bulk Operations',
      description: 'Manage multiple papers at once',
      icon: TrendingUp,
      color: 'bg-purple-500',
      action: () => window.location.href = '/papers/bulk'
    },
    {
      id: 'templates',
      title: 'Use Template',
      description: 'Start from a predefined template',
      icon: FileText,
      color: 'bg-orange-500',
      action: () => window.location.href = '/templates'
    }
  ];

  const WorkflowCard: React.FC<{ 
    title: string; 
    description: string; 
    steps: WorkflowStep[]; 
    onStart: () => void;
  }> = ({ title, description, steps, onStart }) => (
    <Card className="h-full">
      <CardHeader>
        <CardTitle className="text-lg">{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-3">
          {steps.map((step, index) => (
            <div key={step.id} className="flex items-center space-x-3">
              <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${
                step.status === 'completed' 
                  ? 'bg-green-100 text-green-600' 
                  : step.status === 'current'
                  ? 'bg-blue-100 text-blue-600'
                  : 'bg-gray-100 text-gray-400'
              }`}>
                <step.icon className="w-4 h-4" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium text-foreground">
                  {step.title}
                </div>
                <div className="text-xs text-muted-foreground">
                  {step.description}
                </div>
              </div>
              {index < steps.length - 1 && (
                <ArrowRight className="w-4 h-4 text-muted-foreground" />
              )}
            </div>
          ))}
        </div>
        <Button 
          onClick={onStart}
          className="w-full"
          variant={steps[0].status === 'current' ? 'default' : 'outline'}
        >
          {steps[0].status === 'current' ? 'Start Workflow' : 'Resume Workflow'}
        </Button>
      </CardContent>
    </Card>
  );

  const QuickActionCard: React.FC<{ action: QuickAction }> = ({ action }) => (
    <Card 
      className="cursor-pointer hover:shadow-md transition-all duration-200 border-2 hover:border-primary/50"
      onClick={action.action}
    >
      <CardContent className="p-6">
        <div className="flex items-start space-x-4">
          <div className={`p-3 rounded-lg ${action.color} text-white`}>
            <action.icon className="w-6 h-6" />
          </div>
          <div className="flex-1">
            <h3 className="font-semibold text-lg mb-1">{action.title}</h3>
            <p className="text-muted-foreground text-sm">{action.description}</p>
          </div>
          <ArrowRight className="w-5 h-5 text-muted-foreground" />
        </div>
      </CardContent>
    </Card>
  );

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold">Streamlined Workflows</h1>
        <p className="text-muted-foreground mt-2">
          Choose the best workflow for your needs to create and manage question papers efficiently
        </p>
      </div>

      <Tabs defaultValue="workflows" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="workflows">Guided Workflows</TabsTrigger>
          <TabsTrigger value="quick-actions">Quick Actions</TabsTrigger>
        </TabsList>

        <TabsContent value="workflows" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <WorkflowCard
              title="Create Paper & Schedule Test"
              description="Complete workflow from paper creation to test scheduling in one go"
              steps={createAndScheduleSteps}
              onStart={() => {
                setActiveWorkflow('create-schedule');
                window.location.href = '/create-paper?workflow=create-schedule';
              }}
            />
            
            <WorkflowCard
              title="Schedule Existing Paper"
              description="Turn any of your existing papers into a timed test"
              steps={scheduleExistingSteps}
              onStart={() => {
                setActiveWorkflow('schedule-existing');
                window.location.href = '/papers?action=schedule';
              }}
            />
          </div>

          {/* Workflow Progress Indicators */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <TrendingUp className="w-5 h-5 mr-2" />
                Workflow Tips
              </CardTitle>
              <CardDescription>
                Best practices for efficient paper and test management
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="flex items-start space-x-3">
                  <div className="flex-shrink-0 w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center">
                    <FileText className="w-4 h-4 text-blue-600" />
                  </div>
                  <div>
                    <h4 className="font-medium">Paper Creation</h4>
                    <p className="text-sm text-muted-foreground">
                      Create comprehensive question papers with proper difficulty distribution
                    </p>
                  </div>
                </div>
                
                <div className="flex items-start space-x-3">
                  <div className="flex-shrink-0 w-8 h-8 rounded-full bg-green-100 flex items-center justify-center">
                    <Calendar className="w-4 h-4 text-green-600" />
                  </div>
                  <div>
                    <h4 className="font-medium">Smart Scheduling</h4>
                    <p className="text-sm text-muted-foreground">
                      Schedule tests with appropriate time windows and attempt limits
                    </p>
                  </div>
                </div>
                
                <div className="flex items-start space-x-3">
                  <div className="flex-shrink-0 w-8 h-8 rounded-full bg-purple-100 flex items-center justify-center">
                    <Users className="w-4 h-4 text-purple-600" />
                  </div>
                  <div>
                    <h4 className="font-medium">Student Management</h4>
                    <p className="text-sm text-muted-foreground">
                      Assign tests to specific groups or all students as needed
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="quick-actions" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {quickActions.map((action) => (
              <QuickActionCard key={action.id} action={action} />
            ))}
          </div>

          {/* Recent Activity */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Clock className="w-5 h-5 mr-2" />
                Recent Activity
              </CardTitle>
              <CardDescription>
                Quick access to your recently created or modified papers
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="flex items-center space-x-3 p-3 rounded-lg hover:bg-muted/50 cursor-pointer">
                    <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white">
                      <FileText className="w-5 h-5" />
                    </div>
                    <div className="flex-1">
                      <div className="font-medium">Mathematics Quiz {i}</div>
                      <div className="text-sm text-muted-foreground">
                        Grade 10 • Modified 2 hours ago
                      </div>
                    </div>
                    <Badge variant="outline">Draft</Badge>
                  </div>
                ))}
              </div>
              <Button variant="outline" className="w-full mt-4">
                View All Papers
              </Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};