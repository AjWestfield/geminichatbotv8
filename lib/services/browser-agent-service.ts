import { EventEmitter } from 'events';
import { v4 as uuidv4 } from 'uuid';

export interface BrowserAction {
  type: 'navigate' | 'click' | 'type' | 'scroll' | 'screenshot' | 'extract' | 'wait';
  target?: string;
  value?: string;
  selector?: string;
  description: string;
  timestamp: number;
}

export interface BrowserAgentSession {
  id: string;
  status: 'idle' | 'processing' | 'completed' | 'error';
  currentUrl?: string;
  actions: BrowserAction[];
  result?: any;
  error?: string;
  startedAt: number;
  completedAt?: number;
}

export interface BrowserAgentCommand {
  query: string;
  sessionId: string;
  context?: any;
}

class BrowserAgentService extends EventEmitter {
  private sessions: Map<string, BrowserAgentSession> = new Map();
  private activeSessionId: string | null = null;

  createSession(): BrowserAgentSession {
    const session: BrowserAgentSession = {
      id: uuidv4(),
      status: 'idle',
      actions: [],
      startedAt: Date.now()
    };
    
    this.sessions.set(session.id, session);
    this.activeSessionId = session.id;
    
    // Store session ID for browser view to pick up
    if (typeof window !== 'undefined') {
      localStorage.setItem('browserAgentSessionId', session.id);
    }
    
    this.emit('session-created', session);
    return session;
  }

  async processCommand(command: BrowserAgentCommand): Promise<void> {
    const session = this.sessions.get(command.sessionId);
    if (!session) {
      throw new Error('Session not found');
    }

    session.status = 'processing';
    this.emit('session-updated', session);

    try {
      // Parse the natural language command
      const actions = await this.parseCommand(command.query);
      
      // Execute each action
      for (const action of actions) {
        session.actions.push(action);
        this.emit('action', { sessionId: session.id, action });
        
        // Execute the action and wait for completion
        await this.executeAction(session.id, action);
        
        // Add a small delay between actions for visibility
        await new Promise(resolve => setTimeout(resolve, 1000));
      }

      // Generate response based on actions
      const result = await this.generateResponse(session, command.query);
      
      session.status = 'completed';
      session.result = result;
      session.completedAt = Date.now();
      
      // Emit the result for the chat interface to display
      this.emit('session-completed', session);
      this.emit('response', { sessionId: session.id, response: result });
      
    } catch (error: any) {
      session.status = 'error';
      session.error = error.message;
      this.emit('session-error', session);
      throw error;
    }
  }

  private async parseCommand(query: string): Promise<BrowserAction[]> {
    const actions: BrowserAction[] = [];
    
    // Natural language parsing patterns
    const patterns = {
      search: /(?:search|find|look for|google)\s+(?:for\s+)?(.+?)(?:\s+on\s+(.+))?$/i,
      navigate: /(?:go to|navigate to|open|visit)\s+(.+)/i,
      click: /(?:click|press|tap)\s+(?:on\s+)?(?:the\s+)?(.+)/i,
      type: /(?:type|enter|input)\s+["'](.+?)["']\s+(?:in|into)\s+(.+)/i,
      extract: /(?:extract|get|find|show me)\s+(?:the\s+)?(.+?)(?:\s+from\s+(?:the\s+)?(.+))?/i,
      screenshot: /(?:take|capture)\s+(?:a\s+)?screenshot/i
    };

    // Check for search intent
    const searchMatch = query.match(patterns.search);
    if (searchMatch) {
      const searchQuery = searchMatch[1];
      const searchEngine = searchMatch[2] || 'google';
      
      actions.push({
        type: 'navigate',
        value: `https://www.google.com/search?q=${encodeURIComponent(searchQuery)}`,
        description: `Searching for "${searchQuery}" on Google`,
        timestamp: Date.now()
      });
      
      actions.push({
        type: 'wait',
        value: '2000',
        description: 'Waiting for search results to load',
        timestamp: Date.now()
      });
      
      return actions;
    }

    // Check for navigation
    const navMatch = query.match(patterns.navigate);
    if (navMatch) {
      let url = navMatch[1].trim();
      if (!url.startsWith('http')) {
        url = `https://${url}`;
      }
      
      actions.push({
        type: 'navigate',
        value: url,
        description: `Navigating to ${url}`,
        timestamp: Date.now()
      });
      
      return actions;
    }

    // Check for click action
    const clickMatch = query.match(patterns.click);
    if (clickMatch) {
      actions.push({
        type: 'click',
        target: clickMatch[1],
        description: `Clicking on "${clickMatch[1]}"`,
        timestamp: Date.now()
      });
      
      return actions;
    }

    // Default: treat as a search query
    actions.push({
      type: 'navigate',
      value: `https://www.google.com/search?q=${encodeURIComponent(query)}`,
      description: `Searching for "${query}"`,
      timestamp: Date.now()
    });
    
    actions.push({
      type: 'wait',
      value: '2000',
      description: 'Waiting for results',
      timestamp: Date.now()
    });
    
    actions.push({
      type: 'extract',
      target: 'search results',
      description: 'Extracting relevant information',
      timestamp: Date.now()
    });

    return actions;
  }

  private async executeAction(sessionId: string, action: BrowserAction): Promise<void> {
    // Send action to browser automation backend
    const response = await fetch('/api/browser-agent/execute', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sessionId, action })
    });

    if (!response.ok) {
      throw new Error('Failed to execute browser action');
    }

    // Emit progress update
    this.emit('action-completed', { sessionId, action });
  }

  private async generateResponse(session: BrowserAgentSession, query: string): Promise<string> {
    // Call AI to generate response based on browser actions
    const response = await fetch('/api/browser-agent/generate-response', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        sessionId: session.id,
        query,
        actions: session.actions,
        context: session.currentUrl
      })
    });

    if (!response.ok) {
      throw new Error('Failed to generate response');
    }

    const data = await response.json();
    return data.response;
  }

  getSession(sessionId: string): BrowserAgentSession | undefined {
    return this.sessions.get(sessionId);
  }

  getActiveSession(): BrowserAgentSession | undefined {
    return this.activeSessionId ? this.sessions.get(this.activeSessionId) : undefined;
  }

  closeSession(sessionId: string): void {
    const session = this.sessions.get(sessionId);
    if (session) {
      session.status = 'completed';
      session.completedAt = Date.now();
      this.emit('session-closed', session);
      
      if (this.activeSessionId === sessionId) {
        this.activeSessionId = null;
        // Clear session ID from localStorage
        if (typeof window !== 'undefined') {
          localStorage.removeItem('browserAgentSessionId');
        }
      }
    }
  }
}

export const browserAgentService = new BrowserAgentService();
