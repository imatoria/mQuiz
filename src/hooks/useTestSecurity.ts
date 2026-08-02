import { useState, useEffect, useCallback, useRef } from 'react';
import { useToast } from '@/hooks/use-toast';
import { dbService } from '@/services/db';
import { useNavigate, useLocation } from 'react-router-dom';

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
  const [navigationBlocked, setNavigationBlocked] = useState(false);
  
  const { toast } = useToast();
  const location = useLocation();
  const violationCountRef = useRef(0);
  const lastViolationRef = useRef<Date | null>(null);
  const historyPushedRef = useRef(false);
  const touchStartXRef = useRef<number | null>(null);

  const logViolation = useCallback(async (violation: SecurityViolation) => {
    if (!testAttemptId) return;

    try {
      const { error } = await dbService.getProvider().execute(
        'INSERT INTO paper_violations',
        [{
          id: crypto.randomUUID(),
          paper_attempt_id: testAttemptId,
          violation_type: violation.type,
          severity: violation.severity,
          details: typeof violation.details === 'string' ? violation.details : JSON.stringify(violation.details),
          occurred_at: violation.timestamp.toISOString()
        }]
      );

      if (error) {
        console.error('Failed to log violation:', error);
      }
    } catch (error) {
      console.error('Error logging violation:', error);
    }
  }, [testAttemptId]);

  // Check for multiple sessions
  const checkMultipleSessions = useCallback(async () => {
    if (!testAttemptId) return;

    try {
      const { data, error } = await dbService.getProvider().query(
        'SELECT id FROM paper_sessions WHERE paper_attempt_id = ? AND is_active = 1',
        [testAttemptId]
      );

      if (error) throw error;

      if (data && data.length > 1) {
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
  }, [testAttemptId, onAutoSubmit, toast]);

  // Add violation and check for auto-submit
  const addViolation = useCallback((violation: SecurityViolation) => {
    setViolations(prev => [...prev, violation]);
    violationCountRef.current += 1;
    lastViolationRef.current = violation.timestamp;
    
    // Log to database
    logViolation(violation);

    // Phase 3: Check for multiple sessions only on high/critical violations (event-driven)
    if (violation.severity === 'high' || violation.severity === 'critical') {
      // Call check asynchronously without waiting
      checkMultipleSessions();
    }

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
  }, [logViolation, maxViolations, onAutoSubmit, toast, checkMultipleSessions]);

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

  // Browser back/forward button and swipe navigation prevention
  const handlePopState = useCallback((e: PopStateEvent) => {
    if (!enabled || !isSecurityActive) return;

    // Push state back to prevent navigation
    window.history.pushState(null, '', window.location.href);
    
    setNavigationBlocked(true);
    
    addViolation({
      type: 'navigation',
      severity: 'high',
      details: {
        action: 'browser_back_forward_attempt',
        gesture: 'swipe_or_button',
        timestamp: new Date().toISOString()
      },
      timestamp: new Date()
    });

    toast({
      title: "Navigation Blocked",
      description: "You cannot navigate away during the test. This has been recorded.",
      variant: "destructive"
    });
  }, [enabled, isSecurityActive, addViolation, toast]);

  // Touch gesture prevention for mobile edge swipes
  const handleTouchStart = useCallback((e: TouchEvent) => {
    if (!enabled || !isSecurityActive) return;
    
    const touch = e.touches[0];
    touchStartXRef.current = touch.clientX;
  }, [enabled, isSecurityActive]);

  const handleTouchMove = useCallback((e: TouchEvent) => {
    if (!enabled || !isSecurityActive || touchStartXRef.current === null) return;
    
    const touch = e.touches[0];
    const deltaX = touch.clientX - touchStartXRef.current;
    const screenWidth = window.innerWidth;
    
    // Detect edge swipes (started near edge and moved significantly)
    const startedNearLeftEdge = touchStartXRef.current < 30;
    const startedNearRightEdge = touchStartXRef.current > screenWidth - 30;
    const significantSwipe = Math.abs(deltaX) > 50;
    
    if ((startedNearLeftEdge || startedNearRightEdge) && significantSwipe) {
      // Try to prevent the gesture
      e.preventDefault();
      
      addViolation({
        type: 'navigation',
        severity: 'medium',
        details: {
          action: 'edge_swipe_attempt',
          direction: deltaX > 0 ? 'right' : 'left',
          startX: touchStartXRef.current,
          timestamp: new Date().toISOString()
        },
        timestamp: new Date()
      });

      toast({
        title: "Swipe Gesture Blocked",
        description: "Edge swipes are not allowed during the test.",
        variant: "destructive"
      });
    }
  }, [enabled, isSecurityActive, addViolation, toast]);

  const handleTouchEnd = useCallback(() => {
    touchStartXRef.current = null;
  }, []);

  // Session management with deduplication
  const createSession = useCallback(async () => {
    if (!testAttemptId || isCreatingSession || sessionId) return;

    setIsCreatingSession(true);
    
    try {
      // First check if an active session already exists for this test attempt
      const { data: existingSessions, error: checkError } = await dbService.getProvider().query(
        'SELECT id FROM paper_sessions WHERE paper_attempt_id = ? AND is_active = 1 LIMIT 1',
        [testAttemptId]
      );

      if (checkError) throw checkError;

      if (existingSessions && existingSessions.length > 0) {
        // Use existing session instead of creating a new one
        setSessionId(existingSessions[0].id);
        console.log('Using existing session:', existingSessions[0].id);
        return;
      }

      // Create new session only if none exists
      const newSessionId = crypto.randomUUID();
      const { error } = await dbService.getProvider().execute(
        'INSERT INTO paper_sessions',
        [{
          id: newSessionId,
          paper_attempt_id: testAttemptId,
          ip_address: '127.0.0.1',
          user_agent: navigator.userAgent,
          is_active: 1
        }]
      );

      if (error) throw error;
      setSessionId(newSessionId);
      console.log('Created new session:', newSessionId);
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
      await dbService.getProvider().execute(
        'UPDATE paper_sessions SET ? WHERE id = ?',
        [{ last_ping: new Date().toISOString() }, sessionId]
      );
    } catch (error) {
      console.error('Failed to update session:', error);
    }
  }, [sessionId, isSecurityActive]);

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

    // Push history state to trap back navigation
    if (!historyPushedRef.current) {
      window.history.pushState(null, '', window.location.href);
      historyPushedRef.current = true;
    }

    // Add event listeners
    document.addEventListener('visibilitychange', handleVisibilityChange);
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    document.addEventListener('keydown', handleKeyDown);
    document.addEventListener('contextmenu', handleContextMenu);
    window.addEventListener('beforeunload', handleBeforeUnload);
    window.addEventListener('popstate', handlePopState);
    
    // Touch gesture prevention for mobile
    document.addEventListener('touchstart', handleTouchStart, { passive: true });
    document.addEventListener('touchmove', handleTouchMove, { passive: false });
    document.addEventListener('touchend', handleTouchEnd, { passive: true });

    // Phase 3: Optimized session monitoring with reduced frequency
    const sessionInterval = setInterval(updateSession, 180000); // 3 minutes
    
    // Only check multiple sessions on violation, not continuously
    // checkMultipleSessions will be called only when violations occur

    return () => {
      clearInterval(sessionInterval);
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
    handlePopState,
    handleTouchStart,
    handleTouchMove,
    handleTouchEnd,
    updateSession, 
    checkMultipleSessions
  ]);

  // Deactivate security measures  
  const deactivateSecurity = useCallback(() => {
    setIsSecurityActive(false);
    setNavigationBlocked(false);
    historyPushedRef.current = false;
    
    // Remove event listeners
    document.removeEventListener('visibilitychange', handleVisibilityChange);
    document.removeEventListener('fullscreenchange', handleFullscreenChange);
    document.removeEventListener('keydown', handleKeyDown);
    document.removeEventListener('contextmenu', handleContextMenu);
    window.removeEventListener('beforeunload', handleBeforeUnload);
    window.removeEventListener('popstate', handlePopState);
    document.removeEventListener('touchstart', handleTouchStart);
    document.removeEventListener('touchmove', handleTouchMove);
    document.removeEventListener('touchend', handleTouchEnd);

    // Close session
    if (sessionId) {
      dbService.getProvider().execute(
        'UPDATE paper_sessions SET ? WHERE id = ?',
        [{ is_active: 0 }, sessionId]
      );
    }

    // Exit fullscreen
    if (document.exitFullscreen && document.fullscreenElement) {
      document.exitFullscreen();
    }
  }, [sessionId, handlePopState, handleTouchStart, handleTouchMove, handleTouchEnd]); // Remove unstable event handler dependencies

  // Cleanup on unmount - use ref to avoid dependency issues
  useEffect(() => {
    const cleanup = () => {
      setIsSecurityActive(false);
      setNavigationBlocked(false);
      historyPushedRef.current = false;
      
      // Remove all possible event listeners
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
      document.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('contextmenu', handleContextMenu);
      window.removeEventListener('beforeunload', handleBeforeUnload);
      window.removeEventListener('popstate', handlePopState);
      document.removeEventListener('touchstart', handleTouchStart);
      document.removeEventListener('touchmove', handleTouchMove);
      document.removeEventListener('touchend', handleTouchEnd);

      if (sessionId) {
        dbService.getProvider().execute(
          'UPDATE paper_sessions SET ? WHERE id = ?',
          [{ is_active: 0 }, sessionId]
        );
      }
    };
    
    return cleanup;
  }, []); // Empty dependency array to prevent infinite loops

  // Dismiss navigation blocked state after a delay
  useEffect(() => {
    if (navigationBlocked) {
      const timeout = setTimeout(() => setNavigationBlocked(false), 3000);
      return () => clearTimeout(timeout);
    }
  }, [navigationBlocked]);

  return {
    violations,
    violationCount: violationCountRef.current,
    tabSwitchCount,
    isFullscreen,
    isSecurityActive,
    navigationBlocked,
    activateSecurity,
    deactivateSecurity,
    enableFullscreen,
    addViolation
  };
};
