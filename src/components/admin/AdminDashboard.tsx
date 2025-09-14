import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ErrorBoundary } from '@/components/ui/error-boundary';
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
import { SidebarProvider, Sidebar, SidebarContent, SidebarGroup, SidebarGroupLabel, SidebarGroupContent, SidebarMenu, SidebarMenuItem, SidebarMenuButton, SidebarInset, SidebarTrigger, SidebarHeader, SidebarSeparator } from '@/components/ui/sidebar';
import { SiteLogo } from '@/components/ui/site-logo';

export const AdminDashboard = () => {
  const [activeTab, setActiveTab] = useState('approvals');
  const menuItems = [
    { value: 'approvals', label: 'Approvals', icon: Clock },
    { value: 'users', label: 'Users', icon: Users },
    { value: 'security', label: 'Security', icon: Shield },
    { value: 'analytics', label: 'Analytics', icon: BarChart3 },
    { value: 'moderation', label: 'Moderation', icon: AlertTriangle },
    { value: 'ai-config', label: 'AI Config', icon: Zap },
    { value: 'settings', label: 'Settings', icon: Settings },
  ];
  const activeItem = menuItems.find((i) => i.value === activeTab);
  return (
    <ErrorBoundary>
      <SidebarProvider>
        <div className="flex w-full">
          <Sidebar collapsible="icon" className="fixed left-0 top-16 h-[calc(100vh-4rem)] z-40">
            <SidebarContent className="h-full overflow-y-auto">
              <SidebarHeader className="group-data-[collapsible=icon]:hidden">
                <SiteLogo />
              </SidebarHeader>
              <SidebarSeparator />
              <SidebarGroup>
                <SidebarGroupLabel>Admin Tools</SidebarGroupLabel>
                <SidebarGroupContent>
                  <SidebarMenu>
                    {menuItems.map((item) => (
                      <SidebarMenuItem key={item.value}>
                        <SidebarMenuButton
                          isActive={activeTab === item.value}
                          onClick={() => setActiveTab(item.value)}
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
            <div className="min-h-screen bg-gradient-subtle">
              <header className="sticky top-16 z-30 h-14 md:h-16 flex items-center bg-card border-b shadow-sm px-2 md:px-4 flex-shrink-0">
                <SidebarTrigger />
                <div className="ml-2 flex items-center">
                  <div className="flex md:hidden">
                    <SiteLogo size="sm" />
                  </div>
                  <div className="hidden md:peer-data-[state=collapsed]:flex">
                    <SiteLogo size="sm" />
                  </div>
                </div>
                {activeItem && (
                  <h1 className="ml-3 flex items-center gap-2 text-base md:text-lg font-semibold text-foreground">
                    <activeItem.icon className="w-5 h-5 text-primary" />
                    <span>{activeItem.label}</span>
                  </h1>
                )}
              </header>
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
              <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
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
              </Tabs>
              </div>
            </div>
          </SidebarInset>
        </div>
      </SidebarProvider>
    </ErrorBoundary>
  );
};