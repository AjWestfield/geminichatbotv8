'use client';

import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { toast } from 'sonner';

interface DeepResearchContextType {
  isActive: boolean;
  sessionId: string | null;
  isLoading: boolean;
  browserReady: boolean;
  activateDeepResearch: () => Promise<void>;
  deactivateDeepResearch: () => void;
  sendBrowserCommand: (command: string) => Promise<void>;
  setCanvasTab: (tabSetter: (tab: string) => void) => void;
}

const DeepResearchContext = createContext<DeepResearchContextType | undefined>(undefined);

export function DeepResearchProvider({ children }: { children: React.ReactNode }) {
  const [isActive, setIsActive] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [browserReady, setBrowserReady] = useState(false);
  const [canvasTabSetter, setCanvasTabSetter] = useState<((tab: string) => void) | null>(null);

  // Activate deep research mode
  const activateDeepResearch = useCallback(async () => {
    try {
      setIsLoading(true);
      
      // Generate session ID
      const newSessionId = `deep-research-${Date.now()}`;
      setSessionId(newSessionId);
      
      // Start browser session via API
      const response = await fetch('/api/browser-agent/session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          sessionId: newSessionId,
          mode: 'deep-research' 
        })
      });

      if (!response.ok) {
        throw new Error('Failed to start browser session');
      }

      const data = await response.json();
      
      // Activate deep research mode
      setIsActive(true);
      setBrowserReady(true);
      
      // Switch to browser tab if canvas tab setter is available
      if (canvasTabSetter) {
        canvasTabSetter('browser');
      }
      
      toast.success('Deep Research mode activated! 🔍', {
        description: 'You can now interact with the browser agent.'
      });
      
    } catch (error) {
      console.error('Failed to activate deep research:', error);
      toast.error('Failed to activate Deep Research mode');
    } finally {
      setIsLoading(false);
    }
  }, [canvasTabSetter]);

  // Deactivate deep research mode
  const deactivateDeepResearch = useCallback(() => {
    setIsActive(false);
    setBrowserReady(false);
    setSessionId(null);
    
    toast.info('Deep Research mode deactivated');
  }, []);

  // Send command to browser agent
  const sendBrowserCommand = useCallback(async (command: string) => {
    if (!sessionId || !browserReady) {
      toast.error('Browser agent not ready');
      return;
    }

    try {
      const response = await fetch('/api/browser-agent/command', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          sessionId,
          command,
          type: 'natural-language' 
        })
      });

      if (!response.ok) {
        throw new Error('Failed to send command');
      }

      // Stream the response
      const reader = response.body?.getReader();
      if (reader) {
        const decoder = new TextDecoder();
        
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          
          const chunk = decoder.decode(value);
          console.log('Browser agent response:', chunk);
        }
      }
    } catch (error) {
      console.error('Failed to send browser command:', error);
      toast.error('Failed to send command to browser');
    }
  }, [sessionId, browserReady]);

  // Set canvas tab function
  const setCanvasTab = useCallback((tabSetter: (tab: string) => void) => {
    setCanvasTabSetter(() => tabSetter);
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (sessionId) {
        // Clean up browser session
        fetch('/api/browser-agent/session', {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ sessionId })
        }).catch(console.error);
      }
    };
  }, [sessionId]);

  return (
    <DeepResearchContext.Provider
      value={{
        isActive,
        sessionId,
        isLoading,
        browserReady,
        activateDeepResearch,
        deactivateDeepResearch,
        sendBrowserCommand,
        setCanvasTab
      }}
    >
      {children}
    </DeepResearchContext.Provider>
  );
}

export const useDeepResearch = () => {
  const context = useContext(DeepResearchContext);
  if (!context) {
    throw new Error('useDeepResearch must be used within DeepResearchProvider');
  }
  return context;
};