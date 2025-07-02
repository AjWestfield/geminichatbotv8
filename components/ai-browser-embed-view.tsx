'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  ArrowLeft,
  ArrowRight,
  RefreshCw,
  Home,
  X,
  Globe,
  Loader2,
  AlertCircle,
  Lock,
  Bot,
  Play,
  Pause,
  Maximize2,
  Search
} from 'lucide-react';
import { toast } from 'sonner';

interface AIBrowserEmbedViewProps {
  sessionId?: string;
  onSessionChange?: (sessionId: string | null) => void;
  className?: string;
  enableAI?: boolean;
}

export function AIBrowserEmbedView({
  sessionId: controlledSessionId,
  onSessionChange,
  className = '',
  enableAI = true
}: AIBrowserEmbedViewProps) {
  const [sessionId, setSessionId] = useState<string | null>(controlledSessionId || null);
  const [currentUrl, setCurrentUrl] = useState('https://www.google.com');
  const [inputUrl, setInputUrl] = useState('https://www.google.com');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [screenshot, setScreenshot] = useState<string | null>(null);
  const [isAIActive, setIsAIActive] = useState(false);
  const [aiTask, setAITask] = useState('');
  const [pageTitle, setPageTitle] = useState('New Tab');
  const [isSecure, setIsSecure] = useState(true);
  const [canGoBack, setCanGoBack] = useState(false);
  const [canGoForward, setCanGoForward] = useState(false);
  
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const [isConnected, setIsConnected] = useState(false);

  // Format URL
  const formatUrl = (urlString: string) => {
    if (!urlString) return '';
    
    if (!urlString.match(/^https?:\/\//)) {
      if (urlString.includes(' ') || !urlString.includes('.')) {
        return `https://www.google.com/search?q=${encodeURIComponent(urlString)}`;
      }
      return `https://${urlString}`;
    }
    
    return urlString;
  };

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
          url: currentUrl,
          options: {
            headless: true,  // Run headless for embedded mode
            viewport: { width: 1280, height: 720 }
          }
        })
      });

      const data = await response.json();
      
      if (!data.success && !data.sessionId) {
        throw new Error(data.error || 'Failed to create session');
      }

      const newSessionId = data.sessionId || data.session?.id;
      setSessionId(newSessionId);
      
      if (data.session?.url) {
        setCurrentUrl(data.session.url);
        setInputUrl(data.session.url);
      }
      
      if (data.session?.title) {
        setPageTitle(data.session.title);
      }
      
      if (data.session?.screenshot || data.screenshot) {
        setScreenshot(data.session?.screenshot || data.screenshot);
      }
      
      onSessionChange?.(newSessionId);
      
      // Connect to WebSocket for streaming
      if (data.streamUrl) {
        connectWebSocket(data.streamUrl);
      }
      
      toast.success('Browser session created');
    } catch (error) {
      console.error('Failed to create session:', error);
      setError(error instanceof Error ? error.message : 'Failed to create session');
    } finally {
      setIsLoading(false);
    }
  }, [currentUrl, onSessionChange]);

  // Connect to WebSocket
  const connectWebSocket = useCallback((streamUrl: string) => {
    try {
      const ws = new WebSocket(streamUrl);
      
      ws.onopen = () => {
        console.log('WebSocket connected');
        setIsConnected(true);
        setError(null);
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
        console.error('WebSocket error');
        setIsConnected(false);
      };

      ws.onclose = () => {
        console.log('WebSocket disconnected');
        setIsConnected(false);
        wsRef.current = null;
      };

      wsRef.current = ws;
    } catch (error) {
      console.error('Failed to connect WebSocket:', error);
      setError('Failed to connect to browser stream');
    }
  }, []);

  // Handle WebSocket messages
  const handleWebSocketMessage = useCallback((message: any) => {
    switch (message.type) {
      case 'frame':
        if (message.data) {
          const frameData = `data:image/jpeg;base64,${message.data}`;
          setScreenshot(frameData);
          drawScreenshot(frameData);
        }
        break;
        
      case 'navigation':
        setCurrentUrl(message.data.url);
        setInputUrl(message.data.url);
        setPageTitle(message.data.title || 'Untitled');
        setIsSecure(message.data.url.startsWith('https://'));
        break;
        
      case 'action_result':
        if (message.result.screenshot) {
          setScreenshot(`data:image/jpeg;base64,${message.result.screenshot}`);
        }
        if (message.result.url) {
          setCurrentUrl(message.result.url);
          setInputUrl(message.result.url);
        }
        if (message.result.title) {
          setPageTitle(message.result.title);
        }
        break;
        
      case 'research_started':
        setIsAIActive(true);
        toast.info('AI is browsing...');
        break;
        
      case 'research_completed':
        setIsAIActive(false);
        toast.success('AI task completed');
        break;
        
      case 'error':
        setError(message.error || message.message);
        setIsAIActive(false);
        break;
    }
  }, []);

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

  // Browser actions
  const handleAction = useCallback(async (action: string, data?: any) => {
    if (!sessionId) return;
    
    try {
      setIsLoading(true);
      
      // If WebSocket is connected, use it
      if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
        wsRef.current.send(JSON.stringify({
          type: 'interaction',
          action,
          data
        }));
      } else {
        // Fallback to REST API
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
        
        if (result.content?.screenshot) {
          setScreenshot(`data:image/jpeg;base64,${result.content.screenshot}`);
        }
      }
    } catch (error) {
      console.error(`Action ${action} error:`, error);
      setError(error instanceof Error ? error.message : `${action} failed`);
    } finally {
      setIsLoading(false);
    }
  }, [sessionId]);

  // Navigate to URL
  const navigate = useCallback(async (url: string) => {
    const formattedUrl = formatUrl(url);
    if (!formattedUrl) return;
    
    setCurrentUrl(formattedUrl);
    setInputUrl(formattedUrl);
    await handleAction('navigate', { url: formattedUrl });
  }, [handleAction]);

  // Start AI task
  const startAITask = useCallback(async () => {
    if (!sessionId || !aiTask.trim()) return;
    
    try {
      setIsAIActive(true);
      
      if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
        wsRef.current.send(JSON.stringify({
          type: 'start_research',
          query: aiTask
        }));
      } else {
        toast.error('WebSocket not connected. Please refresh.');
      }
    } catch (error) {
      console.error('Failed to start AI task:', error);
      setIsAIActive(false);
    }
  }, [sessionId, aiTask]);

  // Handle click on canvas
  const handleCanvasClick = useCallback((event: React.MouseEvent<HTMLCanvasElement>) => {
    if (!sessionId || !canvasRef.current) return;
    
    const rect = canvasRef.current.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;
    
    // Scale coordinates if needed
    const scaleX = canvasRef.current.width / rect.width;
    const scaleY = canvasRef.current.height / rect.height;
    
    handleAction('click', { 
      position: { 
        x: x * scaleX, 
        y: y * scaleY 
      } 
    });
  }, [sessionId, handleAction]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, []);

  return (
    <Card className={`flex flex-col h-full bg-white dark:bg-[#1A1A1A] border-[#E5E5E5] dark:border-[#333333] ${className}`}>
      {/* Browser Header */}
      <div className="border-b border-[#E5E5E5] dark:border-[#333333]">
        {/* Tab Bar */}
        <div className="flex items-center gap-2 px-3 py-2 bg-[#F5F5F5] dark:bg-[#2B2B2B]">
          <div className="flex-1 flex items-center gap-2 px-3 py-1.5 bg-white dark:bg-[#1A1A1A] rounded-lg">
            {isSecure ? (
              <Lock className="h-3 w-3 text-green-600 dark:text-green-400" />
            ) : (
              <Globe className="h-3 w-3 text-[#666] dark:text-[#999]" />
            )}
            <span className="text-sm font-medium text-[#333] dark:text-white truncate max-w-[300px]">
              {pageTitle}
            </span>
            {isAIActive && (
              <div className="flex items-center gap-1 ml-2">
                <Bot className="h-3 w-3 text-blue-500 animate-pulse" />
                <span className="text-xs text-blue-500">AI Active</span>
              </div>
            )}
            <X 
              className="h-3 w-3 text-[#666] dark:text-[#999] ml-auto cursor-pointer hover:text-black dark:hover:text-white" 
              onClick={() => {
                setSessionId(null);
                setScreenshot(null);
                onSessionChange?.(null);
              }}
            />
          </div>
        </div>

        {/* Navigation Bar */}
        <div className="flex items-center gap-2 p-3">
          {/* Navigation Buttons */}
          <div className="flex items-center gap-1">
            <Button
              size="sm"
              variant="ghost"
              onClick={() => handleAction('goBack')}
              disabled={!sessionId || isLoading || !canGoBack}
              className="h-8 w-8 p-0"
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>
            
            <Button
              size="sm"
              variant="ghost"
              onClick={() => handleAction('goForward')}
              disabled={!sessionId || isLoading || !canGoForward}
              className="h-8 w-8 p-0"
            >
              <ArrowRight className="h-4 w-4" />
            </Button>
            
            <Button
              size="sm"
              variant="ghost"
              onClick={() => handleAction('reload')}
              disabled={!sessionId || isLoading}
              className="h-8 w-8 p-0"
            >
              <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
            </Button>
          </div>

          {/* URL Bar */}
          <div className="flex-1 flex items-center gap-2 px-3 py-1.5 bg-[#F5F5F5] dark:bg-[#2B2B2B] rounded-full">
            <Globe className="h-4 w-4 text-[#666] dark:text-[#B0B0B0]" />
            <Input
              type="text"
              value={inputUrl}
              onChange={(e) => setInputUrl(e.target.value)}
              onKeyPress={(e) => {
                if (e.key === 'Enter' && sessionId) {
                  navigate(inputUrl);
                }
              }}
              className="flex-1 bg-transparent border-0 text-sm p-0 h-auto focus-visible:ring-0 focus-visible:ring-offset-0"
              placeholder="Search or enter URL"
              disabled={!sessionId || isLoading}
            />
            {inputUrl && sessionId && (
              <Button
                size="sm"
                variant="ghost"
                onClick={() => navigate(inputUrl)}
                className="h-6 w-6 p-0"
              >
                <Search className="h-3 w-3" />
              </Button>
            )}
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-1">
            <Button
              size="sm"
              variant="ghost"
              onClick={() => navigate('https://www.google.com')}
              title="Go to homepage"
              disabled={!sessionId || isLoading}
              className="h-8 w-8 p-0"
            >
              <Home className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* AI Control Bar */}
        {enableAI && sessionId && (
          <div className="flex items-center gap-2 px-3 pb-3">
            <Bot className="h-4 w-4 text-[#666] dark:text-[#B0B0B0]" />
            <Input
              type="text"
              value={aiTask}
              onChange={(e) => setAITask(e.target.value)}
              onKeyPress={(e) => {
                if (e.key === 'Enter' && aiTask.trim()) {
                  startAITask();
                }
              }}
              className="flex-1 text-sm"
              placeholder="Tell AI what to do (e.g., 'Search for the best pizza recipes')"
              disabled={isAIActive}
            />
            <Button
              size="sm"
              onClick={startAITask}
              disabled={!aiTask.trim() || isAIActive}
            >
              {isAIActive ? (
                <>
                  <Pause className="h-4 w-4 mr-1" />
                  Running...
                </>
              ) : (
                <>
                  <Play className="h-4 w-4 mr-1" />
                  Start
                </>
              )}
            </Button>
          </div>
        )}
      </div>

      {/* Browser Content */}
      <div className="flex-1 relative overflow-hidden bg-white dark:bg-[#1E1E1E]">
        {!sessionId ? (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="text-center p-8">
              <div className="mx-auto h-16 w-16 rounded-2xl bg-[#F5F5F5] dark:bg-[#2B2B2B] flex items-center justify-center mb-6">
                <Globe className="h-8 w-8 text-[#666] dark:text-white" />
              </div>
              <h3 className="text-xl font-semibold text-[#333] dark:text-white mb-2">
                Embedded Browser
              </h3>
              <p className="text-[#666] dark:text-[#B0B0B0] max-w-md mb-6">
                Experience web browsing with AI assistance, all within your app
              </p>
              <Button onClick={createSession} disabled={isLoading}>
                {isLoading ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Starting...
                  </>
                ) : (
                  'Start Browser Session'
                )}
              </Button>
            </div>
          </div>
        ) : (
          <>
            {isLoading && (
              <div className="absolute inset-0 flex items-center justify-center bg-white/80 dark:bg-[#1A1A1A]/80 z-20">
                <div className="flex flex-col items-center gap-2">
                  <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
                  <p className="text-sm text-[#666] dark:text-[#B0B0B0]">Loading...</p>
                </div>
              </div>
            )}
            
            {error && (
              <div className="absolute top-4 left-4 right-4 z-30">
                <div className="flex items-center gap-2 p-3 bg-red-500/10 border border-red-500/20 rounded-lg">
                  <AlertCircle className="h-5 w-5 text-red-600 dark:text-red-400" />
                  <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
                </div>
              </div>
            )}
            
            {/* Browser Display */}
            {screenshot ? (
              <canvas
                ref={canvasRef}
                className="w-full h-full object-contain cursor-pointer"
                onClick={handleCanvasClick}
                style={{ imageRendering: 'crisp-edges' }}
              />
            ) : (
              <div className="flex items-center justify-center h-full">
                <p className="text-[#666] dark:text-[#B0B0B0]">
                  Waiting for browser content...
                </p>
              </div>
            )}
          </>
        )}
      </div>

      {/* Status Bar */}
      <div className="flex items-center justify-between px-3 py-1 text-xs border-t border-[#E5E5E5] dark:border-[#333333] bg-[#F5F5F5] dark:bg-[#2B2B2B]">
        <div className="flex items-center gap-3">
          <span className={`flex items-center gap-1 ${isConnected ? 'text-green-600' : 'text-[#666]'} dark:${isConnected ? 'text-green-400' : 'text-[#B0B0B0]'}`}>
            <div className={`w-1.5 h-1.5 rounded-full ${isConnected ? 'bg-green-600 dark:bg-green-400' : 'bg-[#666] dark:bg-[#B0B0B0]'}`} />
            {isConnected ? 'Connected' : 'Disconnected'}
          </span>
          {sessionId && (
            <span className="text-[#666] dark:text-[#B0B0B0]">
              Session: {sessionId.substring(0, 8)}...
            </span>
          )}
        </div>
        <span className="text-[#666] dark:text-[#B0B0B0]">
          AI-Powered Browser
        </span>
      </div>
    </Card>
  );
}