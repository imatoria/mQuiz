import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ErrorBoundary } from '@/components/ui/error-boundary';
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
import { AIProviderSettings } from './AIProviderSettings';
import { 
  Users, 
  BookOpen, 
  Calendar,
  BarChart3,
  FileText,
  Settings,
  CheckCircle,
  MessageSquare,
  Zap
} from 'lucide-react';

export const ParentDashboard = () => {
  const [activeTab, setActiveTab] = useState('children');

  return (
    <ErrorBoundary>
      <div className="space-y-6">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-10 gap-1 h-auto min-h-[2.5rem] bg-muted/50 p-2 rounded-lg">
          <TabsTrigger value="children" className="flex items-center gap-1 text-xs sm:text-sm px-2 sm:px-3">
            <Users className="w-3 h-3 sm:w-4 sm:h-4" />
            <span className="hidden sm:inline">Children</span>
            <span className="sm:hidden">Kids</span>
          </TabsTrigger>
          <TabsTrigger value="content" className="flex items-center gap-1 text-xs sm:text-sm px-2 sm:px-3">
            <BookOpen className="w-3 h-3 sm:w-4 sm:h-4" />
            <span className="hidden sm:inline">Content</span>
            <span className="sm:hidden">Docs</span>
          </TabsTrigger>
          <TabsTrigger value="questions" className="flex items-center gap-1 text-xs sm:text-sm px-2 sm:px-3">
            <FileText className="w-3 h-3 sm:w-4 sm:h-4" />
            <span className="hidden sm:inline">Questions</span>
            <span className="sm:hidden">Q's</span>
          </TabsTrigger>
          <TabsTrigger value="tests" className="flex items-center gap-1 text-xs sm:text-sm px-2 sm:px-3">
            <Calendar className="w-3 h-3 sm:w-4 sm:h-4" />
            <span className="hidden sm:inline">Tests</span>
            <span className="sm:hidden">Tests</span>
          </TabsTrigger>
          <TabsTrigger value="assignments" className="flex items-center gap-1 text-xs sm:text-sm px-2 sm:px-3">
            <Settings className="w-3 h-3 sm:w-4 sm:h-4" />
            <span className="hidden sm:inline">Assignments</span>
            <span className="sm:hidden">Tasks</span>
          </TabsTrigger>
          <TabsTrigger value="ai-settings" className="flex items-center gap-1 text-xs sm:text-sm px-2 sm:px-3">
            <Zap className="w-3 h-3 sm:w-4 sm:h-4" />
            <span className="hidden lg:inline">AI Settings</span>
            <span className="lg:hidden">AI</span>
          </TabsTrigger>
          <TabsTrigger value="communications" className="flex items-center gap-1 text-xs sm:text-sm px-2 sm:px-3">
            <MessageSquare className="w-3 h-3 sm:w-4 sm:h-4" />
            <span className="hidden lg:inline">Communications</span>
            <span className="lg:hidden">Chat</span>
          </TabsTrigger>
          <TabsTrigger value="approval" className="flex items-center gap-1 text-xs sm:text-sm px-2 sm:px-3">
            <CheckCircle className="w-3 h-3 sm:w-4 sm:h-4" />
            <span className="hidden lg:inline">Approval</span>
            <span className="lg:hidden">Check</span>
          </TabsTrigger>
          <TabsTrigger value="analytics" className="flex items-center gap-1 text-xs sm:text-sm px-2 sm:px-3">
            <BarChart3 className="w-3 h-3 sm:w-4 sm:h-4" />
            <span className="hidden lg:inline">Analytics</span>
            <span className="lg:hidden">Stats</span>
          </TabsTrigger>
          <TabsTrigger value="reports" className="flex items-center gap-1 text-xs sm:text-sm px-2 sm:px-3">
            <FileText className="w-3 h-3 sm:w-4 sm:h-4" />
            <span className="hidden lg:inline">Reports</span>
            <span className="lg:hidden">Data</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="children" className="mt-6">
          <ErrorBoundary>
            <ChildrenManagement />
          </ErrorBoundary>
        </TabsContent>

        <TabsContent value="content" className="mt-6">
          <ErrorBoundary>
            <ContentCreation />
          </ErrorBoundary>
        </TabsContent>

        <TabsContent value="questions" className="mt-6">
          <ErrorBoundary>
            <QuestionBank />
          </ErrorBoundary>
        </TabsContent>

        <TabsContent value="tests" className="mt-6">
          <ErrorBoundary>
            <TestScheduler onTestScheduled={() => {}} />
          </ErrorBoundary>
        </TabsContent>

        <TabsContent value="assignments" className="mt-6">
          <ErrorBoundary>
            <TestAssignmentManager />
          </ErrorBoundary>
        </TabsContent>

        <TabsContent value="ai-settings" className="mt-6">
          <ErrorBoundary>
            <AIProviderSettings />
          </ErrorBoundary>
        </TabsContent>

        <TabsContent value="communications" className="mt-6">
          <ErrorBoundary>
            <CommunicationHub />
          </ErrorBoundary>
        </TabsContent>

        <TabsContent value="approval" className="mt-6">
          <ErrorBoundary>
            <ResultApproval />
          </ErrorBoundary>
        </TabsContent>

        <TabsContent value="analytics" className="mt-6">
          <ErrorBoundary>
            <QuestionAnalytics />
          </ErrorBoundary>
        </TabsContent>

        <TabsContent value="reports" className="mt-6">
          <ErrorBoundary>
            <ReportingDashboard />
          </ErrorBoundary>
        </TabsContent>
      </Tabs>
    </div>
    </ErrorBoundary>
  );
};