'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import {
  Monitor,
  Play,
  Square,
  Loader2,
  Settings,
  ExternalLink,
  RefreshCw,
  Maximize,
  Volume2,
  VolumeX
} from 'lucide-react';

interface VNCBrowserIntegrationProps {
  className?: string;
  onConnect?: (sessionId: string) => void;
  onDisconnect?: () => void;
}

export function VNCBrowserIntegration({ 
  className = '',
  onConnect,
  onDisconnect
}: VNCBrowserIntegrationProps) {
  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [vncUrl, setVncUrl] = useState<string | null>(null);
  const [containerStatus, setContainerStatus] = useState<'stopped' | 'starting' | 'running'>('stopped');
  const iframeRef = useRef<HTMLIFrameElement>(null);

  // Docker container configuration for VNC browser
  const dockerConfig = {
    image: 'kasmweb/chromium:1.16.0',
    ports: {
      vnc: 5901,
      novnc: 6901
    },
    environment: {
      VNC_PW: 'password',
      STARTING_WEBSITE_URL: 'https://google.com',
      VNC_RESOLUTION: '1280x720'
    }
  };

  // Start VNC browser container
  const startVNCBrowser = useCallback(async () => {
    setIsConnecting(true);
    setContainerStatus('starting');
    
    try {
      // In a real implementation, this would call your backend API
      // that manages Docker containers or VNC services
      const response = await fetch('/api/vnc-browser/start', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          config: dockerConfig,
          sessionId: `vnc-${Date.now()}`
        })
      });

      if (response.ok) {
        const data = await response.json();
        setSessionId(data.sessionId);
        setVncUrl(data.vncUrl); // e.g., http://localhost:6901
        setIsConnected(true);
        setContainerStatus('running');
        
        toast.success('VNC Browser started successfully!');
        onConnect?.(data.sessionId);
      } else {
        throw new Error('Failed to start VNC browser');
      }
    } catch (error) {
      console.error('Error starting VNC browser:', error);
      toast.error('Failed to start VNC browser');
      setContainerStatus('stopped');
    } finally {
      setIsConnecting(false);
    }
  }, [onConnect]);

  // Stop VNC browser container
  const stopVNCBrowser = useCallback(async () => {
    if (!sessionId) return;

    try {
      await fetch('/api/vnc-browser/stop', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ sessionId })
      });

      setSessionId(null);
      setVncUrl(null);
      setIsConnected(false);
      setContainerStatus('stopped');
      
      toast.info('VNC Browser stopped');
      onDisconnect?.();
    } catch (error) {
      console.error('Error stopping VNC browser:', error);
      toast.error('Failed to stop VNC browser');
    }
  }, [sessionId, onDisconnect]);

  // Refresh VNC connection
  const refreshConnection = useCallback(() => {
    if (iframeRef.current && vncUrl) {
      iframeRef.current.src = vncUrl;
    }
  }, [vncUrl]);

  // Get status color
  const getStatusColor = (status: typeof containerStatus) => {
    switch (status) {
      case 'running': return 'bg-green-500';
      case 'starting': return 'bg-yellow-500';
      case 'stopped': return 'bg-gray-500';
      default: return 'bg-gray-500';
    }
  };

  return (
    <div className={`flex flex-col h-full ${className}`}>
      <Card className="flex-1 flex flex-col">
        <CardHeader className="flex-shrink-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Monitor className="h-5 w-5" />
              <CardTitle>VNC Browser</CardTitle>
              <Badge variant="outline" className={getStatusColor(containerStatus)}>
                {containerStatus.charAt(0).toUpperCase() + containerStatus.slice(1)}
              </Badge>
            </div>
            
            <div className="flex items-center gap-2">
              {vncUrl && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => window.open(vncUrl, '_blank')}
                >
                  <ExternalLink className="h-4 w-4" />
                </Button>
              )}
            </div>
          </div>

          {/* Control Panel */}
          <div className="flex items-center gap-2 mt-4">
            {!isConnected ? (
              <Button
                onClick={startVNCBrowser}
                disabled={isConnecting}
                className="min-w-[120px]"
              >
                {isConnecting ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : (
                  <Play className="h-4 w-4 mr-2" />
                )}
                Start Browser
              </Button>
            ) : (
              <>
                <Button size="sm" variant="outline" onClick={refreshConnection}>
                  <RefreshCw className="h-4 w-4 mr-1" />
                  Refresh
                </Button>
                <Button size="sm" variant="outline" onClick={stopVNCBrowser}>
                  <Square className="h-4 w-4 mr-1" />
                  Stop
                </Button>
              </>
            )}
            
            {sessionId && (
              <div className="flex-1 text-right">
                <span className="text-sm text-gray-500">
                  Session: {sessionId.substring(0, 12)}...
                </span>
              </div>
            )}
          </div>

          {/* Configuration Info */}
          <div className="mt-3 p-3 bg-gray-50 rounded-lg">
            <div className="text-sm space-y-1">
              <div className="flex justify-between">
                <span className="text-gray-600">Image:</span>
                <span className="font-mono text-xs">{dockerConfig.image}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Resolution:</span>
                <span className="font-mono text-xs">{dockerConfig.environment.VNC_RESOLUTION}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">noVNC Port:</span>
                <span className="font-mono text-xs">{dockerConfig.ports.novnc}</span>
              </div>
            </div>
          </div>
        </CardHeader>

        <CardContent className="flex-1 flex flex-col p-0">
          <div className="flex-1 relative">
            {vncUrl && isConnected ? (
              <iframe
                ref={iframeRef}
                src={vncUrl}
                className="w-full h-full border-0"
                title="VNC Browser Session"
                sandbox="allow-same-origin allow-scripts allow-forms allow-popups allow-downloads"
              />
            ) : containerStatus === 'starting' ? (
              <div className="flex items-center justify-center h-full text-gray-500">
                <div className="text-center max-w-md">
                  <div className="relative mb-6">
                    <div className="absolute inset-0 bg-gradient-to-r from-orange-500 to-red-600 rounded-full blur-xl opacity-20 animate-pulse" />
                    <div className="relative bg-gradient-to-r from-orange-500 to-red-600 p-4 rounded-full">
                      <Loader2 className="h-12 w-12 text-white animate-spin" />
                    </div>
                  </div>
                  <h3 className="text-xl font-semibold mb-2">Starting VNC Browser</h3>
                  <p className="text-gray-600 mb-4">
                    Initializing Docker container with Chromium browser...
                  </p>
                  <div className="text-sm text-gray-400">
                    <p>🐳 Starting Docker container</p>
                    <p>🖥️ Setting up VNC server</p>
                    <p>🌐 Launching Chromium browser</p>
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex items-center justify-center h-full text-gray-500">
                <div className="text-center max-w-md">
                  <div className="relative mb-6">
                    <div className="absolute inset-0 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full blur-xl opacity-20" />
                    <div className="relative bg-gradient-to-r from-blue-500 to-purple-600 p-4 rounded-full">
                      <Monitor className="h-12 w-12 text-white" />
                    </div>
                  </div>
                  <h3 className="text-xl font-semibold mb-2">VNC Browser Ready</h3>
                  <p className="text-gray-600 mb-4">
                    Click "Start Browser" to launch a containerized Chromium browser with VNC access.
                  </p>
                  <div className="text-sm text-gray-400 space-y-1">
                    <p>• Full desktop environment in browser</p>
                    <p>• Real-time mouse and keyboard control</p>
                    <p>• Isolated Docker container</p>
                    <p>• noVNC web-based access</p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
