import React, { useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ErrorBoundary } from '@/components/ui/error-boundary';
import { Navigation } from '@/components/ui/navigation';
import { UserManagement } from './UserManagement';
import { SystemAnalytics } from './SystemAnalytics';

import { ContentModeration } from './ContentModeration';
import { AdminAIProviderConfig } from './AdminAIProviderConfig';
import { SystemSettings } from './SystemSettings';
import { ApprovalWorkflow } from './ApprovalWorkflow';
import { SecurityDashboard } from './SecurityDashboard';
import { 
  Users, 
  BarChart3, 
  Shield, 
  Settings, 
  Zap,
  Activity,
  AlertTriangle,
  CheckCircle,
  Clock
} from 'lucide-react';
import { ProfileManagement } from '@/components/profile/ProfileManagement';
import { Sidebar, SidebarContent, SidebarGroup, SidebarGroupLabel, SidebarGroupContent, SidebarMenu, SidebarMenuItem, SidebarMenuButton, SidebarInset, SidebarHeader, SidebarSeparator, SidebarProvider } from '@/components/ui/sidebar';
import { SiteLogo } from '@/components/ui/site-logo';
import { useAuth } from '@/hooks/useAuth';

export const AdminDashboard = () => {
  const { tab, subtab } = useParams();
  const navigate = useNavigate();
  const { profile, signOut } = useAuth();
  
  const menuItems = [
    { value: 'approvals', label: 'Approvals', icon: Clock },
    { value: 'users', label: 'Users', icon: Users },
    { value: 'security', label: 'Security', icon: Shield },
    { value: 'analytics', label: 'Analytics', icon: BarChart3 },
    { value: 'moderation', label: 'Moderation', icon: AlertTriangle },
    { value: 'ai-config', label: 'AI Config', icon: Zap },
    { value: 'settings', label: 'Settings', icon: Settings },
    { value: 'profile', label: 'Profile', icon: Users },
  ];

  // Read tab from URL or default to 'approvals'
  const activeTab = tab || 'approvals';
  const activeItem = menuItems.find((i) => i.value === activeTab);

  // Redirect to default tab if not set
  useEffect(() => {
    if (!tab) {
      navigate('/admin/approvals', { replace: true });
    } else if (subtab && !['moderation', 'settings'].includes(tab)) {
      // If we have a subtab but the current tab doesn't support subtabs, navigate without it
      navigate(`/admin/${tab}`, { replace: true });
    }
  }, [tab, subtab, navigate]);

  const handleTabChange = (value: string) => {
    navigate(`/admin/${value}`);
  };

  return (
    <SidebarProvider>
      <ErrorBoundary>
        <Navigation 
          currentRole={profile?.role || null} 
          onRoleChange={() => signOut()}
        />
        <div className="flex w-full pt-[57px] md:pt-[64px]">
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
            
            <div className="min-h-screen bg-gradient-subtle">
              <div className="p-3 sm:p-4 md:p-6 space-y-6">
              {/* Quick Stats */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Pending Approvals</CardTitle>
                    <Clock className="h-4 w-4 text-amber-500" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-amber-600">8</div>
                    <p className="text-xs text-muted-foreground">Users awaiting approval</p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">System Health</CardTitle>
                    <Activity className="h-4 w-4 text-green-500" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-green-600">98%</div>
                    <p className="text-xs text-muted-foreground">All services operational</p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Content Review</CardTitle>
                    <AlertTriangle className="h-4 w-4 text-orange-500" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-orange-600">3</div>
                    <p className="text-xs text-muted-foreground">Items need moderation</p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">AI Providers</CardTitle>
                    <CheckCircle className="h-4 w-4 text-blue-500" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-blue-600">4</div>
                    <p className="text-xs text-muted-foreground">Active AI services</p>
                  </CardContent>
                </Card>
              </div>

              {/* Content Sections */}
              <Tabs value={activeTab} onValueChange={handleTabChange} className="space-y-6">
                <TabsContent value="approvals">
                  <ErrorBoundary>
                    <ApprovalWorkflow />
                  </ErrorBoundary>
                </TabsContent>

                <TabsContent value="users">
                  <ErrorBoundary>
                    <UserManagement />
                  </ErrorBoundary>
                </TabsContent>

                <TabsContent value="security">
                  <ErrorBoundary>
                    <SecurityDashboard />
                  </ErrorBoundary>
                </TabsContent>

                <TabsContent value="analytics">
                  <ErrorBoundary>
                    <SystemAnalytics />
                  </ErrorBoundary>
                </TabsContent>

                <TabsContent value="moderation">
                  <ErrorBoundary>
                    <ContentModeration />
                  </ErrorBoundary>
                </TabsContent>

                <TabsContent value="ai-config">
                  <ErrorBoundary>
                    <AdminAIProviderConfig />
                  </ErrorBoundary>
                </TabsContent>

                <TabsContent value="settings">
                  <ErrorBoundary>
                    <SystemSettings />
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
    </SidebarProvider>
  );
};