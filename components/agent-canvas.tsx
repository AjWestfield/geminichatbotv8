'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Brain, 
  Send, 
  Loader2, 
  AlertCircle, 
  CheckCircle2,
  Monitor,
  StopCircle,
  Download,
  Maximize2,
  Copy,
  ExternalLink
} from 'lucide-react';
import { toast } from 'sonner';
import { getBrowserAgentService, BrowserAgentScreenshot, BrowserAgentProgress, BrowserAgentResult } from '@/lib/services/browser-agent-service';
import { LiveBrowserViewEnhanced } from './live-browser-view';

interface AgentCanvasProps {
  query: string;
  onClose: () => void;
}

interface ResearchLog {
  timestamp: string;
  type: 'info' | 'progress' | 'error' | 'success' | 'screenshot';
  message: string;
  data?: any;
}

export function AgentCanvas({ query, onClose }: AgentCanvasProps) {
  const [agentInstructions, setAgentInstructions] = useState('');
  const [isConnecting, setIsConnecting] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [isResearching, setIsResearching] = useState(false);
  const [currentScreenshot, setCurrentScreenshot] = useState<BrowserAgentScreenshot | null>(null);
  const [researchLogs, setResearchLogs] = useState<ResearchLog[]>([]);
  const [researchResult, setResearchResult] = useState<BrowserAgentResult | null>(null);
  const [selectedLLM, setSelectedLLM] = useState('claude-sonnet-4');
  const [progress, setProgress] = useState(0);
  const [screenshotHistory, setScreenshotHistory] = useState<BrowserAgentScreenshot[]>([]);
  const [sessionId, setSessionId] = useState<string | null>(null);
  
  const browserAgent = useRef(getBrowserAgentService());
  const logsEndRef = useRef<HTMLDivElement>(null);

  // Initialize with the research query
  useEffect(() => {
    setAgentInstructions(`Research the following topic thoroughly:\n\n${query}\n\nProvide comprehensive information including:\n- Key facts and concepts\n- Recent developments\n- Multiple perspectives\n- Reliable sources`);
  }, [query]);

  // Auto-scroll logs
  useEffect(() => {
    logsEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [researchLogs]);

  // Add log entry
  const addLog = useCallback((type: ResearchLog['type'], message: string, data?: any) => {
    setResearchLogs(prev => [...prev, {
      timestamp: new Date().toISOString(),
      type,
      message,
      data
    }]);
  }, []);

  // Setup browser agent event listeners
  useEffect(() => {
    const agent = browserAgent.current;

    const handleConnected = (data: any) => {
      setIsConnected(true);
      setIsConnecting(false);
      addLog('success', 'Connected to browser agent service', data);
    };

    const handleScreenshot = (screenshot: BrowserAgentScreenshot) => {
      setCurrentScreenshot(screenshot);
      setScreenshotHistory(prev => [...prev, screenshot]);
      addLog('screenshot', `Captured screenshot from ${screenshot.url}`, screenshot);
      
      // Update progress based on screenshots
      setProgress(prev => Math.min(prev + 10, 90));
    };

    const handleProgress = (progress: BrowserAgentProgress) => {
      addLog('progress', progress.message, progress);
    };

    const handleResearchStarted = (data: any) => {
      setIsResearching(true);
      addLog('info', data.message, data);
      setProgress(10);
    };

    const handleResearchCompleted = (result: BrowserAgentResult) => {
      setIsResearching(false);
      setResearchResult(result);
      addLog('success', 'Research completed successfully', result);
      setProgress(100);
      toast.success('Research completed!');
    };

    const handleError = (error: any) => {
      addLog('error', error.message || 'An error occurred', error);
      setIsResearching(false);
      toast.error(error.message || 'Research failed');
    };

    const handleAgentInitialized = (data: any) => {
      addLog('info', `Browser agent initialized with ${data.llm}`, data);
    };

    // Subscribe to events
    agent.on('connected', handleConnected);
    agent.on('screenshot', handleScreenshot);
    agent.on('progress', handleProgress);
    agent.on('research_started', handleResearchStarted);
    agent.on('research_completed', handleResearchCompleted);
    agent.on('error', handleError);
    agent.on('agent_initialized', handleAgentInitialized);

    // Connect to service
    connectToAgent();

    // Cleanup
    return () => {
      agent.off('connected', handleConnected);
      agent.off('screenshot', handleScreenshot);
      agent.off('progress', handleProgress);
      agent.off('research_started', handleResearchStarted);
      agent.off('research_completed', handleResearchCompleted);
      agent.off('error', handleError);
      agent.off('agent_initialized', handleAgentInitialized);
    };
  }, [addLog]);

  const connectToAgent = async () => {
    setIsConnecting(true);
    try {
      await browserAgent.current.connect();
    } catch (error) {
      console.error('Failed to connect to browser agent:', error);
      addLog('error', 'Failed to connect to browser agent service. Make sure the Python service is running.');
      setIsConnecting(false);
      
      toast.error('Failed to connect to browser agent', {
        description: 'Please ensure the browser agent service is running with: python browser_agent_service.py',
        duration: 10000
      });
    }
  };

  const handleStartResearch = async () => {
    if (!isConnected) {
      toast.error('Not connected to browser agent service');
      return;
    }

    try {
      setProgress(0);
      setResearchResult(null);
      setScreenshotHistory([]);
      
      // Start browser session with streaming
      const response = await fetch('/api/browser/session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          query: agentInstructions || query,
          enableStreaming: true,
          llm: selectedLLM || 'claude-sonnet-4-20250514'
        })
      });
      
      if (!response.ok) {
        throw new Error('Failed to start browser session');
      }
      
      const { sessionId: newSessionId } = await response.json();
      setSessionId(newSessionId);
      
      // Start research via the browser agent
      await browserAgent.current.startResearch(agentInstructions, selectedLLM);
      
      addLog('info', `Started browser session: ${newSessionId}`);
      toast.success('Research started with live browser streaming');
    } catch (error) {
      console.error('Failed to start research:', error);
      toast.error('Failed to start research');
    }
  };

  const handleStopResearch = async () => {
    try {
      await browserAgent.current.stopResearch();
      setIsResearching(false);
      addLog('info', 'Research stopped by user');
    } catch (error) {
      console.error('Failed to stop research:', error);
    }
  };

  const exportResearch = () => {
    if (!researchResult) return;

    const markdown = `# Research Report

**Query:** ${query}

**Date:** ${new Date().toLocaleString()}

## Results

${researchResult.result}

## Research Process

${researchLogs
  .filter(log => log.type !== 'screenshot')
  .map(log => `- [${new Date(log.timestamp).toLocaleTimeString()}] ${log.message}`)
  .join('\n')}

## Screenshots Captured

${screenshotHistory.length} screenshots were captured during the research process.
`;

    const blob = new Blob([markdown], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `research-${Date.now()}.md`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="flex h-full gap-4 p-4">
      {/* Browser View */}
      <div className="flex-1 flex flex-col">
        <Card className="flex-1 flex flex-col overflow-hidden">
          <div className="flex items-center justify-between p-4 border-b">
            <div className="flex items-center gap-2">
              <Monitor className="h-5 w-5" />
              <h3 className="font-semibold">Browser View</h3>
              {currentScreenshot && (
                <Badge variant="secondary" className="text-xs">
                  {currentScreenshot.title}
                </Badge>
              )}
            </div>
            {currentScreenshot && (
              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => window.open(currentScreenshot.url, '_blank')}
                >
                  <ExternalLink className="h-4 w-4" />
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => {
                    // TODO: Implement fullscreen view
                  }}
                >
                  <Maximize2 className="h-4 w-4" />
                </Button>
              </div>
            )}
          </div>
          
          <div className="flex-1 relative bg-black">
            {/* Use enhanced live browser view when session is active */}
            {sessionId ? (
              <LiveBrowserViewEnhanced
                sessionId={sessionId}
                onSessionChange={setSessionId}
                browserAgentUrl="localhost:8002"
              />
            ) : currentScreenshot ? (
              <img 
                src={`data:image/png;base64,${currentScreenshot.image}`}
                alt="Browser screenshot"
                className="w-full h-full object-contain"
              />
            ) : (
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="text-center text-muted-foreground">
                  <Monitor className="h-16 w-16 mx-auto mb-4 opacity-50" />
                  <p>Browser view will appear here during research</p>
                </div>
              </div>
            )}
          </div>
          
          {isResearching && (
            <div className="p-3 border-t">
              <Progress value={progress} className="h-2" />
              <p className="text-xs text-muted-foreground mt-1">
                Research in progress... {progress}%
              </p>
            </div>
          )}
        </Card>
      </div>

      {/* Control Panel */}
      <div className="w-[480px] flex flex-col gap-4">
        {/* Instructions */}
        <Card className="p-4">
          <div className="flex items-center gap-2 mb-3">
            <Brain className="h-5 w-5" />
            <h3 className="font-semibold">Research Instructions</h3>
          </div>
          
          <Textarea
            value={agentInstructions}
            onChange={(e) => setAgentInstructions(e.target.value)}
            placeholder="Describe what the agent should research..."
            className="min-h-[120px] mb-3"
            disabled={isResearching}
          />
          
          <div className="flex items-center gap-2 mb-3">
            <label className="text-sm font-medium">AI Model:</label>
            <select
              value={selectedLLM}
              onChange={(e) => setSelectedLLM(e.target.value)}
              className="flex-1 px-3 py-1 rounded-md border bg-background"
              disabled={isResearching}
            >
              <option value="claude-sonnet-4">Claude Sonnet 4 (Recommended)</option>
              <option value="gpt-4">GPT-4</option>
              <option value="claude-3">Claude 3</option>
            </select>
          </div>
          
          <div className="flex gap-2">
            {!isResearching ? (
              <Button 
                className="flex-1" 
                onClick={handleStartResearch}
                disabled={!isConnected || !agentInstructions.trim()}
              >
                {isConnecting ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Connecting...
                  </>
                ) : (
                  <>
                    <Send className="h-4 w-4 mr-2" />
                    Start Research
                  </>
                )}
              </Button>
            ) : (
              <Button 
                className="flex-1" 
                variant="destructive"
                onClick={handleStopResearch}
              >
                <StopCircle className="h-4 w-4 mr-2" />
                Stop Research
              </Button>
            )}
            
            {researchResult && (
              <Button
                variant="outline"
                onClick={exportResearch}
              >
                <Download className="h-4 w-4" />
              </Button>
            )}
          </div>
          
          {!isConnected && !isConnecting && (
            <div className="mt-3 p-3 bg-yellow-50 dark:bg-yellow-950 rounded-lg">
              <p className="text-sm text-yellow-800 dark:text-yellow-200">
                Browser agent service is not running. Start it with:
              </p>
              <code className="block mt-1 p-2 bg-black/10 rounded text-xs">
                cd browser-agent && python browser_agent_service.py
              </code>
            </div>
          )}
        </Card>

        {/* Results/Logs */}
        <Card className="flex-1 flex flex-col overflow-hidden">
          <Tabs defaultValue="logs" className="flex-1 flex flex-col">
            <TabsList className="m-3 mb-0">
              <TabsTrigger value="logs">Activity Log</TabsTrigger>
              <TabsTrigger value="results">Results</TabsTrigger>
              <TabsTrigger value="screenshots">Screenshots</TabsTrigger>
            </TabsList>
            
            <TabsContent value="logs" className="flex-1 overflow-hidden m-0">
              <ScrollArea className="h-full px-3 py-2">
                <div className="space-y-2">
                  {researchLogs.map((log, index) => (
                    <div
                      key={index}
                      className={`flex items-start gap-2 text-sm ${
                        log.type === 'error' ? 'text-red-600 dark:text-red-400' :
                        log.type === 'success' ? 'text-green-600 dark:text-green-400' :
                        log.type === 'progress' ? 'text-blue-600 dark:text-blue-400' :
                        'text-muted-foreground'
                      }`}
                    >
                      <span className="text-xs opacity-50">
                        {new Date(log.timestamp).toLocaleTimeString()}
                      </span>
                      <span className="flex-1">{log.message}</span>
                    </div>
                  ))}
                  <div ref={logsEndRef} />
                </div>
              </ScrollArea>
            </TabsContent>
            
            <TabsContent value="results" className="flex-1 overflow-hidden m-0">
              <ScrollArea className="h-full px-3 py-2">
                {researchResult ? (
                  <div className="prose prose-sm dark:prose-invert max-w-none">
                    <pre className="whitespace-pre-wrap font-sans">
                      {typeof researchResult.result === 'string' 
                        ? researchResult.result 
                        : JSON.stringify(researchResult.result, null, 2)}
                    </pre>
                  </div>
                ) : (
                  <div className="text-center text-muted-foreground py-8">
                    <Brain className="h-12 w-12 mx-auto mb-2 opacity-50" />
                    <p>Research results will appear here</p>
                  </div>
                )}
              </ScrollArea>
            </TabsContent>
            
            <TabsContent value="screenshots" className="flex-1 overflow-hidden m-0">
              <ScrollArea className="h-full px-3 py-2">
                <div className="grid grid-cols-2 gap-2">
                  {screenshotHistory.map((screenshot, index) => (
                    <div
                      key={index}
                      className="border rounded-lg overflow-hidden cursor-pointer hover:ring-2 hover:ring-primary"
                      onClick={() => setCurrentScreenshot(screenshot)}
                    >
                      <img
                        src={`data:image/png;base64,${screenshot.image}`}
                        alt={`Screenshot ${index + 1}`}
                        className="w-full h-24 object-cover"
                      />
                      <div className="p-2 bg-muted">
                        <p className="text-xs truncate">{screenshot.title}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </TabsContent>
          </Tabs>
        </Card>
      </div>
    </div>
  );
}
