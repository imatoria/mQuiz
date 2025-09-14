import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ErrorBoundary } from '@/components/ui/error-boundary';
import { ChildrenManagement } from './ChildrenManagement';
import { TestAssignmentManager } from './TestAssignmentManager';
import { ContentCreation } from './ContentCreation';
import QuestionBank from './QuestionBank';
import { ScheduleManager } from './ScheduleManager';
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

import { PapersManager } from './PapersManager';
import { Sidebar, SidebarContent, SidebarGroup, SidebarGroupContent, SidebarMenu, SidebarMenuItem, SidebarMenuButton, SidebarInset } from '@/components/ui/sidebar';

interface ParentDashboardProps {
  onActiveTabChange?: (tabName: string, tabIcon: any) => void;
}

export const ParentDashboard = ({ onActiveTabChange }: ParentDashboardProps) => {
  const [activeTab, setActiveTab] = useState('children');
  
  // Notify initial tab on mount
  React.useEffect(() => {
    const initialItem = menuItems.find(i => i.value === 'children');
    if (initialItem) {
      onActiveTabChange?.(initialItem.label, initialItem.icon);
    }
  }, [onActiveTabChange]);

  const menuItems = [
    { value: 'children', label: 'Children', icon: Users },
    { value: 'content', label: 'Content', icon: BookOpen },
    { value: 'questions', label: 'Questions', icon: FileText },
    { value: 'papers', label: 'Papers', icon: FileText },
    { value: 'tests', label: 'Tests', icon: Calendar },
    { value: 'assignments', label: 'Assignments', icon: Settings },
    { value: 'ai-settings', label: 'AI Settings', icon: Zap },
    { value: 'communications', label: 'Communications', icon: MessageSquare },
    { value: 'approval', label: 'Approval', icon: CheckCircle },
    { value: 'analytics', label: 'Analytics', icon: BarChart3 },
    { value: 'reports', label: 'Reports', icon: FileText },
  ];

  const activeItem = menuItems.find((i) => i.value === activeTab);

  return (
    <ErrorBoundary>
      <div className="flex w-full">
          <Sidebar collapsible="icon" className="fixed left-0 top-16 h-[calc(100vh-4rem)] z-40">
            <SidebarContent className="h-full overflow-y-auto">
              <SidebarGroup>
                <SidebarGroupContent>
                  <SidebarMenu>
                    {menuItems.map((item) => (
                      <SidebarMenuItem key={item.value}>
                        <SidebarMenuButton
                          isActive={activeTab === item.value}
                          onClick={() => {
                            setActiveTab(item.value);
                            onActiveTabChange?.(item.label, item.icon);
                          }}
                          tooltip={item.label}
                        >
                          <item.icon className="w-4 h-4" />
                          <span>{item.label}</span>
                        </SidebarMenuButton>
                      </SidebarMenuItem>
                    ))}
                  </SidebarMenu>
                </SidebarGroupContent>
              </SidebarGroup>
            </SidebarContent>
          </Sidebar>

          <SidebarInset>
            <div className="min-h-screen bg-gradient-subtle pt-2 md:pt-4">
              <div className="p-3 sm:p-4 md:p-6">
              <Tabs value={activeTab} onValueChange={(value) => {
                setActiveTab(value);
                const item = menuItems.find(i => i.value === value);
                if (item) {
                  onActiveTabChange?.(item.label, item.icon);
                }
              }} className="space-y-6">
                {/* Content sections */}
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

                <TabsContent value="papers" className="mt-6">
                  <ErrorBoundary>
                    <PapersManager />
                  </ErrorBoundary>
                </TabsContent>

                <TabsContent value="tests" className="mt-6">
                  <ErrorBoundary>
                    <ScheduleManager />
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
            </div>
          </SidebarInset>
        </div>
    </ErrorBoundary>
  );
};