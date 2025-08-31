import React from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { AlertTriangle, Shield, Eye, Clock } from 'lucide-react';

interface SecurityViolation {
  type: 'tab_switch' | 'fullscreen_exit' | 'copy_paste' | 'navigation' | 'multiple_sessions' | 'suspicious_activity';
  severity: 'low' | 'medium' | 'high' | 'critical';
  details: Record<string, any>;
  timestamp: Date;
}

interface SecurityWarningModalProps {
  open: boolean;
  onClose: () => void;
  onContinue: () => void;
  onTerminate: () => void;
  violations: SecurityViolation[];
  violationCount: number;
  maxViolations: number;
  canContinue: boolean;
}

export const SecurityWarningModal = ({
  open,
  onClose,
  onContinue,
  onTerminate,
  violations,
  violationCount,
  maxViolations,
  canContinue
}: SecurityWarningModalProps) => {
  const getViolationIcon = (type: string) => {
    switch (type) {
      case 'tab_switch':
        return <Eye className="w-4 h-4" />;
      case 'fullscreen_exit':
        return <Shield className="w-4 h-4" />;
      case 'copy_paste':
        return <AlertTriangle className="w-4 h-4" />;
      case 'navigation':
        return <AlertTriangle className="w-4 h-4" />;
      case 'multiple_sessions':
        return <AlertTriangle className="w-4 h-4" />;
      default:
        return <AlertTriangle className="w-4 h-4" />;
    }
  };

  const getViolationMessage = (violation: SecurityViolation) => {
    switch (violation.type) {
      case 'tab_switch':
        return 'Tab switching or window focus change detected';
      case 'fullscreen_exit':
        return 'Exited fullscreen mode';
      case 'copy_paste':
        return 'Attempted to use prohibited keyboard shortcuts';
      case 'navigation':
        return 'Attempted to navigate away from test';
      case 'multiple_sessions':
        return 'Multiple active test sessions detected';
      default:
        return 'Suspicious activity detected';
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'low':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'medium':
        return 'bg-orange-100 text-orange-800 border-orange-200';
      case 'high':
        return 'bg-red-100 text-red-800 border-red-200';
      case 'critical':
        return 'bg-red-200 text-red-900 border-red-300';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const remainingViolations = maxViolations - violationCount;
  const isNearLimit = remainingViolations <= 1;
  const isAtLimit = violationCount >= maxViolations;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center text-xl">
            <AlertTriangle className="w-6 h-6 mr-2 text-destructive" />
            Security Violation Detected
          </DialogTitle>
          <DialogDescription>
            {isAtLimit 
              ? "Maximum violations reached. Your test will be terminated."
              : "Your test activity is being monitored for security compliance."
            }
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Violation Counter */}
          <Card className={`border-2 ${isAtLimit ? 'border-destructive bg-destructive/5' : isNearLimit ? 'border-warning bg-warning/5' : 'border-orange-200 bg-orange-50'}`}>
            <CardContent className="pt-6">
              <div className="text-center space-y-2">
                <div className="text-3xl font-bold text-destructive">
                  {violationCount} / {maxViolations}
                </div>
                <div className="text-sm text-muted-foreground">
                  Security Violations
                </div>
                {!isAtLimit && (
                  <div className={`text-sm font-medium ${isNearLimit ? 'text-destructive' : 'text-warning'}`}>
                    {remainingViolations} violation{remainingViolations !== 1 ? 's' : ''} remaining before auto-submit
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Recent Violations */}
          {violations.length > 0 && (
            <div className="space-y-3">
              <h3 className="font-semibold">Recent Violations</h3>
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {violations.slice(-5).map((violation, index) => (
                  <div
                    key={index}
                    className="flex items-start space-x-3 p-3 border rounded-lg bg-card"
                  >
                    <div className="flex-shrink-0 mt-0.5">
                      {getViolationIcon(violation.type)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center space-x-2">
                        <span className="text-sm font-medium">
                          {getViolationMessage(violation)}
                        </span>
                        <Badge
                          variant="outline"
                          className={`text-xs ${getSeverityColor(violation.severity)}`}
                        >
                          {violation.severity}
                        </Badge>
                      </div>
                      <div className="text-xs text-muted-foreground mt-1">
                        <Clock className="w-3 h-3 inline mr-1" />
                        {violation.timestamp.toLocaleTimeString()}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Warning Message */}
          <Alert variant={isAtLimit ? "destructive" : "default"}>
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              {isAtLimit ? (
                <div className="space-y-2">
                  <p className="font-semibold">Test Terminated</p>
                  <p>You have exceeded the maximum number of security violations. Your test responses have been saved and will be submitted automatically.</p>
                </div>
              ) : isNearLimit ? (
                <div className="space-y-2">
                  <p className="font-semibold">Final Warning</p>
                  <p>You have {remainingViolations} violation remaining. Any additional security violations will automatically submit your test.</p>
                  <p className="text-sm">Please ensure you:</p>
                  <ul className="text-sm list-disc list-inside ml-4 space-y-1">
                    <li>Stay in fullscreen mode</li>
                    <li>Do not switch tabs or applications</li>
                    <li>Do not use keyboard shortcuts</li>
                    <li>Do not right-click or use the context menu</li>
                  </ul>
                </div>
              ) : (
                <div className="space-y-2">
                  <p className="font-semibold">Security Guidelines Reminder</p>
                  <p>Please follow the test security requirements to avoid further violations:</p>
                  <ul className="text-sm list-disc list-inside ml-4 space-y-1">
                    <li>Remain in fullscreen mode throughout the test</li>
                    <li>Do not switch between tabs or applications</li>
                    <li>Avoid using keyboard shortcuts like Ctrl+C, Ctrl+V, etc.</li>
                    <li>Do not attempt to navigate away from the test page</li>
                  </ul>
                </div>
              )}
            </AlertDescription>
          </Alert>

          {/* Recovery Instructions */}
          {canContinue && !isAtLimit && (
            <div className="bg-primary/5 border border-primary/20 rounded-lg p-4">
              <div className="text-sm">
                <div className="font-semibold text-primary mb-2">How to Continue Safely</div>
                <ol className="list-decimal list-inside space-y-1">
                  <li>Click "Continue Test" to return to your exam</li>
                  <li>Ensure you are in fullscreen mode</li>
                  <li>Focus on the test tab only</li>
                  <li>Use only the provided test navigation controls</li>
                </ol>
              </div>
            </div>
          )}
        </div>

        <DialogFooter>
          {isAtLimit ? (
            <Button 
              onClick={onTerminate}
              className="bg-destructive hover:bg-destructive/90"
            >
              End Test
            </Button>
          ) : canContinue ? (
            <>
              <Button variant="outline" onClick={onTerminate}>
                End Test Now
              </Button>
              <Button 
                onClick={onContinue}
                className="bg-primary hover:bg-primary/90"
              >
                Continue Test
              </Button>
            </>
          ) : (
            <Button 
              onClick={onTerminate}
              className="bg-destructive hover:bg-destructive/90"
            >
              End Test
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};