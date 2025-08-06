import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { 
  Shield, 
  AlertTriangle, 
  Eye, 
  Users, 
  Key, 
  Activity,
  Clock,
  Lock,
  RefreshCw
} from 'lucide-react';

interface SecurityEvent {
  id: string;
  user_id: string;
  event_type: string;
  event_data: any;
  ip_address: unknown;
  user_agent: string;
  created_at: string;
}

interface AuditLog {
  id: string;
  user_id: string;
  action: string;
  resource_type: string;
  resource_id: string;
  details: any;
  created_at: string;
}

export const SecurityDashboard = () => {
  const [securityEvents, setSecurityEvents] = useState<SecurityEvent[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [stats, setStats] = useState({
    totalEvents: 0,
    roleChanges: 0,
    apiKeyUpdates: 0,
    failedLogins: 0
  });
  const { toast } = useToast();

  useEffect(() => {
    fetchSecurityData();
  }, []);

  const fetchSecurityData = async () => {
    try {
      // Fetch recent security events
      const { data: eventsData, error: eventsError } = await supabase
        .from('security_events')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(50);

      if (eventsError) throw eventsError;

      // Fetch recent audit logs
      const { data: logsData, error: logsError } = await supabase
        .from('audit_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(50);

      if (logsError) throw logsError;

      setSecurityEvents(eventsData || []);
      setAuditLogs(logsData || []);

      // Calculate stats
      const events = eventsData || [];
      setStats({
        totalEvents: events.length,
        roleChanges: events.filter(e => e.event_type === 'ROLE_CHANGE').length,
        apiKeyUpdates: events.filter(e => e.event_type === 'API_KEY_UPDATE').length,
        failedLogins: events.filter(e => e.event_type === 'FAILED_LOGIN').length
      });

    } catch (error: any) {
      toast({
        title: "Error fetching security data",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const getEventTypeBadge = (eventType: string) => {
    switch (eventType) {
      case 'ROLE_CHANGE':
        return <Badge variant="destructive">Role Change</Badge>;
      case 'API_KEY_UPDATE':
        return <Badge variant="default">API Key</Badge>;
      case 'FAILED_LOGIN':
        return <Badge variant="secondary">Failed Login</Badge>;
      default:
        return <Badge variant="outline">{eventType}</Badge>;
    }
  };

  const getActionBadge = (action: string) => {
    switch (action) {
      case 'ROLE_CHANGE':
        return <Badge variant="destructive">Role Change</Badge>;
      case 'INSERT':
        return <Badge variant="default">Created</Badge>;
      case 'UPDATE':
        return <Badge variant="secondary">Updated</Badge>;
      case 'DELETE':
        return <Badge variant="outline">Deleted</Badge>;
      default:
        return <Badge variant="outline">{action}</Badge>;
    }
  };

  const formatEventData = (data: any) => {
    if (!data) return 'N/A';
    
    if (typeof data === 'object') {
      if (data.old_role && data.new_role) {
        return `${data.old_role} → ${data.new_role}`;
      }
      if (data.provider_name) {
        return `Provider: ${data.provider_name}`;
      }
      return JSON.stringify(data).substring(0, 100) + '...';
    }
    
    return data.toString();
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">Loading security dashboard...</div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Security Overview */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Shield className="w-5 h-5 mr-2" />
            Security Overview
          </CardTitle>
          <CardDescription>
            Monitor security events and system activity
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-2">
                  <Activity className="w-4 h-4 text-blue-600" />
                  <div>
                    <div className="text-2xl font-bold">{stats.totalEvents}</div>
                    <p className="text-xs text-muted-foreground">Total Events</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-2">
                  <Users className="w-4 h-4 text-red-600" />
                  <div>
                    <div className="text-2xl font-bold">{stats.roleChanges}</div>
                    <p className="text-xs text-muted-foreground">Role Changes</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-2">
                  <Key className="w-4 h-4 text-green-600" />
                  <div>
                    <div className="text-2xl font-bold">{stats.apiKeyUpdates}</div>
                    <p className="text-xs text-muted-foreground">API Key Updates</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-orange-600" />
                  <div>
                    <div className="text-2xl font-bold">{stats.failedLogins}</div>
                    <p className="text-xs text-muted-foreground">Failed Logins</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </CardContent>
      </Card>

      {/* Security Alerts */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center">
              <AlertTriangle className="w-5 h-5 mr-2" />
              Security Alerts
            </div>
            <Button variant="outline" size="sm" onClick={fetchSecurityData}>
              <RefreshCw className="w-4 h-4 mr-2" />
              Refresh
            </Button>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Alert>
            <Lock className="h-4 w-4" />
            <AlertDescription>
              <strong>Security Status:</strong> Database-level role validation is active. 
              All role changes are audited and admin promotion is limited to 3 accounts.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>

      {/* Recent Security Events */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Eye className="w-5 h-5 mr-2" />
            Recent Security Events
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="border rounded-lg">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Event Type</TableHead>
                  <TableHead>Details</TableHead>
                  <TableHead>IP Address</TableHead>
                  <TableHead>Timestamp</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {securityEvents.map((event) => (
                  <TableRow key={event.id}>
                    <TableCell>
                      {getEventTypeBadge(event.event_type)}
                    </TableCell>
                    <TableCell className="max-w-xs">
                      <div className="text-sm">
                        {formatEventData(event.event_data)}
                      </div>
                    </TableCell>
                    <TableCell>
                      <code className="text-xs bg-muted px-1 py-0.5 rounded">
                        {(event.ip_address as string) || 'Unknown'}
                      </code>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1 text-sm text-muted-foreground">
                        <Clock className="w-3 h-3" />
                        {new Date(event.created_at).toLocaleString()}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          
          {securityEvents.length === 0 && (
            <div className="text-center py-8">
              <Shield className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium mb-2">No security events</h3>
              <p className="text-muted-foreground">
                All security events will appear here.
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Audit Logs */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Activity className="w-5 h-5 mr-2" />
            Recent Audit Logs
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="border rounded-lg">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Action</TableHead>
                  <TableHead>Resource</TableHead>
                  <TableHead>Details</TableHead>
                  <TableHead>Timestamp</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {auditLogs.map((log) => (
                  <TableRow key={log.id}>
                    <TableCell>
                      {getActionBadge(log.action)}
                    </TableCell>
                    <TableCell>
                      <div className="text-sm font-medium">{log.resource_type}</div>
                    </TableCell>
                    <TableCell className="max-w-xs">
                      <div className="text-sm">
                        {formatEventData(log.details)}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1 text-sm text-muted-foreground">
                        <Clock className="w-3 h-3" />
                        {new Date(log.created_at).toLocaleString()}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          
          {auditLogs.length === 0 && (
            <div className="text-center py-8">
              <Activity className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium mb-2">No audit logs</h3>
              <p className="text-muted-foreground">
                System audit logs will appear here.
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};