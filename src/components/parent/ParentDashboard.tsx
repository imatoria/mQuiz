import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ChildrenManagement } from './ChildrenManagement';
import { TestAssignmentManager } from './TestAssignmentManager';
import { ContentCreation } from './ContentCreation';
import QuestionBank from './QuestionBank';
import { TestScheduler } from './TestScheduler';
import QuestionAnalytics from './QuestionAnalytics';
import { 
  Users, 
  BookOpen, 
  Calendar,
  BarChart3,
  FileText,
  Settings
} from 'lucide-react';

export const ParentDashboard = () => {
  const [activeTab, setActiveTab] = useState('children');

  return (
    <div className="space-y-6">
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-6">
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
          <TabsTrigger value="analytics" className="flex items-center gap-2">
            <BarChart3 className="w-4 h-4" />
            Analytics
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

        <TabsContent value="analytics" className="mt-6">
          <QuestionAnalytics />
        </TabsContent>
      </Tabs>
    </div>
  );
};