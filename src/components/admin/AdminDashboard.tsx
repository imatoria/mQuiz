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
import { Sidebar, SidebarContent, SidebarGroup, SidebarGroupLabel, SidebarGroupContent, SidebarMenu, SidebarMenuItem, SidebarMenuButton, SidebarInset, SidebarHeader, SidebarSeparator } from '@/components/ui/sidebar';
import { SiteLogo } from '@/components/ui/site-logo';

interface AdminDashboardProps {
  onActiveTabChange?: (tabName: string, tabIcon: any) => void;
}

export const AdminDashboard = ({ onActiveTabChange }: AdminDashboardProps) => {
  const [activeTab, setActiveTab] = useState('approvals');
  
  // Notify initial tab on mount
  React.useEffect(() => {
    const initialItem = menuItems.find(i => i.value === 'approvals');
    if (initialItem) {
      onActiveTabChange?.(initialItem.label, initialItem.icon);
    }
  }, []); // Empty dependency array to run only once on mount
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
              <Tabs value={activeTab} onValueChange={(value) => {
                setActiveTab(value);
                const item = menuItems.find(i => i.value === value);
                if (item) {
                  onActiveTabChange?.(item.label, item.icon);
                }
              }} className="space-y-6">
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
    </ErrorBoundary>
  );
};