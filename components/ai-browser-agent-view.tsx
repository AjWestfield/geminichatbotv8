'use client';

import React, { useState, useCallback, useRef, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { VNCBrowserView } from './vnc-browser-view';
import { toast } from 'sonner';
import {
  Send,
  Bot,
  User,
  Monitor,
  Loader2,
  Play,
  Pause,
  Square,
  AlertCircle,
  CheckCircle2,
  Clock,
  MousePointer,
  Keyboard,
  Globe,
  FileText,
  Shield,
  Sparkles
} from 'lucide-react';

interface Message {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: Date;
  metadata?: {
    action?: string;
    status?: string;
    error?: string;
  };
}

interface BrowserSession {
  id: string;
  vncPort: number;
  vncPassword?: string;
  status: 'initializing' | 'ready' | 'running' | 'paused' | 'completed' | 'error';
  task?: string;
}

export function AIBrowserAgentView() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [currentSession, setCurrentSession] = useState<BrowserSession | null>(null);
  const [agentStatus, setAgentStatus] = useState<'idle' | 'thinking' | 'acting'>('idle');
  const [currentAction, setCurrentAction] = useState<string>('');
  const [takeoverMode, setTakeoverMode] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const wsRef = useRef<WebSocket | null>(null);

  // Auto-scroll to bottom
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Connect to WebSocket for real-time updates
  useEffect(() => {
    if (currentSession?.id) {
      const ws = new WebSocket(`ws://localhost:8003/ws/vnc/${currentSession.id}`);
      
      ws.onopen = () => {
        console.log('WebSocket connected');
        addSystemMessage('Connected to browser agent');
      };

      ws.onmessage = (event) => {
        const data = JSON.parse(event.data);
        handleWebSocketMessage(data);
      };

      ws.onerror = (error) => {
        console.error('WebSocket error:', error);
        addSystemMessage('Connection error', 'error');
      };

      ws.onclose = () => {
        console.log('WebSocket disconnected');
        addSystemMessage('Disconnected from browser agent');
      };

      wsRef.current = ws;

      return () => {
        ws.close();
      };
    }
  }, [currentSession?.id]);

  // Handle WebSocket messages
  const handleWebSocketMessage = (data: any) => {
    switch (data.type) {
      case 'action_result':
        if (data.result.success) {
          setCurrentAction(`Completed: ${data.result.action}`);
        } else {
          setCurrentAction(`Failed: ${data.result.error}`);
        }
        break;
      case 'agent_update':
        setAgentStatus(data.status);
        if (data.message) {
          addAssistantMessage(data.message);
        }
        break;
      case 'content':
        // Handle page content updates
        console.log('Page content updated:', data.content);
        break;
    }
  };

  // Add messages
  const addSystemMessage = (content: string, status?: string) => {
    const message: Message = {
      id: Date.now().toString(),
      role: 'system',
      content,
      timestamp: new Date(),
      metadata: { status }
    };
    setMessages(prev => [...prev, message]);
  };

  const addUserMessage = (content: string) => {
    const message: Message = {
      id: Date.now().toString(),
      role: 'user',
      content,
      timestamp: new Date()
    };
    setMessages(prev => [...prev, message]);
  };

  const addAssistantMessage = (content: string, metadata?: any) => {
    const message: Message = {
      id: Date.now().toString(),
      role: 'assistant',
      content,
      timestamp: new Date(),
      metadata
    };
    setMessages(prev => [...prev, message]);
  };

  // Create browser session
  const createBrowserSession = async (task: string) => {
    try {
      setIsLoading(true);
      addSystemMessage('Creating browser session...');

      const response = await fetch('http://localhost:8003/api/vnc-browser/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          task,
          enable_recording: true,
          resolution: '1280x720'
        })
      });

      if (!response.ok) {
        throw new Error('Failed to create browser session');
      }

      const data = await response.json();
      
      setCurrentSession({
        id: data.session_id,
        vncPort: data.vnc_port,
        vncPassword: data.vnc_password,
        status: 'ready',
        task
      });

      addSystemMessage('Browser session created successfully');
      toast.success('Browser agent ready');

      // Start the AI agent
      await startAIAgent(data.session_id, task);
      
    } catch (error) {
      console.error('Error creating session:', error);
      addSystemMessage('Failed to create browser session', 'error');
      toast.error('Failed to start browser agent');
    } finally {
      setIsLoading(false);
    }
  };

  // Start AI agent
  const startAIAgent = async (sessionId: string, task: string) => {
    try {
      setAgentStatus('thinking');
      addAssistantMessage(`I'll help you with: "${task}". Let me start by opening a browser...`);

      // Call your AI backend to start the agent
      const response = await fetch('/api/browser-agent/execute', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId,
          task,
          model: 'gpt-4o' // or your preferred model
        })
      });

      if (!response.ok) {
        throw new Error('Failed to start AI agent');
      }

      const reader = response.body?.getReader();
      if (!reader) return;

      // Stream the response
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const text = new TextDecoder().decode(value);
        const lines = text.split('\n').filter(line => line.trim());
        
        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const data = JSON.parse(line.slice(6));
              handleAgentUpdate(data);
            } catch (e) {
              console.error('Failed to parse SSE data:', e);
            }
          }
        }
      }

      setAgentStatus('idle');
      addSystemMessage('Task completed');
      
    } catch (error) {
      console.error('Error starting AI agent:', error);
      setAgentStatus('idle');
      addSystemMessage('AI agent encountered an error', 'error');
    }
  };

  // Handle agent updates
  const handleAgentUpdate = (data: any) => {
    switch (data.type) {
      case 'thinking':
        setAgentStatus('thinking');
        setCurrentAction(data.thought || 'Analyzing...');
        break;
      case 'action':
        setAgentStatus('acting');
        setCurrentAction(data.description || 'Performing action...');
        if (wsRef.current) {
          wsRef.current.send(JSON.stringify({
            type: 'action',
            action: data.action
          }));
        }
        break;
      case 'observation':
        addAssistantMessage(data.content, { action: 'observation' });
        break;
      case 'result':
        addAssistantMessage(data.content, { action: 'result' });
        break;
      case 'error':
        addSystemMessage(data.message, 'error');
        break;
    }
  };

  // Handle user input
  const handleSubmit = async () => {
    if (!input.trim()) return;

    const userTask = input.trim();
    setInput('');
    addUserMessage(userTask);

    if (!currentSession) {
      // Create new session
      await createBrowserSession(userTask);
    } else {
      // Send to existing session
      addAssistantMessage(`I'll help you with: "${userTask}"`);
      await startAIAgent(currentSession.id, userTask);
    }
  };

  // Control functions
  const pauseAgent = () => {
    if (wsRef.current && currentSession) {
      wsRef.current.send(JSON.stringify({ type: 'pause' }));
      setCurrentSession(prev => prev ? { ...prev, status: 'paused' } : null);
      addSystemMessage('Agent paused');
    }
  };

  const resumeAgent = () => {
    if (wsRef.current && currentSession) {
      wsRef.current.send(JSON.stringify({ type: 'resume' }));
      setCurrentSession(prev => prev ? { ...prev, status: 'running' } : null);
      addSystemMessage('Agent resumed');
    }
  };

  const stopAgent = async () => {
    if (currentSession) {
      try {
        await fetch(`http://localhost:8003/api/vnc-browser/session/${currentSession.id}`, {
          method: 'DELETE'
        });
        setCurrentSession(null);
        setAgentStatus('idle');
        addSystemMessage('Browser session ended');
      } catch (error) {
        console.error('Error stopping session:', error);
      }
    }
  };

  // Takeover request handler
  const handleTakeoverRequest = () => {
    setTakeoverMode(true);
    addSystemMessage('Manual control activated - You now control the browser', 'warning');
  };

  return (
    <div className="flex h-full gap-4">
      {/* Chat Panel */}
      <Card className="flex-1 flex flex-col max-w-md">
        <CardHeader className="flex-shrink-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Bot className="h-5 w-5" />
              <CardTitle>AI Browser Agent</CardTitle>
            </div>
            <Badge variant={agentStatus === 'idle' ? 'secondary' : 'default'}>
              {agentStatus === 'thinking' ? 'Thinking...' : 
               agentStatus === 'acting' ? 'Acting...' : 'Ready'}
            </Badge>
          </div>
        </CardHeader>

        <CardContent className="flex-1 flex flex-col p-4 gap-4">
          {/* Messages */}
          <ScrollArea className="flex-1">
            <div className="space-y-3 pr-4">
              {messages.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Monitor className="h-12 w-12 mx-auto mb-3 opacity-50" />
                  <p className="text-sm">Start a conversation to launch the browser agent</p>
                  <p className="text-xs mt-2">The AI will control a real browser to complete your tasks</p>
                </div>
              ) : (
                messages.map((message) => (
                  <div
                    key={message.id}
                    className={`flex gap-3 ${
                      message.role === 'user' ? 'justify-end' : 'justify-start'
                    }`}
                  >
                    {message.role !== 'user' && (
                      <div className="flex-shrink-0">
                        {message.role === 'assistant' ? (
                          <Bot className="h-6 w-6 text-blue-500" />
                        ) : (
                          <AlertCircle className={`h-6 w-6 ${
                            message.metadata?.status === 'error' ? 'text-red-500' : 
                            message.metadata?.status === 'warning' ? 'text-yellow-500' : 
                            'text-gray-500'
                          }`} />
                        )}
                      </div>
                    )}
                    
                    <div className={`flex flex-col gap-1 max-w-[80%] ${
                      message.role === 'user' ? 'items-end' : 'items-start'
                    }`}>
                      <div className={`rounded-lg px-3 py-2 ${
                        message.role === 'user' 
                          ? 'bg-primary text-primary-foreground' 
                          : message.role === 'system'
                          ? 'bg-muted text-muted-foreground text-sm'
                          : 'bg-secondary'
                      }`}>
                        {message.content}
                      </div>
                      <span className="text-xs text-muted-foreground">
                        {message.timestamp.toLocaleTimeString()}
                      </span>
                    </div>

                    {message.role === 'user' && (
                      <div className="flex-shrink-0">
                        <User className="h-6 w-6" />
                      </div>
                    )}
                  </div>
                ))
              )}
              <div ref={messagesEndRef} />
            </div>
          </ScrollArea>

          {/* Current Action */}
          {currentAction && (
            <Alert className="py-2">
              <Sparkles className="h-4 w-4" />
              <AlertDescription className="text-sm">
                {currentAction}
              </AlertDescription>
            </Alert>
          )}

          {/* Controls */}
          {currentSession && currentSession.status !== 'completed' && (
            <div className="flex gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={currentSession.status === 'paused' ? resumeAgent : pauseAgent}
                disabled={currentSession.status === 'initializing'}
              >
                {currentSession.status === 'paused' ? (
                  <>
                    <Play className="h-4 w-4 mr-1" />
                    Resume
                  </>
                ) : (
                  <>
                    <Pause className="h-4 w-4 mr-1" />
                    Pause
                  </>
                )}
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={stopAgent}
              >
                <Square className="h-4 w-4 mr-1" />
                Stop
              </Button>
            </div>
          )}

          {/* Input */}
          <div className="flex gap-2">
            <Textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSubmit();
                }
              }}
              placeholder="Ask the AI to browse the web for you..."
              className="min-h-[80px] resize-none"
              disabled={isLoading || (currentSession && currentSession.status === 'running')}
            />
            <Button
              onClick={handleSubmit}
              disabled={!input.trim() || isLoading || (currentSession && currentSession.status === 'running')}
              className="self-end"
            >
              {isLoading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Send className="h-4 w-4" />
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Browser View */}
      <div className="flex-1">
        {currentSession ? (
          <VNCBrowserView
            sessionId={currentSession.id}
            vncPort={currentSession.vncPort}
            vncPassword={currentSession.vncPassword}
            onTakeoverRequest={handleTakeoverRequest}
            className="h-full"
          />
        ) : (
          <Card className="h-full flex items-center justify-center">
            <div className="text-center max-w-md">
              <div className="relative mb-6">
                <div className="absolute inset-0 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full blur-xl opacity-20 animate-pulse" />
                <div className="relative bg-gradient-to-r from-blue-500 to-purple-600 p-6 rounded-full">
                  <Monitor className="h-16 w-16 text-white" />
                </div>
              </div>
              <h3 className="text-2xl font-semibold mb-3">AI Browser Agent</h3>
              <p className="text-muted-foreground mb-6">
                I can browse the web for you, fill forms, extract information, and complete complex tasks.
                Just tell me what you need!
              </p>
              <div className="text-sm text-muted-foreground space-y-2">
                <div className="flex items-center gap-2 justify-center">
                  <Globe className="h-4 w-4" />
                  <span>Research and gather information</span>
                </div>
                <div className="flex items-center gap-2 justify-center">
                  <MousePointer className="h-4 w-4" />
                  <span>Navigate and interact with websites</span>
                </div>
                <div className="flex items-center gap-2 justify-center">
                  <FileText className="h-4 w-4" />
                  <span>Extract and analyze content</span>
                </div>
                <div className="flex items-center gap-2 justify-center">
                  <Shield className="h-4 w-4" />
                  <span>Secure takeover mode for sensitive tasks</span>
                </div>
              </div>
            </div>
          </Card>
        )}
      </div>
    </div>
  );
}