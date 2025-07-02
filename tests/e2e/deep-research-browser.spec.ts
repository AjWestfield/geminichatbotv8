import { test, expect, Page } from '@playwright/test';
import { spawn, ChildProcess } from 'child_process';
import * as path from 'path';

// Helper to wait for the browser-use backend to be ready
async function waitForBrowserUseBackend(maxAttempts = 30) {
  console.log('Waiting for browser-use backend to be ready...');
  
  for (let i = 0; i < maxAttempts; i++) {
    try {
      const response = await fetch('http://localhost:8002/health');
      if (response.ok) {
        console.log('✅ Browser-use backend is ready!');
        return true;
      }
    } catch (e) {
      // Service not ready yet
    }
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
  
  throw new Error('Browser-use backend failed to start after 30 seconds');
}

// Helper to start browser-use backend
function startBrowserUseBackend(): ChildProcess {
  console.log('Starting browser-use backend...');
  
  const scriptPath = path.join(process.cwd(), 'start-browser-use.sh');
  const browserAgentPath = path.join(process.cwd(), 'browser-agent');
  
  // Start the backend service
  const backend = spawn('bash', [scriptPath], {
    cwd: process.cwd(),
    env: { ...process.env },
    stdio: ['ignore', 'pipe', 'pipe']
  });
  
  // Log output for debugging
  backend.stdout?.on('data', (data) => {
    console.log(`[Backend]: ${data.toString().trim()}`);
  });
  
  backend.stderr?.on('data', (data) => {
    console.error(`[Backend Error]: ${data.toString().trim()}`);
  });
  
  return backend;
}

test.describe('Deep Research Browser Integration', () => {
  let backend: ChildProcess | null = null;
  
  test.beforeAll(async () => {
    // Check if backend is already running
    try {
      const response = await fetch('http://localhost:8002/health');
      if (response.ok) {
        console.log('Browser-use backend already running');
        return;
      }
    } catch (e) {
      // Backend not running, start it
      backend = startBrowserUseBackend();
      await waitForBrowserUseBackend();
    }
  });
  
  test.afterAll(async () => {
    // Clean up backend if we started it
    if (backend) {
      console.log('Stopping browser-use backend...');
      backend.kill('SIGTERM');
      // Give it time to cleanup
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
  });
  
  test('Deep Research button should activate browser view', async ({ page }) => {
    console.log('Starting Deep Research browser integration test...');
    
    // Go to the app
    await page.goto('/');
    
    // Wait for the app to load
    await page.waitForLoadState('networkidle');
    
    // Look for the Deep Research button (magnifying glass icon)
    const deepResearchButton = page.locator('button:has(svg.lucide-search)').first();
    await expect(deepResearchButton).toBeVisible({ timeout: 10000 });
    
    console.log('Found Deep Research button, clicking...');
    await deepResearchButton.click();
    
    // Wait for Deep Research mode to activate
    await page.waitForTimeout(1000);
    
    // Check if browser view tab appears
    const browserTab = page.locator('button:has-text("Browser")');
    await expect(browserTab).toBeVisible({ timeout: 5000 });
    
    console.log('Browser tab appeared, clicking to view...');
    await browserTab.click();
    
    // Verify browser view is displayed
    const browserView = page.locator('[data-testid="browser-view"], .browser-view, iframe, canvas').first();
    await expect(browserView).toBeVisible({ timeout: 10000 });
    
    console.log('✅ Browser view is displayed!');
  });  
  test('Deep Research should initiate browser-use session', async ({ page }) => {
    console.log('Testing browser-use session creation...');
    
    // Go to the app
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    
    // Activate Deep Research
    const deepResearchButton = page.locator('button:has(svg.lucide-search)').first();
    await deepResearchButton.click();
    
    // Wait for Deep Research panel
    await page.waitForTimeout(1000);
    
    // Type a research query
    const chatInput = page.locator('textarea[placeholder*="Message"], input[placeholder*="Message"]').first();
    await expect(chatInput).toBeVisible();
    
    const testQuery = 'What is browser-use Python library?';
    console.log(`Typing research query: "${testQuery}"`);
    await chatInput.fill(testQuery);
    
    // Submit the query
    const sendButton = page.locator('button[type="submit"], button:has-text("Send")').first();
    await sendButton.click();
    
    // Wait for browser-use to start
    console.log('Waiting for browser-use session to start...');
    
    // Check for browser activity indicators
    const activityIndicators = [
      page.locator('text=/searching/i'),
      page.locator('text=/browsing/i'),
      page.locator('text=/analyzing/i'),
      page.locator('.browser-status'),
      page.locator('[data-testid="browser-activity"]')
    ];
    
    // Wait for any activity indicator
    let foundActivity = false;
    for (const indicator of activityIndicators) {
      try {
        await indicator.waitFor({ timeout: 5000, state: 'visible' });
        foundActivity = true;
        console.log('✅ Browser activity detected!');
        break;
      } catch (e) {
        // Try next indicator
      }
    }
    
    expect(foundActivity).toBeTruthy();
  });
  
  test('Browser view should show real-time updates', async ({ page }) => {
    console.log('Testing real-time browser updates...');
    
    // Go to the app
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    
    // Activate Deep Research
    const deepResearchButton = page.locator('button:has(svg.lucide-search)').first();
    await deepResearchButton.click();
    
    // Switch to Browser tab
    const browserTab = page.locator('button:has-text("Browser")');
    await browserTab.click();
    
    // Submit a query to start browsing
    const chatInput = page.locator('textarea[placeholder*="Message"], input[placeholder*="Message"]').first();
    await chatInput.fill('Search for OpenAI on Google');
    
    const sendButton = page.locator('button[type="submit"], button:has-text("Send")').first();
    await sendButton.click();
    
    // Look for browser content updates
    console.log('Waiting for browser content updates...');
    
    // Check for canvas or iframe updates
    const browserContent = page.locator('canvas, iframe, .browser-screenshot').first();
    
    // Take initial screenshot
    const screenshot1 = await browserContent.screenshot();
    
    // Wait for updates
    await page.waitForTimeout(3000);
    
    // Take another screenshot
    const screenshot2 = await browserContent.screenshot();
    
    // Compare screenshots (they should be different if streaming works)
    const buffersEqual = Buffer.compare(screenshot1, screenshot2) === 0;
    expect(buffersEqual).toBeFalsy(); // Screenshots should be different
    
    console.log('✅ Browser view is updating in real-time!');
  });
  
  test('WebSocket connection should be established', async ({ page }) => {
    console.log('Testing WebSocket connection...');
    
    // Monitor WebSocket connections
    const wsConnections: string[] = [];
    
    page.on('websocket', ws => {
      console.log(`WebSocket opened: ${ws.url()}`);
      wsConnections.push(ws.url());
      
      ws.on('framesent', frame => {
        console.log(`WS sent: ${frame.payload?.toString().substring(0, 100)}...`);
      });
      
      ws.on('framereceived', frame => {
        console.log(`WS received: ${frame.payload?.toString().substring(0, 100)}...`);
      });
    });
    
    // Go to the app
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    
    // Activate Deep Research
    const deepResearchButton = page.locator('button:has(svg.lucide-search)').first();
    await deepResearchButton.click();
    
    // Submit a query
    const chatInput = page.locator('textarea[placeholder*="Message"], input[placeholder*="Message"]').first();
    await chatInput.fill('Test WebSocket connection');
    
    const sendButton = page.locator('button[type="submit"], button:has-text("Send")').first();
    await sendButton.click();
    
    // Wait for WebSocket to connect
    await page.waitForTimeout(3000);
    
    // Check if WebSocket connection was established
    const browserUseWS = wsConnections.find(url => 
      url.includes('8002') || url.includes('browser-use')
    );
    
    expect(browserUseWS).toBeTruthy();
    console.log('✅ WebSocket connection established!');
  });
});