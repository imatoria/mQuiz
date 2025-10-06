import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useViolations, Violation } from '@/hooks/useViolations';
import { format } from 'date-fns';
import { AlertTriangle, ShieldAlert, Info, AlertCircle } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';

interface ViolationReportingProps {
  attemptId?: string;
}

const getSeverityColor = (severity: string) => {
  switch (severity) {
    case 'critical': return 'destructive';
    case 'high': return 'destructive';
    case 'medium': return 'default';
    case 'low': return 'secondary';
    default: return 'default';
  }
};

const getSeverityIcon = (severity: string) => {
  switch (severity) {
    case 'critical': return <ShieldAlert className="h-4 w-4" />;
    case 'high': return <AlertTriangle className="h-4 w-4" />;
    case 'medium': return <AlertCircle className="h-4 w-4" />;
    case 'low': return <Info className="h-4 w-4" />;
    default: return <Info className="h-4 w-4" />;
  }
};

const getViolationTypeLabel = (type: string) => {
  const labels: Record<string, string> = {
    'tab_switch': 'Tab Switch',
    'fullscreen_exit': 'Fullscreen Exit',
    'copy_paste': 'Copy/Paste Attempt',
    'navigation': 'Navigation Attempt',
    'multiple_sessions': 'Multiple Sessions',
    'suspicious_activity': 'Suspicious Activity'
  };
  return labels[type] || type;
};

const ViolationCard = ({ violation }: { violation: Violation }) => (
  <Card className="mb-3">
    <CardHeader className="pb-3">
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-2">
          {getSeverityIcon(violation.severity)}
          <CardTitle className="text-base">
            {getViolationTypeLabel(violation.violation_type)}
          </CardTitle>
        </div>
        <Badge variant={getSeverityColor(violation.severity)}>
          {violation.severity.toUpperCase()}
        </Badge>
      </div>
      <CardDescription className="text-sm">
        {format(new Date(violation.occurred_at), 'PPpp')}
      </CardDescription>
    </CardHeader>
    <CardContent>
      {violation.paper_attempts && (
        <div className="mb-3 space-y-1 text-sm">
          <p><span className="font-medium">Student:</span> {violation.paper_attempts.profiles?.full_name}</p>
          <p><span className="font-medium">Test:</span> {violation.paper_attempts.question_papers?.title}</p>
        </div>
      )}
      {violation.details && Object.keys(violation.details).length > 0 && (
        <div className="rounded-md bg-muted p-3">
          <p className="text-sm font-medium mb-2">Details:</p>
          <pre className="text-xs overflow-auto">
            {JSON.stringify(violation.details, null, 2)}
          </pre>
        </div>
      )}
    </CardContent>
  </Card>
);

export const ViolationReporting = ({ attemptId }: ViolationReportingProps) => {
  const { violations, loading, error, stats } = useViolations(attemptId);

  if (loading) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="text-center text-muted-foreground">Loading violations...</div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertTriangle className="h-4 w-4" />
        <AlertDescription>Error loading violations: {error}</AlertDescription>
      </Alert>
    );
  }

  if (violations.length === 0) {
    return (
      <Alert>
        <Info className="h-4 w-4" />
        <AlertDescription>No violations recorded for this test.</AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="space-y-4">
      {/* Stats Overview */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Total Violations</CardDescription>
            <CardTitle className="text-3xl">{stats.total}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Critical</CardDescription>
            <CardTitle className="text-3xl text-destructive">{stats.critical}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>High</CardDescription>
            <CardTitle className="text-3xl text-destructive">{stats.high}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Medium/Low</CardDescription>
            <CardTitle className="text-3xl">{stats.medium + stats.low}</CardTitle>
          </CardHeader>
        </Card>
      </div>

      {/* Violations by Severity */}
      <Tabs defaultValue="all" className="w-full">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="all">All ({stats.total})</TabsTrigger>
          <TabsTrigger value="critical">Critical ({stats.critical})</TabsTrigger>
          <TabsTrigger value="high">High ({stats.high})</TabsTrigger>
          <TabsTrigger value="medium">Medium ({stats.medium})</TabsTrigger>
          <TabsTrigger value="low">Low ({stats.low})</TabsTrigger>
        </TabsList>

        <TabsContent value="all" className="mt-4">
          <ScrollArea className="h-[600px] pr-4">
            {violations.map(violation => (
              <ViolationCard key={violation.id} violation={violation} />
            ))}
          </ScrollArea>
        </TabsContent>

        {['critical', 'high', 'medium', 'low'].map(severity => (
          <TabsContent key={severity} value={severity} className="mt-4">
            <ScrollArea className="h-[600px] pr-4">
              {violations
                .filter(v => v.severity === severity)
                .map(violation => (
                  <ViolationCard key={violation.id} violation={violation} />
                ))}
            </ScrollArea>
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
};
