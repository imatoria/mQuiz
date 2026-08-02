import React, { useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ErrorBoundary } from '@/components/ui/error-boundary';
import { Navigation } from '@/components/ui/navigation';
import { StudentManagement } from './StudentManagement';
import { ContentCreation } from './ContentCreation';
import QuestionBank from './QuestionBank';
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
import { ProfileManagement } from '@/components/profile/ProfileManagement';

import { PapersManager } from './PapersManager';
import { Sidebar, SidebarContent, SidebarGroup, SidebarGroupContent, SidebarMenu, SidebarMenuItem, SidebarMenuButton, SidebarInset, SidebarProvider, useSidebar } from '@/components/ui/sidebar';
import { useAuth } from '@/hooks/useAuth';

const TeacherDashboardContent = () => {
  const { tab, subtab } = useParams();
  const navigate = useNavigate();
  const { profile, signOut } = useAuth();
  const { isMobile, setOpenMobile } = useSidebar();

  const menuItems = [
    { value: 'students', label: 'Students', icon: Users },
    { value: 'content', label: 'Content', icon: BookOpen },
    { value: 'questions', label: 'Questions', icon: FileText },
    { value: 'papers', label: 'Papers & Tests', icon: FileText },
    { value: 'approval', label: 'Approval', icon: CheckCircle },
    { value: 'analytics', label: 'Analytics', icon: BarChart3 },
    { value: 'reports', label: 'Reports', icon: FileText },
    { value: 'ai-settings', label: 'AI Settings', icon: Zap },
    { value: 'communications', label: 'Communications', icon: MessageSquare },
    { value: 'profile', label: 'Profile', icon: Settings },
  ];

  // Read tab from URL or default to 'students'
  const activeTab = tab === 'students' ? 'students' : (tab || 'students');
  const activeItem = menuItems.find((i) => i.value === activeTab);

  // Redirect to default tab if not set, and clear subtab if navigating to non-subtab sections
  useEffect(() => {
    if (!tab || tab === 'students') {
      navigate('/teacher/students', { replace: true });
    } else if (subtab && !['content', 'papers', 'reports', 'communications'].includes(tab)) {
      navigate(`/teacher/${tab}`, { replace: true });
    }
  }, [tab, subtab, navigate]);

  const handleTabChange = (value: string) => {
    navigate(`/teacher/${value}`);
    if (isMobile) {
      setOpenMobile(false);
    }
  };

  return (
    <ErrorBoundary>
      <Navigation 
        currentRole={profile?.role === 'teacher' ? 'teacher' : (profile?.role === 'teacher' ? 'teacher' : null)} 
        onRoleChange={() => signOut()}
      />
      <div className="flex w-full pt-[57px] md:pt-[65px]">
        <Sidebar collapsible="icon" className="fixed left-0 top-16 h-[calc(100vh-4rem)] z-40">
          <SidebarContent className="h-full overflow-y-auto">
            <SidebarGroup>
              <SidebarGroupContent>
                <SidebarMenu>
                  {menuItems.map((item) => (
                    <SidebarMenuItem key={item.value}>
                      <SidebarMenuButton
                        isActive={activeTab === item.value}
                        onClick={() => handleTabChange(item.value)}
                        tooltip={item.label}
                        className="text-base md:text-sm"
                      >
                        <item.icon className="w-5 h-5 md:w-4 md:h-4" />
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
          {/* Mobile Tab Header */}
          <div className="md:hidden bg-card border-b p-4 flex items-center space-x-3">
            {activeTab && (() => {
              const item = menuItems.find(i => i.value === activeTab);
              return item ? (
                <>
                  <item.icon className="w-5 h-5 text-muted-foreground" />
                  <span className="text-lg font-medium text-foreground">{item.label}</span>
                </>
              ) : null;
            })()}
          </div>
          
          <div className="min-h-[calc(100vh-57px)] md:min-h-[calc(100vh-65px)] bg-background">
            <div className="p-3 sm:p-4 md:p-6">
            <Tabs value={activeTab} onValueChange={handleTabChange} className="space-y-6">
              {/* Content sections */}
              <TabsContent value="students">
                <ErrorBoundary>
                  <StudentManagement />
                </ErrorBoundary>
              </TabsContent>

              <TabsContent value="content">
                <ErrorBoundary>
                  <ContentCreation />
                </ErrorBoundary>
              </TabsContent>

              <TabsContent value="questions">
                <ErrorBoundary>
                  <QuestionBank />
                </ErrorBoundary>
              </TabsContent>

              <TabsContent value="papers">
                <ErrorBoundary>
                  <PapersManager />
                </ErrorBoundary>
              </TabsContent>

              <TabsContent value="ai-settings">
                <ErrorBoundary>
                  <AIProviderSettings />
                </ErrorBoundary>
              </TabsContent>

              <TabsContent value="communications">
                <ErrorBoundary>
                  <CommunicationHub />
                </ErrorBoundary>
              </TabsContent>

              <TabsContent value="approval">
                <ErrorBoundary>
                  <ResultApproval />
                </ErrorBoundary>
              </TabsContent>

              <TabsContent value="analytics">
                <ErrorBoundary>
                  <QuestionAnalytics />
                </ErrorBoundary>
              </TabsContent>

              <TabsContent value="reports">
                <ErrorBoundary>
                  <ReportingDashboard />
                </ErrorBoundary>
              </TabsContent>

              <TabsContent value="profile">
                <ErrorBoundary>
                  <div className="mb-6">
                    <h2 className="text-2xl md:text-3xl font-bold text-foreground">Profile Management</h2>
                    <p className="text-sm md:text-base text-muted-foreground mt-1">
                      Manage your account settings and personal information
                    </p>
                  </div>
                  <ProfileManagement />
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

export const TeacherDashboard = () => {
  return (
    <SidebarProvider>
      <TeacherDashboardContent />
    </SidebarProvider>
  );
};

