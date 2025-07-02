import { chromium, Browser, BrowserContext, Page, ElementHandle } from 'playwright';
import { EventEmitter } from 'events';
import crypto from 'crypto';

export interface BrowserSession {
  id: string;
  browser: Browser;
  context: BrowserContext;
  page: Page;
  url: string;
  title: string;
  createdAt: Date;
  lastActivity: Date;
}

export interface BrowserOptions {
  headless?: boolean;
  viewport?: { width: number; height: number };
  userAgent?: string;
  recordVideo?: boolean;
  proxy?: {
    server: string;
    username?: string;
    password?: string;
  };
}

export interface PageContent {
  url: string;
  title: string;
  html: string;
  text: string;
  screenshot?: string;
  metadata?: Record<string, any>;
}

export interface ClickOptions {
  selector: string;
  position?: { x: number; y: number };
  button?: 'left' | 'right' | 'middle';
  clickCount?: number;
}

export interface TypeOptions {
  selector: string;
  text: string;
  delay?: number;
  clear?: boolean;
}

export interface ExtractOptions {
  selector?: string;
  script?: string;
  returnHtml?: boolean;
}

export class PlaywrightBrowserService extends EventEmitter {
  private sessions: Map<string, BrowserSession> = new Map();
  private screenshotInterval: Map<string, NodeJS.Timer> = new Map();

  constructor() {
    super();
    // Cleanup inactive sessions periodically
    setInterval(() => this.cleanupInactiveSessions(), 60000); // Every minute
  }

