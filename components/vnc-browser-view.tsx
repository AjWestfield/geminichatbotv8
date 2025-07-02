'use client';

import React, { useEffect, useRef, useState, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import {
  Monitor,
  Bot,
  Loader2,
  AlertCircle,
  Play,
  Pause,
  Square,
  MousePointer,
  Keyboard,
  Eye,
  EyeOff,
  Maximize2,
  Minimize2,
  RefreshCw,
  Copy,
  Shield
} from 'lucide-react';

interface VNCBrowserViewProps {
  sessionId: string;
  vncPort: number;
  vncPassword?: string;
  onAction?: (action: any) => void;
  onTakeoverRequest?: () => void;
  className?: string;
}

export function VNCBrowserView({
  sessionId,
  vncPort,
  vncPassword,
  onAction,
  onTakeoverRequest,
  className = ''
}: VNCBrowserViewProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showControls, setShowControls] = useState(true);
  const [takeoverMode, setTakeoverMode] = useState(false);
  const [lastAction, setLastAction] = useState<string>('');
  const rfbRef = useRef<any>(null);

  // Load noVNC dynamically
  useEffect(() => {
    const loadNoVNC = async () => {
      try {
        // Check if RFB is already loaded
        if ((window as any).RFB) {
          return;
        }

        // Create script element for noVNC
        const script = document.createElement('script');
        script.src = 'https://cdn.jsdelivr.net/npm/@novnc/novnc@1.4.0/lib/rfb.js';
        script.type = 'module';
        
        await new Promise((resolve, reject) => {
          script.onload = resolve;
          script.onerror = reject;
          document.head.appendChild(script);
        });

        // Import RFB from the loaded module
        const RFB = (await import('https://cdn.jsdelivr.net/npm/@novnc/novnc@1.4.0/lib/rfb.js' as any)).default;
        (window as any).RFB = RFB;
      } catch (error) {
        console.error('Failed to load noVNC:', error);
        setError('Failed to load VNC client library');
      }
    };

    loadNoVNC();
  }, []);

  // Connect to VNC server
  const connectVNC = useCallback(async () => {
    if (!canvasRef.current || isConnecting || isConnected) return;
    
    const RFB = (window as any).RFB;
    if (!RFB) {
      setError('VNC client not loaded');
      return;
    }

    setIsConnecting(true);
    setError(null);

    try {
      // Build VNC WebSocket URL
      // For local development, use WebSocket proxy
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const host = window.location.hostname;
      const wsPort = 6080; // noVNC websockify port
      const vncUrl = `${protocol}//${host}:${wsPort}/`;

      // Create RFB client
      const rfb = new RFB(canvasRef.current, vncUrl, {
        credentials: vncPassword ? { password: vncPassword } : undefined,
        wsProtocols: ['binary', 'base64']
      });

      // Configure RFB
      rfb.viewOnly = takeoverMode ? false : true;
      rfb.scaleViewport = true;
      rfb.resizeSession = false;
      rfb.showDotCursor = true;
      rfb.background = '#1a1a1a';

      // Set up event handlers
      rfb.addEventListener('connect', () => {
        console.log('VNC connected');
        setIsConnected(true);
        setIsConnecting(false);
        toast.success('Connected to browser session');
      });

      rfb.addEventListener('disconnect', (e: any) => {
        console.log('VNC disconnected', e.detail);
        setIsConnected(false);
        setIsConnecting(false);
        if (e.detail.clean) {
          toast.info('Browser session ended');
        } else {
          setError('Connection lost');
          toast.error('Lost connection to browser session');
        }
      });

      rfb.addEventListener('credentialsrequired', () => {
        if (vncPassword) {
          rfb.sendCredentials({ password: vncPassword });
        }
      });

      rfb.addEventListener('securityfailure', (e: any) => {
        setError(`Security failure: ${e.detail.reason}`);
        setIsConnecting(false);
      });

      rfb.addEventListener('clipboard', (e: any) => {
        console.log('Clipboard event:', e.detail.text);
      });

      rfbRef.current = rfb;

      // Track mouse/keyboard events for action display
      if (canvasRef.current) {
        const canvas = canvasRef.current;
        
        canvas.addEventListener('mousemove', (e) => {
          if (takeoverMode) {
            const rect = canvas.getBoundingClientRect();
            const x = Math.round(e.clientX - rect.left);
            const y = Math.round(e.clientY - rect.top);
            setLastAction(`Mouse: ${x}, ${y}`);
          }
        });

        canvas.addEventListener('click', () => {
          if (!takeoverMode) {
            setLastAction('Click (AI controlled)');
          }
        });
      }

    } catch (error) {
      console.error('Failed to connect:', error);
      setError('Failed to connect to browser session');
      setIsConnecting(false);
    }
  }, [vncPort, vncPassword, takeoverMode]);

  // Connect on mount
  useEffect(() => {
    if (vncPort && !isConnected && !isConnecting) {
      // Small delay to ensure canvas is ready
      const timer = setTimeout(() => connectVNC(), 500);
      return () => clearTimeout(timer);
    }
  }, [vncPort, connectVNC, isConnected, isConnecting]);

  // Handle takeover mode
  const handleTakeover = useCallback(() => {
    if (rfbRef.current) {
      setTakeoverMode(!takeoverMode);
      rfbRef.current.viewOnly = takeoverMode; // Inverted because state hasn't updated yet
      
      if (!takeoverMode) {
        toast.info('Takeover mode enabled - You now have control', {
          description: 'Click anywhere in the browser to interact'
        });
        onTakeoverRequest?.();
      } else {
        toast.info('Takeover mode disabled - AI has control');
      }
    }
  }, [takeoverMode, onTakeoverRequest]);

  // Handle fullscreen
  const toggleFullscreen = useCallback(() => {
    if (!containerRef.current) return;

    if (!isFullscreen) {
      if (containerRef.current.requestFullscreen) {
        containerRef.current.requestFullscreen();
      }
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen();
      }
    }
    setIsFullscreen(!isFullscreen);
  }, [isFullscreen]);

  // Copy session info
  const copySessionInfo = useCallback(() => {
    const info = `VNC Session: ${sessionId}\nPort: ${vncPort}`;
    navigator.clipboard.writeText(info);
    toast.success('Session info copied to clipboard');
  }, [sessionId, vncPort]);

  // Disconnect VNC
  const disconnect = useCallback(() => {
    if (rfbRef.current) {
      rfbRef.current.disconnect();
      rfbRef.current = null;
    }
    setIsConnected(false);
    setTakeoverMode(false);
  }, []);

  return (
    <Card className={`flex flex-col ${className}`} ref={containerRef}>
      <CardHeader className="flex-shrink-0 p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="relative">
              <Monitor className="h-5 w-5" />
              {isConnected && (
                <div className="absolute -top-1 -right-1">
                  <Bot className="h-3 w-3 text-blue-500" />
                </div>
              )}
            </div>
            <CardTitle className="text-lg">Live Browser View</CardTitle>
            <Badge variant={isConnected ? 'default' : 'secondary'}>
              {isConnected ? 'Connected' : isConnecting ? 'Connecting...' : 'Disconnected'}
            </Badge>
            {takeoverMode && (
              <Badge variant="destructive" className="animate-pulse">
                <Shield className="h-3 w-3 mr-1" />
                Manual Control
              </Badge>
            )}
          </div>

          {/* Control buttons */}
          <div className="flex items-center gap-2">
            {isConnected && (
              <>
                <Button
                  size="sm"
                  variant={takeoverMode ? "destructive" : "outline"}
                  onClick={handleTakeover}
                  title={takeoverMode ? "Return control to AI" : "Take manual control"}
                >
                  {takeoverMode ? (
                    <>
                      <Bot className="h-4 w-4 mr-1" />
                      Return to AI
                    </>
                  ) : (
                    <>
                      <MousePointer className="h-4 w-4 mr-1" />
                      Take Control
                    </>
                  )}
                </Button>

                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setShowControls(!showControls)}
                >
                  {showControls ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </Button>

                <Button
                  size="sm"
                  variant="outline"
                  onClick={toggleFullscreen}
                >
                  {isFullscreen ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
                </Button>

                <Button
                  size="sm"
                  variant="outline"
                  onClick={copySessionInfo}
                >
                  <Copy className="h-4 w-4" />
                </Button>

                <Button
                  size="sm"
                  variant="outline"
                  onClick={disconnect}
                >
                  <Square className="h-4 w-4" />
                </Button>
              </>
            )}

            {!isConnected && !isConnecting && (
              <Button
                size="sm"
                onClick={connectVNC}
              >
                <Play className="h-4 w-4 mr-1" />
                Connect
              </Button>
            )}
          </div>
        </div>

        {/* Status bar */}
        {showControls && lastAction && (
          <div className="mt-2 text-xs text-muted-foreground">
            Last action: {lastAction}
          </div>
        )}
      </CardHeader>

      <CardContent className="flex-1 p-0 relative overflow-hidden">
        {/* VNC Canvas */}
        <div className="absolute inset-0 bg-[#1a1a1a]">
          {isConnecting && (
            <div className="absolute inset-0 flex items-center justify-center bg-background/80 z-10">
              <div className="text-center">
                <Loader2 className="h-8 w-8 animate-spin mx-auto mb-3" />
                <p className="text-sm text-muted-foreground">Connecting to browser session...</p>
              </div>
            </div>
          )}

          {error && (
            <div className="absolute inset-0 flex items-center justify-center bg-background/80 z-10">
              <div className="text-center max-w-md">
                <AlertCircle className="h-8 w-8 text-destructive mx-auto mb-3" />
                <p className="text-sm font-medium mb-2">Connection Error</p>
                <p className="text-xs text-muted-foreground mb-4">{error}</p>
                <Button size="sm" onClick={connectVNC}>
                  <RefreshCw className="h-4 w-4 mr-1" />
                  Retry
                </Button>
              </div>
            </div>
          )}

          <canvas
            ref={canvasRef}
            className="w-full h-full"
            style={{ 
              cursor: takeoverMode ? 'auto' : 'not-allowed',
              imageRendering: 'crisp-edges'
            }}
          />

          {/* AI action overlay */}
          {isConnected && !takeoverMode && showControls && (
            <div className="absolute top-4 left-4 bg-background/90 backdrop-blur-sm rounded-lg p-3 max-w-xs">
              <div className="flex items-center gap-2 text-sm">
                <Bot className="h-4 w-4 text-blue-500 animate-pulse" />
                <span className="font-medium">AI is in control</span>
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                The browser is being controlled by the AI agent. Click "Take Control" to interact manually.
              </p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}