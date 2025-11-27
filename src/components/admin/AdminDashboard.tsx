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
import { Sidebar, SidebarContent, SidebarGroup, SidebarGroupLabel, SidebarGroupContent, SidebarMenu, SidebarMenuItem, SidebarMenuButton, SidebarInset, SidebarHeader, SidebarSeparator, SidebarProvider, useSidebar } from '@/components/ui/sidebar';
import { SiteLogo } from '@/components/ui/site-logo';
import { useAuth } from '@/hooks/useAuth';

const AdminDashboardContent = () => {
  const { tab, subtab } = useParams();
  const navigate = useNavigate();
  const { profile, signOut } = useAuth();
  const { isMobile, setOpenMobile } = useSidebar();
  
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
    if (isMobile) {
      setOpenMobile(false);
    }
  };

  return (
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
              const item = menuItems.find(m => m.value === activeTab);
              if (!item) return null;
              return (
                <>
                  <item.icon className="w-5 h-5 text-muted-foreground" />
                  <h1 className="text-lg font-semibold">{item.label}</h1>
                </>
              );
            })()}
          </div>

          <main className="flex-1 p-6 md:p-8 overflow-auto max-w-screen-2xl mx-auto">
            {activeTab === 'approvals' && <ApprovalWorkflow />}
            {activeTab === 'users' && <UserManagement />}
            {activeTab === 'security' && <SecurityDashboard />}
            {activeTab === 'analytics' && <SystemAnalytics />}
            {activeTab === 'moderation' && <ContentModeration />}
            {activeTab === 'ai-config' && <AdminAIProviderConfig />}
            {activeTab === 'settings' && <SystemSettings />}
            {activeTab === 'profile' && <ProfileManagement />}
          </main>
        </SidebarInset>
      </div>
    </ErrorBoundary>
  );
};

export const AdminDashboard = () => {
  return (
    <SidebarProvider>
      <AdminDashboardContent />
    </SidebarProvider>
  );
};
