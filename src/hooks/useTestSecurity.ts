import { useState, useEffect, useCallback, useRef } from 'react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

interface SecurityViolation {
  type: 'tab_switch' | 'fullscreen_exit' | 'copy_paste' | 'navigation' | 'multiple_sessions' | 'suspicious_activity';
  severity: 'low' | 'medium' | 'high' | 'critical';
  details: Record<string, any>;
  timestamp: Date;
}

interface UseTestSecurityOptions {
  testAttemptId: string | null;
  enabled: boolean;
  onAutoSubmit: (reason: string) => void;
  maxViolations?: number;
}

export const useTestSecurity = ({
  testAttemptId,
  enabled,
  onAutoSubmit,
  maxViolations = 3
}: UseTestSecurityOptions) => {
  const [violations, setViolations] = useState<SecurityViolation[]>([]);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [tabSwitchCount, setTabSwitchCount] = useState(0);
  const [isSecurityActive, setIsSecurityActive] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [isCreatingSession, setIsCreatingSession] = useState(false);
  
  const { toast } = useToast();
  const violationCountRef = useRef(0);
  const lastViolationRef = useRef<Date | null>(null);

  // Log violation to database
  const logViolation = useCallback(async (violation: SecurityViolation) => {
    if (!testAttemptId) return;

    try {
      const { data, error } = await supabase.functions.invoke('log-paper-violation', {
        body: {
          paperAttemptId: testAttemptId,
          violationType: violation.type,
          severity: violation.severity,
          details: violation.details,
          timestamp: violation.timestamp.toISOString()
        }
      });

      if (error) {
        console.error('Failed to log violation:', error);
      }
    } catch (error) {
      console.error('Error logging violation:', error);
    }
  }, [testAttemptId]);

  // Add violation and check for auto-submit
  const addViolation = useCallback((violation: SecurityViolation) => {
    setViolations(prev => [...prev, violation]);
    violationCountRef.current += 1;
    lastViolationRef.current = violation.timestamp;
    
    // Log to database
    logViolation(violation);

    // Progressive warnings
    if (violationCountRef.current === 1) {
      toast({
        title: "Security Warning #1",
        description: "Suspicious activity detected. Please follow test guidelines.",
        variant: "destructive"
      });
    } else if (violationCountRef.current === 2) {
      toast({
        title: "⚠️ Final Warning #2",
        description: "One more violation will automatically submit your test!",
        variant: "destructive"
      });
    } else if (violationCountRef.current >= maxViolations) {
      toast({
        title: "🚨 Test Terminated",
        description: "Too many security violations. Auto-submitting test now.",
        variant: "destructive"
      });
      
      const reason = `Security violations exceeded (${violationCountRef.current}/${maxViolations})`;
      onAutoSubmit(reason);
    }
  }, [logViolation, maxViolations, onAutoSubmit, toast]);

  // Tab switch detection
  const handleVisibilityChange = useCallback(() => {
    if (!enabled || !isSecurityActive) return;

    if (document.hidden) {
      setTabSwitchCount(prev => prev + 1);
      
      addViolation({
        type: 'tab_switch',
        severity: 'medium',
        details: {
          count: tabSwitchCount + 1,
          timestamp: new Date().toISOString(),
          userAgent: navigator.userAgent
        },
        timestamp: new Date()
      });
    }
  }, [enabled, isSecurityActive, tabSwitchCount, addViolation]);

  // Fullscreen monitoring (simplified - just track status)
  const handleFullscreenChange = useCallback(() => {
    if (!enabled) return;
    setIsFullscreen(!!document.fullscreenElement);
  }, [enabled]);

  // Keyboard shortcuts prevention
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (!enabled) return;

    const isProhibited = 
      (e.ctrlKey && ['c', 'v', 'x', 'a', 's', 'z', 'y', 'p'].includes(e.key.toLowerCase())) ||
      e.key === 'F12' ||
      (e.ctrlKey && e.shiftKey && ['I', 'J', 'C'].includes(e.key)) ||
      (e.altKey && e.key === 'Tab') ||
      e.key === 'PrintScreen';

    if (isProhibited) {
      e.preventDefault();
      e.stopPropagation();
      
      addViolation({
        type: 'copy_paste',
        severity: 'medium',
        details: {
          key: e.key,
          ctrlKey: e.ctrlKey,
          shiftKey: e.shiftKey,
          altKey: e.altKey,
          timestamp: new Date().toISOString()
        },
        timestamp: new Date()
      });

      toast({
        title: "Action Blocked",
        description: "This keyboard shortcut is not allowed during the test",
        variant: "destructive"
      });
    }
  }, [enabled, addViolation, toast]);

  // Context menu prevention
  const handleContextMenu = useCallback((e: Event) => {
    if (!enabled) return;
    
    e.preventDefault();
    
    addViolation({
      type: 'copy_paste',
      severity: 'low',
      details: {
        action: 'right_click',
        timestamp: new Date().toISOString()
      },
      timestamp: new Date()
    });

    toast({
      title: "Action Blocked",
      description: "Right-click is disabled during the test",
      variant: "destructive"
    });
  }, [enabled, addViolation, toast]);

  // Browser navigation prevention
  const handleBeforeUnload = useCallback((e: BeforeUnloadEvent) => {
    if (!enabled || !isSecurityActive) return;

    e.preventDefault();
    e.returnValue = 'Are you sure you want to leave? Your test progress may be lost.';
    
    addViolation({
      type: 'navigation',
      severity: 'high',
      details: {
        action: 'attempted_navigation',
        timestamp: new Date().toISOString()
      },
      timestamp: new Date()
    });
  }, [enabled, isSecurityActive, addViolation]);

  // Session management with deduplication
  const createSession = useCallback(async () => {
    if (!testAttemptId || isCreatingSession || sessionId) return;

    setIsCreatingSession(true);
    
    try {
      // First check if an active session already exists for this test attempt
      const { data: existingSessions, error: checkError } = await supabase
        .from('paper_sessions')
        .select('id')
        .eq('paper_attempt_id', testAttemptId)
        .eq('is_active', true)
        .limit(1);

      if (checkError) throw checkError;

      if (existingSessions && existingSessions.length > 0) {
        // Use existing session instead of creating a new one
        setSessionId(existingSessions[0].id);
        console.log('Using existing session:', existingSessions[0].id);
        return;
      }

      // Create new session only if none exists
      const { data, error } = await supabase
        .from('paper_sessions')
        .insert({
          paper_attempt_id: testAttemptId,
          ip_address: '0.0.0.0', // Will be set by server
          user_agent: navigator.userAgent,
          is_active: true
        })
        .select()
        .single();

      if (error) throw error;
      setSessionId(data.id);
      console.log('Created new session:', data.id);
    } catch (error) {
      console.error('Failed to create session:', error);
    } finally {
      setIsCreatingSession(false);
    }
  }, [testAttemptId, isCreatingSession, sessionId]);

  // Session heartbeat with rate limiting
  const updateSession = useCallback(async () => {
    if (!sessionId || !isSecurityActive) return;

    try {
      await supabase
        .from('paper_sessions')
        .update({ last_ping: new Date().toISOString() })
        .eq('id', sessionId);
    } catch (error) {
      console.error('Failed to update session:', error);
    }
  }, [sessionId, isSecurityActive]);

  // Check for multiple sessions
  const checkMultipleSessions = useCallback(async () => {
    if (!testAttemptId) return;

    try {
      const { data, error } = await supabase.functions.invoke('detect-multiple-sessions', {
        body: { testAttemptId }
      });

      if (error) throw error;

      if (data?.hasMultiple) {
        addViolation({
          type: 'multiple_sessions',
          severity: 'critical',
          details: {
            sessionCount: data.count,
            sessions: data.sessions,
            timestamp: new Date().toISOString()
          },
          timestamp: new Date()
        });

        toast({
          title: "⚠️ Multiple Sessions Detected",
          description: "This test is being accessed from another location. Test will be terminated.",
          variant: "destructive"
        });

        onAutoSubmit('Multiple active sessions detected');
      }
    } catch (error) {
      console.error('Failed to check sessions:', error);
    }
  }, [testAttemptId, addViolation, onAutoSubmit, toast]);

  // Simplified fullscreen enable - just return true, don't force fullscreen
  const enableFullscreen = useCallback(async () => {
    // Don't force fullscreen, just return success
    // Parent component will handle fullscreen prompt
    return true;
  }, []);

  // Activate security measures with interval management
  const activateSecurity = useCallback(() => {
    if (!enabled || isSecurityActive || isCreatingSession) return;

    setIsSecurityActive(true);
    
    // Only create session if we don't already have one
    if (!sessionId) {
      createSession();
    }

    // Add event listeners
    document.addEventListener('visibilitychange', handleVisibilityChange);
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    document.addEventListener('keydown', handleKeyDown);
    document.addEventListener('contextmenu', handleContextMenu);
    window.addEventListener('beforeunload', handleBeforeUnload);

    // Start session monitoring with longer intervals to reduce API calls
    const sessionInterval = setInterval(updateSession, 60000); // Increased to 60s
    const multiSessionCheck = setInterval(checkMultipleSessions, 120000); // Increased to 2 minutes

    return () => {
      clearInterval(sessionInterval);
      clearInterval(multiSessionCheck);
    };
  }, [
    enabled, 
    isSecurityActive, 
    isCreatingSession,
    sessionId,
    createSession, 
    handleVisibilityChange, 
    handleFullscreenChange, 
    handleKeyDown, 
    handleContextMenu, 
    handleBeforeUnload, 
    updateSession, 
    checkMultipleSessions
  ]);

  // Deactivate security measures  
  const deactivateSecurity = useCallback(() => {
    setIsSecurityActive(false);
    
    // Remove event listeners
    document.removeEventListener('visibilitychange', handleVisibilityChange);
    document.removeEventListener('fullscreenchange', handleFullscreenChange);
    document.removeEventListener('keydown', handleKeyDown);
    document.removeEventListener('contextmenu', handleContextMenu);
    window.removeEventListener('beforeunload', handleBeforeUnload);

    // Close session
    if (sessionId) {
      supabase
        .from('paper_sessions')
        .update({ is_active: false })
        .eq('id', sessionId);
    }

    // Exit fullscreen
    if (document.exitFullscreen && document.fullscreenElement) {
      document.exitFullscreen();
    }
  }, [sessionId]); // Remove unstable event handler dependencies

  // Cleanup on unmount - use ref to avoid dependency issues
  useEffect(() => {
    const cleanup = () => {
      setIsSecurityActive(false);
      
      // Remove all possible event listeners
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
      document.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('contextmenu', handleContextMenu);
      window.removeEventListener('beforeunload', handleBeforeUnload);

      if (sessionId) {
        supabase
          .from('paper_sessions')
          .update({ is_active: false })
          .eq('id', sessionId);
      }
    };
    
    return cleanup;
  }, []); // Empty dependency array to prevent infinite loops

  return {
    violations,
    violationCount: violationCountRef.current,
    tabSwitchCount,
    isFullscreen,
    isSecurityActive,
    activateSecurity,
    deactivateSecurity,
    enableFullscreen,
    addViolation
  };
};
