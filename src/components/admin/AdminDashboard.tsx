import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ErrorBoundary } from '@/components/ui/error-boundary';
import { UserManagement } from './UserManagement';
import { SystemAnalytics } from './SystemAnalytics';
import { SystemAPIKeys } from './SystemAPIKeys';
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

export const AdminDashboard = () => {
  return (
    <ErrorBoundary>
      <div className="space-y-6">

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

      {/* Admin Tools Tabs */}
      <Tabs defaultValue="approvals" className="space-y-6">
        <TabsList className="grid w-full grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-7 gap-1 overflow-x-auto">
          <TabsTrigger value="approvals" className="flex items-center gap-1 text-xs sm:text-sm px-2 sm:px-3 min-w-0 whitespace-nowrap">
            <Clock className="w-3 h-3 sm:w-4 sm:h-4 flex-shrink-0" />
            <span className="hidden sm:inline">Approvals</span>
            <span className="sm:hidden">Apps</span>
          </TabsTrigger>
          <TabsTrigger value="users" className="flex items-center gap-1 text-xs sm:text-sm px-2 sm:px-3 min-w-0 whitespace-nowrap">
            <Users className="w-3 h-3 sm:w-4 sm:h-4 flex-shrink-0" />
            <span className="hidden sm:inline">Users</span>
            <span className="sm:hidden">Users</span>
          </TabsTrigger>
          <TabsTrigger value="security" className="flex items-center gap-1 text-xs sm:text-sm px-2 sm:px-3 min-w-0 whitespace-nowrap">
            <Shield className="w-3 h-3 sm:w-4 sm:h-4 flex-shrink-0" />
            <span className="hidden sm:inline">Security</span>
            <span className="sm:hidden">Sec</span>
          </TabsTrigger>
          <TabsTrigger value="analytics" className="flex items-center gap-1 text-xs sm:text-sm px-2 sm:px-3 min-w-0 whitespace-nowrap">
            <BarChart3 className="w-3 h-3 sm:w-4 sm:h-4 flex-shrink-0" />
            <span className="hidden sm:inline">Analytics</span>
            <span className="sm:hidden">Stats</span>
          </TabsTrigger>
          <TabsTrigger value="moderation" className="flex items-center gap-1 text-xs sm:text-sm px-2 sm:px-3 min-w-0 whitespace-nowrap">
            <AlertTriangle className="w-3 h-3 sm:w-4 sm:h-4 flex-shrink-0" />
            <span className="hidden sm:inline">Moderation</span>
            <span className="sm:hidden">Mod</span>
          </TabsTrigger>
          <TabsTrigger value="ai-config" className="flex items-center gap-1 text-xs sm:text-sm px-2 sm:px-3 min-w-0 whitespace-nowrap">
            <Zap className="w-3 h-3 sm:w-4 sm:h-4 flex-shrink-0" />
            <span className="hidden sm:inline">AI Config</span>
            <span className="sm:hidden">AI</span>
          </TabsTrigger>
          <TabsTrigger value="settings" className="flex items-center gap-1 text-xs sm:text-sm px-2 sm:px-3 min-w-0 whitespace-nowrap">
            <Settings className="w-3 h-3 sm:w-4 sm:h-4 flex-shrink-0" />
            <span className="hidden sm:inline">Settings</span>
            <span className="sm:hidden">Set</span>
          </TabsTrigger>
        </TabsList>

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
            <div className="space-y-6">
              <SystemSettings />
              <SystemAPIKeys />
            </div>
          </ErrorBoundary>
        </TabsContent>
      </Tabs>
    </div>
    </ErrorBoundary>
  );
};