  async createSession(options: BrowserOptions = {}): Promise<BrowserSession> {
    const sessionId = crypto.randomBytes(16).toString('hex');
    
    try {
      // Launch browser
      const browser = await chromium.launch({
        headless: options.headless ?? true,
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
          '--disable-accelerated-2d-canvas',
          '--no-first-run',
          '--no-zygote',
          '--disable-gpu'
        ],
        ...(options.proxy && {
          proxy: {
            server: options.proxy.server,
            username: options.proxy.username,
            password: options.proxy.password
          }
        })
      });

      // Create context with options
      const context = await browser.newContext({
        viewport: options.viewport || { width: 1280, height: 720 },
        userAgent: options.userAgent,
        ...(options.recordVideo && {
          recordVideo: {
            dir: './recordings',
            size: options.viewport || { width: 1280, height: 720 }
          }
        })
      });

      // Create page
      const page = await context.newPage();

      // Set up event listeners
      page.on('load', () => {
        this.emit('navigation', sessionId, {
          url: page.url(),
          title: page.title()
        });
      });

      page.on('console', msg => {
        this.emit('console', sessionId, {
          type: msg.type(),
          text: msg.text()
        });
      });

      page.on('pageerror', error => {
        this.emit('error', sessionId, {
          error: error.message
        });
      });

      const session: BrowserSession = {
        id: sessionId,
        browser,
        context,
        page,
        url: 'about:blank',
        title: 'New Session',
        createdAt: new Date(),
        lastActivity: new Date()
      };

      this.sessions.set(sessionId, session);
      
      this.emit('session-created', sessionId, session);
      
      return session;
    } catch (error) {
      this.emit('error', sessionId, { error: error instanceof Error ? error.message : 'Failed to create session' });
      throw error;
    }
  }

  async navigateTo(sessionId: string, url: string): Promise<PageContent> {
    const session = this.sessions.get(sessionId);
    if (!session) {
      throw new Error('Session not found');
    }

    try {
      session.lastActivity = new Date();
      
      // Navigate to URL
      await session.page.goto(url, {
        waitUntil: 'networkidle',
        timeout: 30000
      });

      // Update session info
      session.url = session.page.url();
      session.title = await session.page.title();

      // Get page content
      const html = await session.page.content();
      const text = await session.page.evaluate(() => document.body.innerText);
      const screenshot = await this.takeScreenshot(sessionId);

      const content: PageContent = {
        url: session.url,
        title: session.title,
        html,
        text,
        screenshot,
        metadata: {
          timestamp: new Date().toISOString()
        }
      };

      this.emit('navigation-complete', sessionId, content);
      
      return content;
    } catch (error) {
      this.emit('error', sessionId, { error: error instanceof Error ? error.message : 'Navigation failed' });
      throw error;
    }
  }

  async takeScreenshot(sessionId: string): Promise<string> {
    const session = this.sessions.get(sessionId);
    if (!session) {
      throw new Error('Session not found');
    }

    try {
      session.lastActivity = new Date();
      
      const screenshotBuffer = await session.page.screenshot({
        type: 'jpeg',
        quality: 80,
        fullPage: false
      });

      const base64 = `data:image/jpeg;base64,${screenshotBuffer.toString('base64')}`;
      
      this.emit('screenshot', sessionId, { screenshot: base64 });
      
      return base64;
    } catch (error) {
      this.emit('error', sessionId, { error: error instanceof Error ? error.message : 'Screenshot failed' });
      throw error;
    }
  }

  async click(sessionId: string, options: ClickOptions): Promise<void> {
    const session = this.sessions.get(sessionId);
    if (!session) {
      throw new Error('Session not found');
    }

    try {
      session.lastActivity = new Date();
      
      if (options.position) {
        // Click at specific coordinates
        await session.page.mouse.click(options.position.x, options.position.y, {
          button: options.button,
          clickCount: options.clickCount
        });
      } else if (options.selector) {
        // Click on element
        await session.page.click(options.selector, {
          button: options.button,
          clickCount: options.clickCount
        });
      }

      this.emit('interaction', sessionId, { type: 'click', options });
    } catch (error) {
      this.emit('error', sessionId, { error: error instanceof Error ? error.message : 'Click failed' });
      throw error;
    }
  }

  async type(sessionId: string, options: TypeOptions): Promise<void> {
    const session = this.sessions.get(sessionId);
    if (!session) {
      throw new Error('Session not found');
    }

    try {
      session.lastActivity = new Date();
      
      if (options.clear) {
        await session.page.fill(options.selector, options.text);
      } else {
        await session.page.type(options.selector, options.text, {
          delay: options.delay
        });
      }

      this.emit('interaction', sessionId, { type: 'type', options });
    } catch (error) {
      this.emit('error', sessionId, { error: error instanceof Error ? error.message : 'Type failed' });
      throw error;
    }
  }

  async scroll(sessionId: string, deltaX: number, deltaY: number): Promise<void> {
    const session = this.sessions.get(sessionId);
    if (!session) {
      throw new Error('Session not found');
    }

    try {
      session.lastActivity = new Date();
      
      await session.page.mouse.wheel(deltaX, deltaY);
      
      this.emit('interaction', sessionId, { type: 'scroll', deltaX, deltaY });
    } catch (error) {
      this.emit('error', sessionId, { error: error instanceof Error ? error.message : 'Scroll failed' });
      throw error;
    }
  }

  async goBack(sessionId: string): Promise<void> {
    const session = this.sessions.get(sessionId);
    if (!session) {
      throw new Error('Session not found');
    }

    try {
      session.lastActivity = new Date();
      await session.page.goBack();
      session.url = session.page.url();
      session.title = await session.page.title();
    } catch (error) {
      this.emit('error', sessionId, { error: error instanceof Error ? error.message : 'Go back failed' });
      throw error;
    }
  }

  async goForward(sessionId: string): Promise<void> {
    const session = this.sessions.get(sessionId);
    if (!session) {
      throw new Error('Session not found');
    }

    try {
      session.lastActivity = new Date();
      await session.page.goForward();
      session.url = session.page.url();
      session.title = await session.page.title();
    } catch (error) {
      this.emit('error', sessionId, { error: error instanceof Error ? error.message : 'Go forward failed' });
      throw error;
    }
  }

  async reload(sessionId: string): Promise<void> {
    const session = this.sessions.get(sessionId);
    if (!session) {
      throw new Error('Session not found');
    }

    try {
      session.lastActivity = new Date();
      await session.page.reload();
    } catch (error) {
      this.emit('error', sessionId, { error: error instanceof Error ? error.message : 'Reload failed' });
      throw error;
    }
  }

  async extract(sessionId: string, options: ExtractOptions): Promise<any> {
    const session = this.sessions.get(sessionId);
    if (!session) {
      throw new Error('Session not found');
    }

    try {
      session.lastActivity = new Date();
      
      let result: any;
      
      if (options.script) {
        // Execute custom script
        result = await session.page.evaluate(options.script);
      } else if (options.selector) {
        // Extract from selector
        const element = await session.page.$(options.selector);
        if (!element) {
          throw new Error(`Element not found: ${options.selector}`);
        }
        
        if (options.returnHtml) {
          result = await element.innerHTML();
        } else {
          result = await element.textContent();
        }
      } else {
        // Extract page info
        result = await session.page.evaluate(() => ({
          title: document.title,
          url: window.location.href,
          links: Array.from(document.querySelectorAll('a')).map(a => ({
            text: a.textContent,
            href: a.href
          })),
          images: Array.from(document.querySelectorAll('img')).map(img => ({
            src: img.src,
            alt: img.alt
          }))
        }));
      }

      return result;
    } catch (error) {
      this.emit('error', sessionId, { error: error instanceof Error ? error.message : 'Extract failed' });
      throw error;
    }
  }

  async startScreenshotStream(sessionId: string, intervalMs: number = 1000): Promise<void> {
    const session = this.sessions.get(sessionId);
    if (!session) {
      throw new Error('Session not found');
    }

    // Stop existing stream if any
    this.stopScreenshotStream(sessionId);

    // Start new stream
    const interval = setInterval(async () => {
      try {
        await this.takeScreenshot(sessionId);
      } catch (error) {
        console.error('Screenshot stream error:', error);
      }
    }, intervalMs);

    this.screenshotInterval.set(sessionId, interval);
    this.emit('stream-started', sessionId);
  }

  stopScreenshotStream(sessionId: string): void {
    const interval = this.screenshotInterval.get(sessionId);
    if (interval) {
      clearInterval(interval);
      this.screenshotInterval.delete(sessionId);
      this.emit('stream-stopped', sessionId);
    }
  }

  async closeSession(sessionId: string): Promise<void> {
    const session = this.sessions.get(sessionId);
    if (!session) {
      return;
    }

    try {
      // Stop screenshot stream
      this.stopScreenshotStream(sessionId);
      
      // Close browser
      await session.context.close();
      await session.browser.close();
      
      // Remove from sessions
      this.sessions.delete(sessionId);
      
      this.emit('session-closed', sessionId);
    } catch (error) {
      console.error('Error closing session:', error);
    }
  }

  getSession(sessionId: string): BrowserSession | undefined {
    return this.sessions.get(sessionId);
  }

  getAllSessions(): BrowserSession[] {
    return Array.from(this.sessions.values());
  }

  private async cleanupInactiveSessions(): Promise<void> {
    const now = new Date();
    const maxInactivity = 30 * 60 * 1000; // 30 minutes

    for (const [sessionId, session] of this.sessions) {
      const inactiveTime = now.getTime() - session.lastActivity.getTime();
      if (inactiveTime > maxInactivity) {
        console.log(`Cleaning up inactive session: ${sessionId}`);
        await this.closeSession(sessionId);
      }
    }
  }

  async destroy(): Promise<void> {
    // Close all sessions
    for (const sessionId of this.sessions.keys()) {
      await this.closeSession(sessionId);
    }
  }
}

// Singleton instance
let serviceInstance: PlaywrightBrowserService | null = null;

export function getPlaywrightBrowserService(): PlaywrightBrowserService {
  if (!serviceInstance) {
    serviceInstance = new PlaywrightBrowserService();
  }
  return serviceInstance;
}