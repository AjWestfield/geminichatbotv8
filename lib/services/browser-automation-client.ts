import { z } from 'zod';
import {
  WebAction,
  WebActionSchema,
  BrowserOptions,
  BrowserSession,
  PageContent,
  ExtractedData,
  ActionResult,
  TextHighlight,
  WebPageContext,
  WebViewSession
} from './browser-automation';

// Browser automation client that connects to the server API
export class BrowserAutomationClient {
  private baseUrl: string;
  private sessions: Map<string, BrowserSession> = new Map();
  private websockets: Map<string, WebSocket> = new Map();
  private wsUrl: string;

  constructor(baseUrl: string = '/api/browser/session') {
    this.baseUrl = baseUrl;
    // Use environment variable or default WebSocket URL
    this.wsUrl = typeof window !== 'undefined' 
      ? (window as any).__NEXT_PUBLIC_BROWSER_WS_URL || process.env.NEXT_PUBLIC_BROWSER_WS_URL || 'ws://localhost:8001'
      : 'ws://localhost:8001';
  }

  async createSession(options: BrowserOptions & { query?: string; enableStreaming?: boolean; llm?: string; embeddedMode?: boolean } = {}): Promise<BrowserSession> {
    // Extract browser session API specific options
    const { query, enableStreaming, llm, embeddedMode, ...browserOptions } = options;
    
    // If query is provided, use the new browser session API format
    if (query !== undefined) {
      const response = await fetch(this.baseUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          query,
          enableStreaming: enableStreaming !== false,
          llm: llm || 'claude-sonnet-4-20250514',
          embeddedMode: embeddedMode || false
        })
      });

      if (!response.ok) {
        const error = await response.text();
        throw new Error(`Failed to start browser session: ${error}`);
      }

      const data = await response.json();
      const session: BrowserSession = {
        id: data.sessionId,
        status: 'active',
        createdAt: new Date(),
        url: '',
        title: 'New Session',
        screenshot: null,
        embeddedMode: data.embeddedMode
      };
      
      this.sessions.set(session.id, session);
      
      // Only start WebSocket connection if not in embedded mode
      if (!data.embeddedMode) {
        this.startWebSocketConnection(session.id);
      }
      
      return session;
    }
    
    // Otherwise use the original format
    const response = await fetch(this.baseUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'create', options: browserOptions })
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to create session');
    }

    const data = await response.json();
    if (!data.success || !data.session) {
      throw new Error('Invalid response from server');
    }
    
    const session = data.session;
    this.sessions.set(session.id, session);
    
    // Start WebSocket connection for real-time updates
    this.startWebSocketConnection(session.id);
    
    return session;
  }

  async navigateTo(sessionId: string, url: string): Promise<PageContent> {
    // Check if session is in embedded mode
    const session = this.sessions.get(sessionId);
    if (session?.embeddedMode) {
      // Return mock data for embedded mode
      const pageContent: PageContent = {
        url: url,
        title: 'Embedded Browser',
        html: '',
        text: '',
        screenshot: null
      };
      
      // Update local session
      session.url = url;
      session.title = pageContent.title;
      
      return pageContent;
    }
    
    const response = await fetch(this.baseUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'navigate', sessionId, url })
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to navigate');
    }

    const data = await response.json();
    if (!data.success || !data.content) {
      throw new Error('Invalid response from server');
    }
    
    const pageContent = data.content;
    
    // Update local session
    if (session) {
      session.url = pageContent.url || url;
      session.title = pageContent.title;
      session.screenshot = pageContent.screenshot;
    }
    
    return pageContent;
  }

  async extractContent(sessionId: string, selector: string): Promise<ExtractedData> {
    const response = await fetch(this.baseUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'extract', sessionId, selector })
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to extract content');
    }

    const result = await response.json();
    if (!result.success || !result.data) {
      throw new Error('Invalid response from server');
    }
    
    return result.data;
  }

  async performAction(sessionId: string, action: WebAction, params?: any): Promise<ActionResult> {
    const response = await fetch(this.baseUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action, sessionId, ...params })
    });

    if (!response.ok) {
      const error = await response.json();
      return { success: false, error: error.error || 'Action failed' };
    }

    const data = await response.json();
    
    // Handle success response
    if (data.success) {
      const result: ActionResult = { success: true };
      
      // Update screenshot if available
      if (data.screenshot) {
        const session = this.sessions.get(sessionId);
        if (session) {
          session.screenshot = data.screenshot;
        }
        result.screenshot = data.screenshot;
      }
      
      return result;
    }
    
    // Handle error response
    return { success: false, error: data.error || 'Action failed' };
  }

  async takeScreenshot(sessionId: string, fullPage = false): Promise<string> {
    const response = await fetch(this.baseUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'screenshot', sessionId, fullPage })
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to take screenshot');
    }

    const data = await response.json();
    if (!data.success || !data.screenshot) {
      throw new Error('Invalid response from server');
    }
    
    const screenshot = data.screenshot;
    
    // Update local session
    const session = this.sessions.get(sessionId);
    if (session) {
      session.screenshot = screenshot;
    }
    
    return screenshot;
  }

  async evaluateScript(sessionId: string, script: string): Promise<any> {
    const response = await fetch(this.baseUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'evaluate', sessionId, script })
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to evaluate script');
    }

    const data = await response.json();
    if (!data.success) {
      throw new Error(data.error || 'Script evaluation failed');
    }
    return data.result;
  }

  async closeSession(sessionId: string): Promise<void> {
    const session = this.sessions.get(sessionId);
    
    // Close WebSocket connection (if not embedded mode)
    if (!session?.embeddedMode) {
      const ws = this.websockets.get(sessionId);
      if (ws) {
        ws.close();
        this.websockets.delete(sessionId);
      }

      // Close session on server
      const response = await fetch(this.baseUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'close', sessionId })
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to close session');
      }
    }

    this.sessions.delete(sessionId);
  }

  getSession(sessionId: string): BrowserSession | undefined {
    return this.sessions.get(sessionId);
  }

  getAllSessions(): BrowserSession[] {
    return Array.from(this.sessions.values());
  }

  // Real-time WebSocket handling
  private startWebSocketConnection(sessionId: string): void {
    try {
      const ws = new WebSocket(this.wsUrl);
      
      ws.onopen = () => {
        console.log(`WebSocket connected for session ${sessionId}`);
        // Subscribe to session updates
        ws.send(JSON.stringify({
          type: 'subscribe',
          sessionId: sessionId
        }));
      };
      
      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          // Only handle events for this session
          if (data.sessionId === sessionId) {
            this.handleBrowserEvent(sessionId, data);
          }
        } catch (error) {
          console.error('Failed to parse WebSocket message:', error);
        }
      };

      ws.onerror = () => {
        // WebSocket onerror doesn't provide detailed error information
        console.log(`WebSocket connection failed for session ${sessionId}`);
      };
      
      ws.onclose = () => {
        console.log(`WebSocket disconnected for session ${sessionId}`);
        this.websockets.delete(sessionId);
        // Could implement reconnection logic here if needed
      };

      this.websockets.set(sessionId, ws);
    } catch (error) {
      console.error('Failed to create WebSocket connection:', error);
    }
  }

  private handleBrowserEvent(sessionId: string, event: any): void {
    const session = this.sessions.get(sessionId);
    if (!session) return;

    switch (event.type) {
      case 'navigation':
        session.url = event.url;
        session.title = event.title;
        this.notifyListeners('navigation', sessionId, event);
        break;
        
      case 'screenshot':
        session.screenshot = event.screenshot;
        this.notifyListeners('screenshot', sessionId, event);
        break;
        
      case 'session_closed':
        this.sessions.delete(sessionId);
        this.eventStreams.get(sessionId)?.close();
        this.eventStreams.delete(sessionId);
        this.notifyListeners('closed', sessionId, event);
        break;
        
      case 'error':
        this.notifyListeners('error', sessionId, event);
        break;
    }
  }

  // Event listener management
  private listeners: Map<string, Set<(sessionId: string, data: any) => void>> = new Map();

  on(event: string, callback: (sessionId: string, data: any) => void): void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event)!.add(callback);
  }

  off(event: string, callback: (sessionId: string, data: any) => void): void {
    this.listeners.get(event)?.delete(callback);
  }

  private notifyListeners(event: string, sessionId: string, data: any): void {
    this.listeners.get(event)?.forEach(callback => {
      try {
        callback(sessionId, data);
      } catch (error) {
        console.error(`Error in browser event listener:`, error);
      }
    });
  }

  // Utility methods
  async waitForSelector(sessionId: string, selector: string, timeout = 5000): Promise<boolean> {
    const startTime = Date.now();
    
    while (Date.now() - startTime < timeout) {
      try {
        const result = await this.extractContent(sessionId, selector);
        if (result.count > 0) return true;
      } catch {
        // Ignore errors, keep trying
      }
      
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    
    return false;
  }

  async fillForm(sessionId: string, formData: Record<string, string>): Promise<void> {
    for (const [selector, value] of Object.entries(formData)) {
      await this.performAction(sessionId, 'type', { selector, text: value });
      await new Promise(resolve => setTimeout(resolve, 100)); // Small delay between inputs
    }
  }

  async clickAndWait(sessionId: string, selector: string, waitForSelector?: string, timeout = 5000): Promise<void> {
    await this.performAction(sessionId, 'click', { selector });
    
    if (waitForSelector) {
      await this.waitForSelector(sessionId, waitForSelector, timeout);
    } else {
      await this.performAction(sessionId, 'wait', { timeout: 1000 });
    }
  }

  // Cleanup
  async cleanup(): Promise<void> {
    // Close all WebSocket connections
    for (const ws of this.websockets.values()) {
      ws.close();
    }
    this.websockets.clear();

    // Close all sessions
    for (const sessionId of this.sessions.keys()) {
      try {
        await this.closeSession(sessionId);
      } catch (error) {
        console.error(`Failed to close session ${sessionId}:`, error);
      }
    }
    this.sessions.clear();
  }
}

// Singleton instance for client-side use
let clientInstance: BrowserAutomationClient | null = null;

export function getBrowserAutomationClient(): BrowserAutomationClient {
  if (!clientInstance) {
    clientInstance = new BrowserAutomationClient();
  }
  return clientInstance;
}