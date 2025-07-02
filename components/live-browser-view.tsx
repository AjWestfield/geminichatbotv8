'use client';

import React, { useRef, useEffect, useState, useCallback } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  ArrowLeft,
  ArrowRight,
  RefreshCw,
  Camera,
  X,
  Globe,
  Loader2,
  AlertCircle,
  Home,
  Play,
  Pause,
  CheckCircle
} from 'lucide-react';
import { toast } from 'sonner';

// Export the enhanced version as well
export { LiveBrowserViewEnhanced } from './live-browser-view-enhanced';

interface LiveBrowserViewProps {
  sessionId?: string;
  onSessionChange?: (sessionId: string | null) => void;
  className?: string;
}

export function LiveBrowserView({
  sessionId: controlledSessionId,
  onSessionChange,
  className = ''
}: LiveBrowserViewProps) {
  const [sessionId, setSessionId] = useState<string | null>(controlledSessionId || null);
  const [currentUrl, setCurrentUrl] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [screenshot, setScreenshot] = useState<string | null>(null);
  const [isStreaming, setIsStreaming] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [sessionInfo, setSessionInfo] = useState<any>(null);
  
  const wsRef = useRef<WebSocket | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const interactionLayerRef = useRef<HTMLDivElement>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const reconnectAttemptsRef = useRef<number>(0);
  const maxReconnectAttempts = 10;
  const connectionCheckTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Stop polling function
  const stopPolling = useCallback(() => {
    if (pollingIntervalRef.current) {
      clearInterval(pollingIntervalRef.current);
      pollingIntervalRef.current = null;
    }
  }, []);

  // Polling for browser-use service
  const startPolling = useCallback(async (sessionId: string) => {
    // For browser-use service, we don't get live updates
    // Just show a message that the task is running
    setError(null);
    setSessionInfo(prev => ({
      ...prev,
      status: 'running',
      message: 'Browser automation task is running. Results will appear when complete.'
    }));
    
    // Check for completion periodically
    const poll = async () => {
      try {
        const response = await fetch(`/api/browser/session?sessionId=${sessionId}&action=status`);
        if (!response.ok) {
          throw new Error('Failed to get session status');
        }
        
        const data = await response.json();
        
        // Update status
        if (data.status === 'completed' || data.result) {
          setSessionInfo(prev => ({
            ...prev,
            status: 'completed',
            result: data.result,
            message: 'Task completed successfully!'
          }));
          stopPolling();
        } else if (data.status === 'error' || data.error) {
          setError(data.error || 'Task failed');
          stopPolling();
        }
      } catch (error) {
        console.error('[LiveBrowserView] Polling error:', error);
      }
    };
    
    // Initial poll
    poll();
    
    // Set up interval
    pollingIntervalRef.current = setInterval(poll, 2000); // Poll every 2 seconds
  }, [stopPolling]);

  // Check if WebSocket server is available
  const checkWebSocketAvailability = useCallback(async (wsUrl: string): Promise<boolean> => {
    return new Promise((resolve) => {
      const testWs = new WebSocket(wsUrl);
      let resolved = false;

      // Set a timeout for the connection check
      const timeout = setTimeout(() => {
        if (!resolved) {
          resolved = true;
          testWs.close();
          resolve(false);
        }
      }, 3000); // 3 second timeout

      testWs.onopen = () => {
        if (!resolved) {
          resolved = true;
          clearTimeout(timeout);
          testWs.close();
          resolve(true);
        }
      };

      testWs.onerror = () => {
        if (!resolved) {
          resolved = true;
          clearTimeout(timeout);
          resolve(false);
        }
      };

      testWs.onclose = () => {
        if (!resolved) {
          resolved = true;
          clearTimeout(timeout);
          resolve(false);
        }
      };
    });
  }, []);

  // Connect to WebSocket
  const connectWebSocket = useCallback(async () => {
    try {
      // Use environment variable or default to localhost:8002 (browser stream service)
      const wsUrl = process.env.NEXT_PUBLIC_BROWSER_WS_URL || 'ws://localhost:8002';
      const ws = new WebSocket(wsUrl);
      
      ws.onopen = () => {
        console.log('WebSocket connected');
        setIsConnected(true);
        setError(null); // Clear any previous errors
        reconnectAttemptsRef.current = 0; // Reset reconnect attempts
        
        // Subscribe to session if we have one
        if (sessionId) {
          ws.send(JSON.stringify({
            type: 'subscribe',
            sessionId
          }));
        }
      };

      ws.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data);
          handleWebSocketMessage(message);
        } catch (error) {
          console.error('Failed to parse WebSocket message:', error);
        }
      };

      ws.onerror = () => {
        // WebSocket onerror doesn't provide detailed error information
        // We'll provide better context based on the connection state
        if (reconnectAttemptsRef.current === 0) {
          console.log('WebSocket connection failed - server may not be running');
          setError('WebSocket server not available. Please ensure the WebSocket server is running with: npm run browser:ws');
        } else {
          console.log(`WebSocket reconnection attempt ${reconnectAttemptsRef.current} failed`);
          setError(`WebSocket connection failed. Retrying... (${reconnectAttemptsRef.current}/${maxReconnectAttempts})`);
        }
      };

      ws.onclose = (event) => {
        console.log('WebSocket disconnected:', {
          code: event.code,
          reason: event.reason || 'No reason provided',
          wasClean: event.wasClean
        });
        setIsConnected(false);
        wsRef.current = null;
        
        // Don't reconnect if the connection was closed cleanly (user action)
        if (event.wasClean) {
          return;
        }
        
        // Attempt to reconnect with exponential backoff
        if (reconnectAttemptsRef.current < maxReconnectAttempts) {
          reconnectAttemptsRef.current++;
          const delay = Math.min(1000 * Math.pow(2, reconnectAttemptsRef.current - 1), 30000);
          console.log(`Reconnecting in ${delay}ms (attempt ${reconnectAttemptsRef.current}/${maxReconnectAttempts})`);
          
          reconnectTimeoutRef.current = setTimeout(() => {
            connectWebSocket();
          }, delay);
        } else {
          setError('Unable to connect to WebSocket server. Please check that the server is running with: npm run browser:ws');
        }
      };

      wsRef.current = ws;
    } catch (error) {
      console.error('Failed to connect WebSocket:', error);
      setError(error instanceof Error ? error.message : 'Failed to connect');
    }
  }, [sessionId]);

  // Handle WebSocket messages
  const handleWebSocketMessage = useCallback((message: any) => {
    switch (message.type) {
      case 'connected':
        console.log('WebSocket connected with client ID:', message.data?.clientId || 'unknown');
        break;
        
      case 'frame':
        // Handle frame streaming from browser backend
        if (message.sessionId === sessionId && message.data) {
          console.log('Received frame for session:', sessionId);
          const frameData = `data:image/jpeg;base64,${message.data}`;
          setScreenshot(frameData);
          // Draw on canvas if streaming
          if (isStreaming && canvasRef.current) {
            drawScreenshot(frameData);
          }
        }
        break;
        
      case 'screenshot':
        if (message.sessionId === sessionId) {
          const screenshotData = message.data?.screenshot || message.data;
          setScreenshot(screenshotData);
          // Draw on canvas if streaming
          if (isStreaming && canvasRef.current && screenshotData) {
            drawScreenshot(screenshotData);
          }
        }
        break;
        
      case 'navigation':
        if (message.sessionId === sessionId) {
          setCurrentUrl(message.data.url);
          setSessionInfo(prev => ({ ...prev, title: message.data.title }));
        }
        break;
        
      case 'error':
        if (message.sessionId === sessionId) {
          setError(message.data.error);
          toast.error(message.data.error);
        }
        break;
        
      case 'session-closed':
        if (message.sessionId === sessionId) {
          setSessionId(null);
          setScreenshot(null);
          setSessionInfo(null);
          onSessionChange?.(null);
          toast.info('Browser session closed');
        }
        break;
    }
  }, [sessionId, isStreaming]);

  // Draw screenshot on canvas
  const drawScreenshot = useCallback((screenshotData: string) => {
    if (!canvasRef.current) return;
    
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    const img = new Image();
    img.onload = () => {
      canvas.width = img.width;
      canvas.height = img.height;
      ctx.drawImage(img, 0, 0);
    };
    img.src = screenshotData;
  }, []);

  // Create browser session
  const createSession = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      const response = await fetch('/api/browser/session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'create',
          options: {
            headless: false,
            viewport: { width: 1280, height: 720 }
          }
        })
      });

      const data = await response.json();
      
      if (!data.success) {
        throw new Error(data.error || 'Failed to create session');
      }

      setSessionId(data.session.id);
      setCurrentUrl(data.session.url);
      setSessionInfo(data.session);
      onSessionChange?.(data.session.id);
      
      // Auto-start streaming for embedded browser experience
      setIsStreaming(true);
      
      // Browser-use service doesn't use WebSocket, it uses REST API
      // Start polling for session updates instead
      if (data.browserUseSession) {
        console.log('[LiveBrowserView] Starting polling for browser-use session:', data.session.id);
        startPolling(data.session.id);
      } else if (data.streamUrl || data.session?.streamUrl) {
        // Legacy WebSocket support for other browser services
        const streamUrl = data.streamUrl || data.session?.streamUrl;
        
        // First check if the service is reachable
        try {
          const healthCheck = await fetch('http://localhost:8002/api/browser-use/start', { 
            method: 'GET',
            signal: AbortSignal.timeout(2000) // 2 second timeout
          }).catch(() => null);
          
          // Browser-use service returns 405 for GET requests, which is expected
          if (!healthCheck) {
            throw new Error('Browser service not reachable');
          }
        } catch (healthError) {
          setError('Browser automation service is not running');
          toast.error(
            'The browser automation service is not available. Please check that the dev server is running properly.',
            { duration: 10000 }
          );
          return; // Exit early
        }
        
        // Close existing WebSocket if any
        if (wsRef.current) {
          wsRef.current.close();
        }
        
        // Connect to the session stream
        const streamWs = new WebSocket(streamUrl);
        
        // Add connection timeout
        const connectionTimeout = setTimeout(() => {
          if (streamWs.readyState !== WebSocket.OPEN) {
            streamWs.close();
            setError('Failed to connect to browser stream service');
            toast.error(
              'Could not connect to browser stream. Make sure the service is running:\n' +
              'cd browser-agent && python browser_stream_service.py',
              { duration: 10000 }
            );
          }
        }, 5000); // 5 second timeout
        
        streamWs.onopen = () => {
          clearTimeout(connectionTimeout);
          console.log('Stream WebSocket connected');
          setIsConnected(true);
          setError(null);
          reconnectAttemptsRef.current = 0;
        };
        
        streamWs.onmessage = (event) => {
          try {
            const message = JSON.parse(event.data);
            console.log('Stream message:', message.type, message);
            handleWebSocketMessage(message);
          } catch (error) {
            console.error('Failed to parse message:', error);
          }
        };
        
        streamWs.onerror = (error) => {
          console.error('Stream WebSocket error:', error);
          setError('WebSocket connection failed. Please ensure the browser stream service is running on port 8002.');
          
          // Fallback: Show instructions to start the service
          toast.error(
            'Browser stream service not running. Start it with: cd browser-agent && python browser_stream_service.py',
            { duration: 10000 }
          );
        };
        
        streamWs.onclose = (event) => {
          console.log('Stream WebSocket closed:', event);
          setIsConnected(false);
          wsRef.current = null;
        };
        
        wsRef.current = streamWs;
      }
      
      toast.success('Browser session created');
    } catch (error) {
      console.error('Failed to create session:', error);
      setError(error instanceof Error ? error.message : 'Failed to create session');
    } finally {
      setIsLoading(false);
    }
  }, [onSessionChange]);

  // Navigate to URL
  const navigateTo = useCallback(async (url: string) => {
    if (!sessionId || !url) return;
    
    try {
      setIsLoading(true);
      setError(null);
      
      // Use WebSocket if connected, otherwise use HTTP
      if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
        wsRef.current.send(JSON.stringify({
          type: 'interaction',
          navigate: url
        }));
      } else {
        const response = await fetch('/api/browser/session', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'navigate',
            sessionId,
            url
          })
        });

        const data = await response.json();
        
        if (!data.success) {
          throw new Error(data.error || 'Navigation failed');
        }
        
        setScreenshot(data.content.screenshot);
      }
    } catch (error) {
      console.error('Navigation error:', error);
      setError(error instanceof Error ? error.message : 'Navigation failed');
    } finally {
      setIsLoading(false);
    }
  }, [sessionId]);

  // Handle browser actions
  const handleAction = useCallback(async (action: string, data?: any) => {
    if (!sessionId) return;
    
    try {
      if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
        wsRef.current.send(JSON.stringify({
          type: action,
          sessionId,
          data
        }));
      } else {
        const response = await fetch('/api/browser/session', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action,
            sessionId,
            ...data
          })
        });

        const result = await response.json();
        if (!result.success) {
          throw new Error(result.error || `${action} failed`);
        }
      }
    } catch (error) {
      console.error(`Action ${action} error:`, error);
      setError(error instanceof Error ? error.message : `${action} failed`);
    }
  }, [sessionId]);

  // Toggle streaming
  const toggleStreaming = useCallback(async () => {
    if (!sessionId) return;
    
    if (isStreaming) {
      await handleAction('stop-stream');
      setIsStreaming(false);
      toast.info('Streaming stopped');
    } else {
      await handleAction('start-stream', { interval: 100 }); // 10fps
      setIsStreaming(true);
      toast.success('Streaming started');
    }
  }, [sessionId, isStreaming, handleAction]);

  // Handle click on browser view
  const handleBrowserClick = useCallback((event: React.MouseEvent<HTMLDivElement>) => {
    if (!sessionId || !interactionLayerRef.current) return;
    
    const rect = interactionLayerRef.current.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;
    
    handleAction('click', { position: { x, y } });
  }, [sessionId, handleAction]);

  // Close session
  const closeSession = useCallback(async () => {
    if (!sessionId) return;
    
    try {
      await handleAction('close');
      setSessionId(null);
      setScreenshot(null);
      setSessionInfo(null);
      setIsStreaming(false);
      onSessionChange?.(null);
      stopPolling(); // Stop polling when closing session
    } catch (error) {
      console.error('Failed to close session:', error);
    }
  }, [sessionId, handleAction, onSessionChange, stopPolling]);

  // Initialize - no need for initial WebSocket connection
  useEffect(() => {
    // Mark as connected since we don't need a general WebSocket connection
    setIsConnected(true);
    
    return () => {
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
      if (wsRef.current) {
        wsRef.current.close();
      }
      stopPolling(); // Stop polling on cleanup
    };
  }, [stopPolling]);

  // Update controlled session ID
  useEffect(() => {
    if (controlledSessionId !== undefined) {
      setSessionId(controlledSessionId);
    }
  }, [controlledSessionId]);

  // Listen for deep research mode activation
  useEffect(() => {
    const checkDeepResearch = async () => {
      const deepResearchMode = localStorage.getItem('deepResearchMode');
      const deepResearchUrl = localStorage.getItem('deepResearchUrl');
      
      if (deepResearchMode && deepResearchUrl) {
        // Create session if needed
        if (!sessionId) {
          await createSession();
        }
        // Navigate to the research URL
        setCurrentUrl(deepResearchUrl);
        navigateTo(deepResearchUrl);
        localStorage.removeItem('deepResearchUrl'); // Clean up
      }
    };

    // Check on mount
    checkDeepResearch();

    // Listen for storage changes
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'deepResearchUrl' && e.newValue) {
        if (!sessionId) {
          createSession().then(() => {
            setCurrentUrl(e.newValue);
            navigateTo(e.newValue);
          });
        } else {
          setCurrentUrl(e.newValue);
          navigateTo(e.newValue);
        }
        localStorage.removeItem('deepResearchUrl');
      }
    };

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, [sessionId, createSession, navigateTo]);

  return (
    <Card className={`flex flex-col h-full bg-[#1A1A1A] border-[#333333] ${className}`}>
      {/* Status Bar */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-[#333333] text-xs">
        <div className="flex items-center gap-2">
          <div className={`w-2 h-2 rounded-full transition-colors ${
            isConnected 
              ? 'bg-green-500 animate-pulse' 
              : reconnectAttemptsRef.current > 0 
                ? 'bg-yellow-500 animate-pulse' 
                : 'bg-red-500'
          }`} />
          <span className="text-[#B0B0B0]">
            {isConnected 
              ? 'Connected' 
              : reconnectAttemptsRef.current > 0 
                ? `Reconnecting (${reconnectAttemptsRef.current}/${maxReconnectAttempts})...`
                : 'Disconnected'
            }
          </span>
          {sessionId && (
            <span className="text-[#B0B0B0]">
              Session: {sessionId.substring(0, 8)}...
            </span>
          )}
        </div>
        {sessionInfo?.title && (
          <span className="text-[#B0B0B0] truncate max-w-[200px]">
            {sessionInfo.title}
          </span>
        )}
      </div>

      {/* Toolbar */}
      <div className="flex items-center gap-2 p-3 border-b border-[#333333]">
        <Button
          size="sm"
          variant="ghost"
          onClick={() => handleAction('goBack')}
          disabled={!sessionId || isLoading}
        >
          <ArrowLeft className="h-4 w-4" />
        </Button>
        
        <Button
          size="sm"
          variant="ghost"
          onClick={() => handleAction('goForward')}
          disabled={!sessionId || isLoading}
        >
          <ArrowRight className="h-4 w-4" />
        </Button>
        
        <Button
          size="sm"
          variant="ghost"
          onClick={() => handleAction('reload')}
          disabled={!sessionId || isLoading}
        >
          <RefreshCw className="h-4 w-4" />
        </Button>
        
        <Button
          size="sm"
          variant="ghost"
          onClick={() => navigateTo('https://www.google.com')}
          disabled={!sessionId || isLoading}
        >
          <Home className="h-4 w-4" />
        </Button>

        {/* URL Bar */}
        <div className="flex-1 flex items-center gap-2 px-3 py-1 bg-[#2B2B2B] rounded-md">
          <Globe className="h-4 w-4 text-[#B0B0B0]" />
          <Input
            type="text"
            value={currentUrl}
            onChange={(e) => setCurrentUrl(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && currentUrl) {
                navigateTo(currentUrl);
              }
            }}
            className="flex-1 bg-transparent border-0 text-sm text-white p-0 focus-visible:ring-0"
            placeholder="Enter URL..."
            disabled={!sessionId || isLoading}
          />
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-1">
          <Button
            size="sm"
            variant="ghost"
            onClick={() => handleAction('screenshot')}
            title="Take screenshot"
            disabled={!sessionId || isLoading}
          >
            <Camera className="h-4 w-4" />
          </Button>
          
          <Button
            size="sm"
            variant="ghost"
            onClick={toggleStreaming}
            title={isStreaming ? 'Stop streaming' : 'Start streaming'}
            disabled={!sessionId || isLoading}
          >
            {isStreaming ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
          </Button>
        </div>

        {sessionId && (
          <Button
            size="sm"
            variant="ghost"
            onClick={closeSession}
          >
            <X className="h-4 w-4" />
          </Button>
        )}
      </div>

      {/* Browser Content */}
      <div className="flex-1 relative overflow-hidden bg-[#1E1E1E]">
        {!sessionId ? (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="text-center p-8">
              <div className="mx-auto h-16 w-16 rounded-2xl bg-[#2B2B2B] flex items-center justify-center mb-6">
                <Globe className="h-8 w-8 text-white" />
              </div>
              <h3 className="text-xl font-semibold text-white mb-2">Live Browser View</h3>
              <p className="text-[#B0B0B0] max-w-md mb-4">
                Experience real-time browser control with AI assistance
              </p>
              <Button
                onClick={createSession}
                disabled={isLoading || !isConnected}
              >
                {isLoading ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Starting...
                  </>
                ) : (
                  'Start Browser Session'
                )}
              </Button>
              {!isConnected && (
                <div className="mt-4 p-4 bg-yellow-500/10 border border-yellow-500/20 rounded-lg max-w-md mx-auto">
                  <div className="flex items-start gap-3">
                    <AlertCircle className="h-5 w-5 text-yellow-500 mt-0.5 flex-shrink-0" />
                    <div className="flex-1">
                      <p className="text-sm text-yellow-500 font-medium mb-2">
                        {error || 'Connecting to WebSocket server...'}
                      </p>
                      {error && error.includes('WebSocket server not available') && (
                        <div className="space-y-3">
                          <div className="text-xs text-yellow-400/90 space-y-2">
                            <p className="font-medium">To enable browser control:</p>
                            <ol className="list-decimal list-inside ml-2 space-y-1">
                              <li>Open a new terminal in your project directory</li>
                              <li>Run the WebSocket server:
                                <pre className="bg-black/50 px-2 py-1 rounded mt-1 font-mono">npm run browser:ws</pre>
                              </li>
                              <li>Wait for the message: "Browser WebSocket Server is running"</li>
                              <li>Click the button below to reconnect</li>
                            </ol>
                          </div>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              reconnectAttemptsRef.current = 0;
                              setError(null);
                              connectWebSocket();
                            }}
                            className="text-xs"
                          >
                            <RefreshCw className="h-3 w-3 mr-1" />
                            Retry Connection
                          </Button>
                        </div>
                      )}
                      {error && error.includes('Retrying...') && (
                        <div className="flex items-center gap-2 text-xs text-yellow-400/90">
                          <Loader2 className="h-3 w-3 animate-spin" />
                          <span>Attempting to reconnect...</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        ) : (
          <>
            {isLoading && (
              <div className="absolute inset-0 flex items-center justify-center bg-[#1A1A1A]/80 z-20">
                <div className="flex flex-col items-center gap-2">
                  <Loader2 className="h-8 w-8 animate-spin text-white" />
                  <p className="text-sm text-[#B0B0B0]">Loading...</p>
                </div>
              </div>
            )}
            
            {error && (
              <div className="absolute top-4 left-4 right-4 z-30">
                <div className="flex items-center gap-2 p-3 bg-red-500/10 border border-red-500/20 rounded-lg">
                  <AlertCircle className="h-5 w-5 text-red-400" />
                  <p className="text-sm text-red-400">{error}</p>
                </div>
              </div>
            )}
            
            {/* Browser View */}
            <div className="relative w-full h-full">
              {sessionInfo?.status === 'running' ? (
                // Show task progress for browser-use service
                <div className="flex items-center justify-center h-full">
                  <div className="text-center p-8">
                    <div className="mx-auto h-16 w-16 rounded-2xl bg-[#2B2B2B] flex items-center justify-center mb-6">
                      <Loader2 className="h-8 w-8 text-white animate-spin" />
                    </div>
                    <h3 className="text-xl font-semibold text-white mb-2">Research in Progress</h3>
                    <p className="text-[#B0B0B0] max-w-md">
                      {sessionInfo?.message || 'The AI is browsing the web to complete your research task...'}
                    </p>
                  </div>
                </div>
              ) : sessionInfo?.status === 'completed' ? (
                // Show completion message
                <div className="flex items-center justify-center h-full">
                  <div className="text-center p-8">
                    <div className="mx-auto h-16 w-16 rounded-2xl bg-green-900/20 flex items-center justify-center mb-6">
                      <CheckCircle className="h-8 w-8 text-green-400" />
                    </div>
                    <h3 className="text-xl font-semibold text-white mb-2">Research Complete</h3>
                    <p className="text-[#B0B0B0] max-w-md mb-4">
                      {sessionInfo?.message || 'The research task has been completed successfully.'}
                    </p>
                    {sessionInfo?.result && (
                      <div className="mt-4 text-left max-w-2xl mx-auto">
                        <pre className="text-sm text-[#B0B0B0] whitespace-pre-wrap">
                          {JSON.stringify(sessionInfo.result, null, 2)}
                        </pre>
                      </div>
                    )}
                  </div>
                </div>
              ) : isStreaming ? (
                <canvas
                  ref={canvasRef}
                  className="w-full h-full object-contain"
                />
              ) : screenshot ? (
                <img
                  src={screenshot}
                  alt="Browser view"
                  className="w-full h-full object-contain"
                />
              ) : (
                <div className="flex items-center justify-center h-full">
                  <p className="text-[#B0B0B0]">Navigate to a URL to see the page</p>
                </div>
              )}
              
              {/* Interaction Layer */}
              <div
                ref={interactionLayerRef}
                className="absolute inset-0 cursor-pointer"
                onClick={handleBrowserClick}
                style={{ zIndex: 10 }}
              />
            </div>
          </>
        )}
      </div>
    </Card>
  );
}