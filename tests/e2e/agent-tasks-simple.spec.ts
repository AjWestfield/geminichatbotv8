import { test, expect } from '@playwright/test';
import {
  waitForChatReady,
  sendChatMessage,
  waitForMessage,
  waitForAIResponse
} from '../utils/test-helpers';

test.describe('Agent Tasks Simple Test', () => {
  test('Agent tasks appear for multi-step request', async ({ page }) => {
    // Navigate to the app
    await page.goto('/');
    
    // Wait for the chat interface to be ready
    await waitForChatReady(page);
    
    // Switch to Claude Sonnet 4
    console.log('Switching to Claude Sonnet 4...');
    
    // Click the current model selector
    const modelButton = page.locator('button').filter({ hasText: /gemini|claude|gpt/i }).first();
    await modelButton.click();
    await page.waitForTimeout(1000);
    
    // Click Claude Sonnet 4 option
    const claudeOption = page.locator('text=Claude Sonnet 4');
    await claudeOption.click();
    await page.waitForTimeout(1000);
    
    // Verify Claude is selected
    await expect(page.locator('button:has-text("Claude Sonnet 4")')).toBeVisible();
    console.log('Claude Sonnet 4 selected');
    
    // Send a multi-step request
    console.log('Sending multi-step request...');
    await sendChatMessage(page, 'Please help me set up a new React project. This should include: 1) Create project structure, 2) Install dependencies, 3) Set up testing framework');
    
    // Wait for response to start
    await page.waitForTimeout(5000);
    
    // Check for agent task component - try multiple selectors
    console.log('Looking for agent task component...');
    
    const agentTaskSelectors = [
      'text="Agent Tasks"',
      '[data-testid="agent-task-display"]',
      'div:has-text("Agent Tasks")',
      'text=/\\d+\\/\\d+ completed/',
      'text=/[AGENT_PLAN]/',
      'text=/TodoWrite/'
    ];
    
    let found = false;
    for (const selector of agentTaskSelectors) {
      try {
        await page.waitForSelector(selector, { timeout: 10000 });
        console.log(`Found agent task indicator with selector: ${selector}`);
        found = true;
        break;
      } catch (e) {
        console.log(`Selector ${selector} not found`);
      }
    }
    
    expect(found).toBe(true);
    
    // Take a screenshot for debugging
    await page.screenshot({ path: 'agent-tasks-test-screenshot.png', fullPage: true });
    console.log('Screenshot saved as agent-tasks-test-screenshot.png');
  });
});