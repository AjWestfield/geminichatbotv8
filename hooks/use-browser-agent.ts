import { useState, useCallback, useEffect, useRef } from 'react';
import { browserAgentService, BrowserAgentSession, BrowserAction } from '@/lib/services/browser-agent-service';
import { toast } from 'sonner';

interface UseBrowserAgentReturn {
  session: BrowserAgentSession | null;
  isActive: boolean;
  isProcessing: boolean;
  actions: BrowserAction[];
  error: string | null;
  
  startSession: () => Promise<BrowserAgentSession>;
  endSession: () => void;
  sendCommand: (query: string) => Promise<void>;
  switchToBrowserTab: () => void;
}

interface UseBrowserAgentOptions {
  onSessionStart?: (session: BrowserAgentSession) => void;
  onSessionEnd?: () => void;
  onAction?: (action: BrowserAction) => void;
  onCanvasTabChange?: (tab: string) => void;
  onResponse?: (response: string) => void;
}

export function useBrowserAgent(options: UseBrowserAgentOptions = {}): UseBrowserAgentReturn {
  const [session, setSession] = useState<BrowserAgentSession | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [actions, setActions] = useState<BrowserAction[]>([]);
  const [error, setError] = useState<string | null>(null);
  
  const activeSessionRef = useRef<BrowserAgentSession | null>(null);

  // Start a new browser agent session
  const startSession = useCallback(async () => {
    try {
      const newSession = browserAgentService.createSession();
      activeSessionRef.current = newSession;
      setSession(newSession);
      setActions([]);
      setError(null);
      
      // Switch to browser tab
      if (options.onCanvasTabChange) {
        options.onCanvasTabChange('browser');
      }
      
      // Notify listeners
      options.onSessionStart?.(newSession);
      
      toast.success('Browser Agent Activated', {
        description: 'Ready to process your research requests'
      });
      
      return newSession;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to start browser agent';
      setError(errorMessage);
      toast.error('Failed to start browser agent', {
        description: errorMessage
      });
      throw err;
    }
  }, [options]);

  // End the current session
  const endSession = useCallback(() => {
    if (activeSessionRef.current) {
      browserAgentService.closeSession(activeSessionRef.current.id);
      activeSessionRef.current = null;
      setSession(null);
      setActions([]);
      setError(null);
      
      options.onSessionEnd?.();
      
      toast.info('Browser Agent Deactivated');
    }
  }, [options]);

  // Send a command to the browser agent
  const sendCommand = useCallback(async (query: string) => {
    if (!activeSessionRef.current) {
      throw new Error('No active browser agent session');
    }

    setIsProcessing(true);
    setError(null);

    try {
      await browserAgentService.processCommand({
        query,
        sessionId: activeSessionRef.current.id
      });
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to process command';
      setError(errorMessage);
      throw err;
    } finally {
      setIsProcessing(false);
    }
  }, []);

  // Switch to browser tab
  const switchToBrowserTab = useCallback(() => {
    if (options.onCanvasTabChange) {
      options.onCanvasTabChange('browser');
    }
  }, [options]);

  // Listen to browser agent events
  useEffect(() => {
    const handleSessionUpdated = (updatedSession: BrowserAgentSession) => {
      if (updatedSession.id === activeSessionRef.current?.id) {
        setSession({ ...updatedSession });
      }
    };

    const handleAction = ({ sessionId, action }: { sessionId: string; action: BrowserAction }) => {
      if (sessionId === activeSessionRef.current?.id) {
        setActions(prev => [...prev, action]);
        options.onAction?.(action);
      }
    };

    const handleSessionCompleted = (completedSession: BrowserAgentSession) => {
      if (completedSession.id === activeSessionRef.current?.id) {
        setSession({ ...completedSession });
        setIsProcessing(false);
      }
    };

    const handleSessionError = (errorSession: BrowserAgentSession) => {
      if (errorSession.id === activeSessionRef.current?.id) {
        setSession({ ...errorSession });
        setError(errorSession.error || 'Unknown error');
        setIsProcessing(false);
      }
    };

    const handleResponse = ({ sessionId, response }: { sessionId: string; response: string }) => {
      if (sessionId === activeSessionRef.current?.id) {
        options.onResponse?.(response);
      }
    };

    // Subscribe to events
    browserAgentService.on('session-updated', handleSessionUpdated);
    browserAgentService.on('action', handleAction);
    browserAgentService.on('session-completed', handleSessionCompleted);
    browserAgentService.on('session-error', handleSessionError);
    browserAgentService.on('response', handleResponse);

    // Cleanup
    return () => {
      browserAgentService.off('session-updated', handleSessionUpdated);
      browserAgentService.off('action', handleAction);
      browserAgentService.off('session-completed', handleSessionCompleted);
      browserAgentService.off('session-error', handleSessionError);
      browserAgentService.off('response', handleResponse);
    };
  }, [options]);

  return {
    session,
    isActive: !!session,
    isProcessing,
    actions,
    error,
    startSession,
    endSession,
    sendCommand,
    switchToBrowserTab
  };
}
