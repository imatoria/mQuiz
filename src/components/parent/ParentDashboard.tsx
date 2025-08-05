import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ChildrenManagement } from './ChildrenManagement';
import { TestAssignmentManager } from './TestAssignmentManager';
import { ContentCreation } from './ContentCreation';
import QuestionBank from './QuestionBank';
import { TestScheduler } from './TestScheduler';
import QuestionAnalytics from './QuestionAnalytics';
import { ReportingDashboard } from '@/components/results/ReportingDashboard';
import { ResultApproval } from '@/components/results/ResultApproval';
import { MessageCenter } from '@/components/messaging/MessageCenter';
import { CommunicationHub } from '@/components/communications/CommunicationHub';
import { 
  Users, 
  BookOpen, 
  Calendar,
  BarChart3,
  FileText,
  Settings,
  CheckCircle,
  MessageSquare
} from 'lucide-react';

export const ParentDashboard = () => {
  const [activeTab, setActiveTab] = useState('children');

  return (
    <div className="space-y-6">
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-4 lg:grid-cols-9">
          <TabsTrigger value="children" className="flex items-center gap-2">
            <Users className="w-4 h-4" />
            Children
          </TabsTrigger>
          <TabsTrigger value="content" className="flex items-center gap-2">
            <BookOpen className="w-4 h-4" />
            Content
          </TabsTrigger>
          <TabsTrigger value="questions" className="flex items-center gap-2">
            <FileText className="w-4 h-4" />
            Questions
          </TabsTrigger>
          <TabsTrigger value="tests" className="flex items-center gap-2">
            <Calendar className="w-4 h-4" />
            Tests
          </TabsTrigger>
          <TabsTrigger value="assignments" className="flex items-center gap-2">
            <Settings className="w-4 h-4" />
            Assignments
          </TabsTrigger>
          <TabsTrigger value="communications" className="flex items-center gap-2">
            <MessageSquare className="w-4 h-4" />
            Communications
          </TabsTrigger>
          <TabsTrigger value="approval" className="flex items-center gap-2">
            <CheckCircle className="w-4 h-4" />
            Approval
          </TabsTrigger>
          <TabsTrigger value="analytics" className="flex items-center gap-2">
            <BarChart3 className="w-4 h-4" />
            Analytics
          </TabsTrigger>
          <TabsTrigger value="reports" className="flex items-center gap-2">
            <FileText className="w-4 h-4" />
            Reports
          </TabsTrigger>
        </TabsList>

        <TabsContent value="children" className="mt-6">
          <ChildrenManagement />
        </TabsContent>

        <TabsContent value="content" className="mt-6">
          <ContentCreation />
        </TabsContent>

        <TabsContent value="questions" className="mt-6">
          <QuestionBank />
        </TabsContent>

        <TabsContent value="tests" className="mt-6">
          <TestScheduler onTestScheduled={() => {}} />
        </TabsContent>

        <TabsContent value="assignments" className="mt-6">
          <TestAssignmentManager />
        </TabsContent>

        <TabsContent value="communications" className="mt-6">
          <CommunicationHub />
        </TabsContent>

        <TabsContent value="approval" className="mt-6">
          <ResultApproval />
        </TabsContent>

        <TabsContent value="analytics" className="mt-6">
          <QuestionAnalytics />
        </TabsContent>

        <TabsContent value="reports" className="mt-6">
          <ReportingDashboard />
        </TabsContent>
      </Tabs>
    </div>
  );
};