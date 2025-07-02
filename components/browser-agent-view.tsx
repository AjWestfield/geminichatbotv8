'use client';

import React, { useRef, useEffect, useState, useCallback } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Globe,
  Loader2,
  AlertCircle,
  Play,
  X,
  Bot,
  Search,
  FileText,
  MousePointer,
  Type,
  ScrollText,
  ChevronLeft,
  ChevronRight,
  RotateCw,
  Home,
  Camera,
  Clock,
  CheckCircle2,
  Maximize2,
  Minimize2
} from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { useBrowserAgent } from '@/hooks/use-browser-agent';
import { BrowserAction } from '@/lib/services/browser-agent-service';

interface BrowserAgentViewProps {
  sessionId?: string;
  onSessionChange?: (sessionId: string | null) => void;
  className?: string;
  embedded?: boolean;
}

export function BrowserAgentView({
  sessionId: controlledSessionId,
  onSessionChange,
  className = '',
  embedded = false
}: BrowserAgentViewProps) {
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showActions, setShowActions] = useState(true);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const wsRef = useRef<WebSocket | null>(null);
  
  const browserAgent = useBrowserAgent({
    onSessionStart: (session) => {
      onSessionChange?.(session.id);
      connectToStream(session.id);
    },
    onSessionEnd: () => {
      onSessionChange?.(null);
      disconnectStream();
    }
  });

  // Connect to WebSocket stream
  const connectToStream = useCallback(async (sessionId: string) => {
    try {
      // Get WebSocket URL from API
      const response = await fetch('/api/browser-agent/session', {
        headers: { 'Upgrade': 'websocket' }
      });
      
      const { wsUrl } = await response.json();
      
      // Connect to WebSocket
      const ws = new WebSocket(`${wsUrl}?sessionId=${sessionId}`);
      
      ws.onopen = () => {
        console.log('[Browser Agent] WebSocket connected');
        ws.send(JSON.stringify({ type: 'start_stream', sessionId }));
      };
      
      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          
          if (data.type === 'frame' && data.data) {
            // Display frame on canvas
            if (canvasRef.current) {
              const ctx = canvasRef.current.getContext('2d');
              if (ctx) {
                const img = new Image();
                img.onload = () => {
                  canvasRef.current!.width = img.width;
                  canvasRef.current!.height = img.height;
                  ctx.drawImage(img, 0, 0);
                };
                img.src = `data:image/jpeg;base64,${data.data}`;
              }
            }
          }
        } catch (error) {
          console.error('[Browser Agent] Failed to process WebSocket message:', error);
        }
      };
      
      ws.onerror = (error) => {
        console.error('[Browser Agent] WebSocket error:', error);
      };
      
      ws.onclose = () => {
        console.log('[Browser Agent] WebSocket disconnected');
      };
      
      wsRef.current = ws;
    } catch (error) {
      console.error('[Browser Agent] Failed to connect to stream:', error);
    }
  }, []);

  // Disconnect WebSocket stream
  const disconnectStream = useCallback(() => {
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }
  }, []);

  // Handle canvas click for browser interaction
  const handleCanvasClick = useCallback((event: React.MouseEvent<HTMLCanvasElement>) => {
    if (!canvasRef.current || !browserAgent.session) return;
    
    const rect = canvasRef.current.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;
    
    // Send click coordinates to browser agent
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({
        type: 'interaction',
        action: 'click',
        x: Math.round(x),
        y: Math.round(y)
      }));
    }
  }, [browserAgent.session]);

  // Get action icon
  const getActionIcon = (action: BrowserAction) => {
    switch (action.type) {
      case 'navigate':
        return <Globe className="h-3 w-3" />;
      case 'click':
        return <MousePointer className="h-3 w-3" />;
      case 'type':
        return <Type className="h-3 w-3" />;
      case 'scroll':
        return <ScrollText className="h-3 w-3" />;
      case 'extract':
        return <FileText className="h-3 w-3" />;
      case 'wait':
        return <Clock className="h-3 w-3" />;
      default:
        return <Bot className="h-3 w-3" />;
    }
  };

  // Get action color
  const getActionColor = (action: BrowserAction) => {
    switch (action.type) {
      case 'navigate':
        return 'text-blue-400';
      case 'click':
        return 'text-green-400';
      case 'type':
        return 'text-yellow-400';
      case 'extract':
        return 'text-purple-400';
      default:
        return 'text-gray-400';
    }
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      disconnectStream();
    };
  }, [disconnectStream]);

  return (
    <Card className={cn(
      "flex flex-col bg-[#1A1A1A] border-[#333333] overflow-hidden",
      isFullscreen && "fixed inset-0 z-50 rounded-none",
      className
    )}>
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-[#333333]">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <Bot className="h-5 w-5 text-white" />
            <h3 className="font-semibold text-white">Browser Agent</h3>
          </div>
          <div className="flex items-center gap-2">
            <div className={cn(
              "w-2 h-2 rounded-full",
              browserAgent.isActive ? "bg-green-500 animate-pulse" : "bg-red-500"
            )} />
            <span className="text-xs text-[#B0B0B0]">
              {browserAgent.isActive ? 'Active' : 'Inactive'}
            </span>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          {browserAgent.isProcessing && (
            <Badge variant="default" className="bg-blue-600">
              <Loader2 className="h-3 w-3 mr-1 animate-spin" />
              Processing
            </Badge>
          )}
          
          <Button
            size="icon"
            variant="ghost"
            onClick={() => setShowActions(!showActions)}
            className="h-8 w-8"
          >
            {showActions ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
          </Button>
          
          {!embedded && (
            <Button
              size="icon"
              variant="ghost"
              onClick={() => setIsFullscreen(!isFullscreen)}
              className="h-8 w-8"
            >
              {isFullscreen ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
            </Button>
          )}
        </div>
      </div>
      
      {/* Main Content */}
      <div className="flex-1 flex min-h-0">
        {/* Browser View */}
        <div className="flex-1 relative bg-[#1E1E1E]">
          {!browserAgent.isActive ? (
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="text-center p-8">
                <div className="mx-auto h-16 w-16 rounded-2xl bg-[#2B2B2B] flex items-center justify-center mb-6">
                  <Bot className="h-8 w-8 text-white" />
                </div>
                <h3 className="text-xl font-semibold text-white mb-2">Browser Agent Ready</h3>
                <p className="text-[#B0B0B0] max-w-md mb-1">
                  Click the microscope button in the chat input to activate deep research mode
                </p>
                <p className="text-xs text-[#707070] max-w-md">
                  All your chat messages will be processed by the AI browser agent
                </p>
              </div>
            </div>
          ) : (
            <>
              {browserAgent.error && (
                <div className="absolute top-4 left-4 right-4 z-30">
                  <div className="flex items-center gap-2 p-3 bg-red-500/10 border border-red-500/20 rounded-lg">
                    <AlertCircle className="h-5 w-5 text-red-400" />
                    <p className="text-sm text-red-400">{browserAgent.error}</p>
                  </div>
                </div>
              )}
              
              {/* Browser Canvas */}
              <canvas
                ref={canvasRef}
                className="w-full h-full object-contain cursor-pointer"
                onClick={handleCanvasClick}
              />
            </>
          )}
        </div>
        
        {/* Actions Panel */}
        {browserAgent.isActive && showActions && (
          <div className="w-80 border-l border-[#333333] bg-[#1A1A1A] overflow-hidden flex flex-col">
            <div className="px-4 py-2 border-b border-[#333333]">
              <h4 className="font-medium text-white">Browser Actions</h4>
              <p className="text-xs text-[#B0B0B0] mt-1">
                {browserAgent.actions.length} action{browserAgent.actions.length !== 1 ? 's' : ''} performed
              </p>
            </div>
            
            <ScrollArea className="flex-1">
              <div className="p-4 space-y-2">
                {browserAgent.actions.map((action, index) => (
                  <div
                    key={index}
                    className="p-3 bg-[#2B2B2B] rounded-lg border border-[#333333] hover:border-[#444444] transition-colors"
                  >
                    <div className="flex items-start gap-2">
                      <div className={cn("mt-1", getActionColor(action))}>
                        {getActionIcon(action)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium text-white capitalize mb-1">
                          {action.type}
                        </p>
                        <p className="text-xs text-[#B0B0B0] break-words">
                          {action.description}
                        </p>
                        {action.target && (
                          <p className="text-xs text-[#707070] mt-1 font-mono">
                            Target: {action.target}
                          </p>
                        )}
                        {action.value && (
                          <p className="text-xs text-[#707070] mt-1 font-mono">
                            Value: {action.value}
                          </p>
                        )}
                      </div>
                      <CheckCircle2 className="h-3 w-3 text-green-500 mt-1 flex-shrink-0" />
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </div>
        )}
      </div>
    </Card>
  );
}