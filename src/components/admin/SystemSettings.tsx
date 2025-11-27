import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { 
  Settings, 
  Save, 
  Shield, 
  Database, 
  Mail, 
  Bell, 
  Globe,
  Clock,
  Users,
  FileText,
  Zap,
  AlertTriangle
} from 'lucide-react';

interface SystemConfig {
  appName: string;
  appDescription: string;
  allowRegistration: boolean;
  requireEmailVerification: boolean;
  defaultUserRole: string;
  maxFileSize: number;
  maxDocumentPages: number;
  sessionTimeout: number;
  enableNotifications: boolean;
  smtpHost: string;
  smtpPort: string;
  smtpUser: string;
  rateLimitEnabled: boolean;
  rateLimitRequests: number;
  rateLimitWindow: number;
}

export const SystemSettings = () => {
  const { subtab } = useParams();
  const navigate = useNavigate();
  const [config, setConfig] = useState<SystemConfig>({
    appName: 'EduTest Platform',
    appDescription: 'AI-powered educational testing platform',
    allowRegistration: true,
    requireEmailVerification: false,
    defaultUserRole: 'child',
    maxFileSize: 50,
    maxDocumentPages: 100,
    sessionTimeout: 24,
    enableNotifications: true,
    smtpHost: '',
    smtpPort: '587',
    smtpUser: '',
    rateLimitEnabled: true,
    rateLimitRequests: 100,
    rateLimitWindow: 60
  });
  
  const [isSaving, setIsSaving] = useState(false);
  const { toast } = useToast();

  // Read settings subtab from URL or default to 'general'
  const activeTab = subtab || 'general';

  // Redirect to default subtab if not set and we're on the settings tab
  useEffect(() => {
    const currentPath = window.location.pathname;
    if (!subtab && currentPath.startsWith('/admin/settings')) {
      navigate('/admin/settings/general', { replace: true });
    }
  }, [subtab, navigate]);

  // Update URL when changing settings tabs
  const handleSettingsTabChange = (value: string) => {
    navigate(`/admin/settings/${value}`);
  };

  const handleConfigChange = (key: keyof SystemConfig, value: any) => {
    setConfig(prev => ({ ...prev, [key]: value }));
  };

  const handleSaveSettings = async () => {
    setIsSaving(true);
    
    try {
      // In a real implementation, this would save to database or configuration service
      await new Promise(resolve => setTimeout(resolve, 1000)); // Simulate API call
      
      toast({
        title: "Settings saved",
        description: "System settings have been updated successfully.",
      });
    } catch (error: any) {
      toast({
        title: "Failed to save settings",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Settings className="w-5 h-5 mr-2" />
            System Settings
          </CardTitle>
          <CardDescription>
            Configure global system parameters and settings
          </CardDescription>
        </CardHeader>
      </Card>

      <Tabs value={activeTab} onValueChange={handleSettingsTabChange} className="space-y-6">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="general">General</TabsTrigger>
          <TabsTrigger value="security">Security</TabsTrigger>
          <TabsTrigger value="limits">Limits</TabsTrigger>
          <TabsTrigger value="email">Email</TabsTrigger>
          <TabsTrigger value="api">API</TabsTrigger>
        </TabsList>

        <TabsContent value="general" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Globe className="w-5 h-5 mr-2" />
                General Configuration
              </CardTitle>
              <CardDescription>
                Basic application settings and configuration
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="appName">Application Name</Label>
                  <Input
                    id="appName"
                    value={config.appName}
                    onChange={(e) => handleConfigChange('appName', e.target.value)}
                  />
                </div>
                <div>
                  <Label htmlFor="defaultUserRole">Default User Role</Label>
                  <Select 
                    value={config.defaultUserRole} 
                    onValueChange={(value) => handleConfigChange('defaultUserRole', value)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="child">Child</SelectItem>
                      <SelectItem value="parent">Parent</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              
              <div>
                <Label htmlFor="appDescription">Application Description</Label>
                <Textarea
                  id="appDescription"
                  value={config.appDescription}
                  onChange={(e) => handleConfigChange('appDescription', e.target.value)}
                  rows={3}
                />
              </div>

              <div className="flex items-center space-x-2">
                <Switch
                  id="enableNotifications"
                  checked={config.enableNotifications}
                  onCheckedChange={(checked) => handleConfigChange('enableNotifications', checked)}
                />
                <Label htmlFor="enableNotifications">Enable System Notifications</Label>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="security" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Shield className="w-5 h-5 mr-2" />
                Security Settings
              </CardTitle>
              <CardDescription>
                Configure authentication and security policies
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-4">
                <div className="flex items-center space-x-2">
                  <Switch
                    id="allowRegistration"
                    checked={config.allowRegistration}
                    onCheckedChange={(checked) => handleConfigChange('allowRegistration', checked)}
                  />
                  <Label htmlFor="allowRegistration">Allow New User Registration</Label>
                </div>

                <div className="flex items-center space-x-2">
                  <Switch
                    id="requireEmailVerification"
                    checked={config.requireEmailVerification}
                    onCheckedChange={(checked) => handleConfigChange('requireEmailVerification', checked)}
                  />
                  <Label htmlFor="requireEmailVerification">Require Email Verification</Label>
                </div>

                <div>
                  <Label htmlFor="sessionTimeout">Session Timeout (hours)</Label>
                  <Input
                    id="sessionTimeout"
                    type="number"
                    value={config.sessionTimeout}
                    onChange={(e) => handleConfigChange('sessionTimeout', e.target.value === '' ? 0 : parseInt(e.target.value))}
                    className="w-32"
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    User sessions will expire after this duration
                  </p>
                </div>
              </div>

              <div className="mt-6 p-4 bg-amber-50 border border-amber-200 rounded-lg">
                <div className="flex items-center">
                  <AlertTriangle className="w-4 h-4 text-amber-600 mr-2" />
                  <span className="text-sm font-medium text-amber-800">Security Notice</span>
                </div>
                <p className="text-sm text-amber-700 mt-1">
                  Changes to security settings will affect all users. Ensure you understand the implications before saving.
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="limits" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Database className="w-5 h-5 mr-2" />
                System Limits
              </CardTitle>
              <CardDescription>
                Configure resource limits and quotas
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="maxFileSize">Max File Size (MB)</Label>
                  <Input
                    id="maxFileSize"
                    type="number"
                    value={config.maxFileSize}
                    onChange={(e) => handleConfigChange('maxFileSize', e.target.value === '' ? 0 : parseInt(e.target.value))}
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Maximum file size for page uploads
                  </p>
                </div>

                <div>
                  <Label htmlFor="maxDocumentPages">Max Pages</Label>
                  <Input
                    id="maxDocumentPages"
                    type="number"
                    value={config.maxDocumentPages}
                    onChange={(e) => handleConfigChange('maxDocumentPages', e.target.value === '' ? 0 : parseInt(e.target.value))}
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Maximum pages per upload for processing
                  </p>
                </div>
              </div>

              <div className="mt-6">
                <h4 className="text-sm font-medium mb-3">Current Usage</h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <Card>
                    <CardContent className="pt-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center">
                          <FileText className="w-4 h-4 text-muted-foreground mr-2" />
                          <span className="text-sm">Pages</span>
                        </div>
                        <Badge variant="secondary">45/1000</Badge>
                      </div>
                    </CardContent>
                  </Card>
                  
                  <Card>
                    <CardContent className="pt-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center">
                          <Users className="w-4 h-4 text-muted-foreground mr-2" />
                          <span className="text-sm">Users</span>
                        </div>
                        <Badge variant="secondary">23/500</Badge>
                      </div>
                    </CardContent>
                  </Card>
                  
                  <Card>
                    <CardContent className="pt-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center">
                          <Clock className="w-4 h-4 text-muted-foreground mr-2" />
                          <span className="text-sm">Tests/Month</span>
                        </div>
                        <Badge variant="secondary">156/2000</Badge>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="email" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Mail className="w-5 h-5 mr-2" />
                Email Configuration
              </CardTitle>
              <CardDescription>
                Configure SMTP settings for email notifications
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="smtpHost">SMTP Host</Label>
                  <Input
                    id="smtpHost"
                    value={config.smtpHost}
                    onChange={(e) => handleConfigChange('smtpHost', e.target.value)}
                    placeholder="smtp.gmail.com"
                  />
                </div>

                <div>
                  <Label htmlFor="smtpPort">SMTP Port</Label>
                  <Input
                    id="smtpPort"
                    value={config.smtpPort}
                    onChange={(e) => handleConfigChange('smtpPort', e.target.value)}
                    placeholder="587"
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="smtpUser">SMTP Username</Label>
                <Input
                  id="smtpUser"
                  value={config.smtpUser}
                  onChange={(e) => handleConfigChange('smtpUser', e.target.value)}
                  placeholder="your-email@domain.com"
                />
              </div>

              <div className="mt-4">
                <Button variant="outline" size="sm">
                  <Mail className="w-4 h-4 mr-2" />
                  Test Email Configuration
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="api" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Zap className="w-5 h-5 mr-2" />
                API Settings
              </CardTitle>
              <CardDescription>
                Configure API rate limiting and access controls
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center space-x-2">
                <Switch
                  id="rateLimitEnabled"
                  checked={config.rateLimitEnabled}
                  onCheckedChange={(checked) => handleConfigChange('rateLimitEnabled', checked)}
                />
                <Label htmlFor="rateLimitEnabled">Enable Rate Limiting</Label>
              </div>

              {config.rateLimitEnabled && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="rateLimitRequests">Requests per Window</Label>
                    <Input
                      id="rateLimitRequests"
                      type="number"
                      value={config.rateLimitRequests}
                      onChange={(e) => handleConfigChange('rateLimitRequests', e.target.value === '' ? 0 : parseInt(e.target.value))}
                    />
                  </div>

                  <div>
                    <Label htmlFor="rateLimitWindow">Window Duration (seconds)</Label>
                    <Input
                      id="rateLimitWindow"
                      type="number"
                      value={config.rateLimitWindow}
                      onChange={(e) => handleConfigChange('rateLimitWindow', e.target.value === '' ? 0 : parseInt(e.target.value))}
                    />
                  </div>
                </div>
              )}

              <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <div className="flex items-center">
                  <Zap className="w-4 h-4 text-blue-600 mr-2" />
                  <span className="text-sm font-medium text-blue-800">API Information</span>
                </div>
                <p className="text-sm text-blue-700 mt-1">
                  Rate limiting helps protect your system from abuse and ensures fair resource allocation.
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Save Button */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex justify-end">
            <Button onClick={handleSaveSettings} disabled={isSaving}>
              {isSaving ? (
                <>Saving...</>
              ) : (
                <>
                  <Save className="w-4 h-4 mr-2" />
                  Save Settings
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};