import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { UserManagement } from './UserManagement';
import { SystemAnalytics } from './SystemAnalytics';
import { SystemAPIKeys } from './SystemAPIKeys';
import { ContentModeration } from './ContentModeration';
import { AdminAIProviderConfig } from './AdminAIProviderConfig';
import { SystemSettings } from './SystemSettings';
import { ApprovalWorkflow } from './ApprovalWorkflow';
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
    <div className="space-y-6">

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
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
        <TabsList className="grid w-full grid-cols-6">
          <TabsTrigger value="approvals" className="flex items-center gap-2">
            <Clock className="w-4 h-4" />
            Approvals
          </TabsTrigger>
          <TabsTrigger value="users" className="flex items-center gap-2">
            <Users className="w-4 h-4" />
            Users
          </TabsTrigger>
          <TabsTrigger value="analytics" className="flex items-center gap-2">
            <BarChart3 className="w-4 h-4" />
            Analytics
          </TabsTrigger>
          <TabsTrigger value="moderation" className="flex items-center gap-2">
            <Shield className="w-4 h-4" />
            Moderation
          </TabsTrigger>
          <TabsTrigger value="ai-config" className="flex items-center gap-2">
            <Zap className="w-4 h-4" />
            AI Config
          </TabsTrigger>
          <TabsTrigger value="settings" className="flex items-center gap-2">
            <Settings className="w-4 h-4" />
            Settings
          </TabsTrigger>
        </TabsList>

        <TabsContent value="approvals">
          <ApprovalWorkflow />
        </TabsContent>

        <TabsContent value="users">
          <UserManagement />
        </TabsContent>

        <TabsContent value="analytics">
          <SystemAnalytics />
        </TabsContent>

        <TabsContent value="moderation">
          <ContentModeration />
        </TabsContent>

        <TabsContent value="ai-config">
          <AdminAIProviderConfig />
        </TabsContent>

        <TabsContent value="settings">
          <div className="space-y-6">
            <SystemSettings />
            <SystemAPIKeys />
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};