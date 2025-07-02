import { test, expect } from '@playwright/test';
import {
  waitForChatReady,
  sendChatMessage,
  waitForMessage,
  waitForAIResponse
} from '../utils/test-helpers';

test.describe('Agent Tasks System', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to the app
    await page.goto('/');
    
    // Wait for the chat interface to be ready
    await waitForChatReady(page);
    
    // Ensure we're using Claude Sonnet 4 model
    // First check if we need to switch models
    const currentModel = await page.locator('button[role="combobox"]:has-text("Claude Sonnet 4")').count();
    if (currentModel === 0) {
      // Click the model selector
      await page.locator('button[role="combobox"]').first().click();
      await page.waitForTimeout(500);
      
      // Select Claude Sonnet 4
      await page.locator('[role="option"]:has-text("Claude Sonnet 4")').click();
      await page.waitForTimeout(1000); // Wait for model switch
      
      // Verify the switch
      await expect(page.locator('button:has-text("Claude Sonnet 4")')).toBeVisible();
    }
  });

  test('Basic multi-step task execution', async ({ page }) => {
    // Send a request that requires multiple steps
    await sendChatMessage(page, 'Create a comprehensive analysis of the current MCP server configuration. This should include: 1) List all configured servers, 2) Check their status, 3) Provide recommendations for improvements');

    // Wait for agent task component to appear
    await page.waitForSelector('text="Agent Tasks"', { 
      timeout: 30000,
      state: 'visible' 
    });

    // Wait for AI to create tasks (look for AGENT_PLAN or TodoWrite)
    await page.waitForSelector('text=/\\[AGENT_PLAN\\]|\\[TodoWrite|I\'ll.*create.*todo/', {
      timeout: 30000
    });

    // Give time for tasks to be parsed and displayed
    await page.waitForTimeout(3000);

    // Verify the component is visible
    const agentTaskComponent = page.locator('div:has-text("Agent Tasks")').first();
    await expect(agentTaskComponent).toBeVisible();

    // Check if tasks are created (look for non-zero task count)
    await expect(page.locator('text=/[1-9]\\d*\\/\\d+ completed/')).toBeVisible({ timeout: 20000 });

    // Find and click the expand button (it's the first button in the agent task component)
    const agentTaskContainer = page.locator('div:has-text("Agent Tasks")').first();
    const expandButton = agentTaskContainer.locator('button').first();
    await expandButton.click();
    await page.waitForTimeout(500);

    // Verify tasks are visible - look for task-related text
    await expect(page.locator('text=/configuration|analysis|server|task/i').first()).toBeVisible({ timeout: 10000 });

    // Wait for at least one task to be in progress or starting
    await expect(page.locator('text=/in-progress|in_progress|Starting|Working|pending/i')).toBeVisible({ timeout: 20000 });

    // Wait for progress (either status change or completion)
    await page.waitForTimeout(5000);
    const hasProgress = await page.locator('text=/✅|Completed|in-progress|Starting/i').count();
    expect(hasProgress).toBeGreaterThan(0);

    // Verify progress bar updates
    const progressBar = page.locator('div[class*="bg-primary"]').first();
    await expect(progressBar).toBeVisible();
    
    // Check that width increases (progress happens)
    const initialWidth = await progressBar.evaluate(el => el.style.width || el.offsetWidth);
    await page.waitForTimeout(5000); // Wait for progress
    const updatedWidth = await progressBar.evaluate(el => el.style.width || el.offsetWidth);
    expect(updatedWidth).not.toBe(initialWidth);
  });

  test('MCP server installation workflow', async ({ page }) => {
    // Send request to add an MCP server
    await sendChatMessage(page, 'Add the sequential thinking MCP server to my configuration');

    // Wait for agent task component
    await page.waitForSelector('[data-testid="agent-task-display"], .agent-task-display, div:has-text("Agent Tasks")', { 
      timeout: 15000,
      state: 'visible' 
    });

    // Expand to see tasks
    const expandButton = page.locator('button:has(svg[class*="ChevronDown"], svg[class*="ChevronUp"])').first();
    await expandButton.click();

    // Verify MCP-specific tasks are created
    await expect(page.locator('text=/Search.*sequential thinking.*configuration|Find.*server.*documentation|Extract.*configuration/')).toBeVisible({ timeout: 10000 });
    await expect(page.locator('text=/Update.*mcp.config.json|Add.*server.*configuration|Write.*config/')).toBeVisible();

    // Wait for search task to start
    await expect(page.locator('text=/Starting:.*[Ss]earch|in-progress.*search/i')).toBeVisible({ timeout: 20000 });

    // Wait for completion messages
    await expect(page.locator('text=/✅.*[Ss]earch|Completed.*search/i')).toBeVisible({ timeout: 30000 });
    
    // Verify the assistant mentions it's searching
    await expect(page.locator('.message-content:last-child')).toContainText(/searching|looking for|finding/i);
  });

  test('Task status transitions', async ({ page }) => {
    // Send a request that will go through various status transitions
    await sendChatMessage(page, 'Create a simple todo list application with the following features: 1) Add tasks, 2) Mark as complete, 3) Delete tasks. Show me the implementation step by step.');

    // Wait for agent tasks
    await page.waitForSelector('[data-testid="agent-task-display"], .agent-task-display, div:has-text("Agent Tasks")', { 
      timeout: 15000,
      state: 'visible' 
    });

    // Expand component
    const expandButton = page.locator('button:has(svg[class*="ChevronDown"], svg[class*="ChevronUp"])').first();
    await expandButton.click();

    // Track status transitions
    const statuses = ['pending', 'in-progress', 'completed'];
    
    for (const status of statuses) {
      // Look for various status indicators
      const statusSelectors = [
        `text=/${status}/i`,
        `[data-status="${status}"]`,
        `.task-status-${status}`,
        status === 'in-progress' ? 'text=/Starting:|Working on:/' : null,
        status === 'completed' ? 'text=/✅|Completed:/' : null
      ].filter(Boolean);

      await expect(page.locator(statusSelectors.join(', '))).toBeVisible({ timeout: 30000 });
    }

    // Verify task count updates
    const taskCountRegex = /(\d+)\/(\d+) completed/;
    const taskCount = page.locator('text=/\\d+\\/\\d+ completed/');
    
    // Get initial count
    const initialText = await taskCount.textContent();
    const initialMatch = initialText?.match(taskCountRegex);
    const initialCompleted = initialMatch ? parseInt(initialMatch[1]) : 0;

    // Wait for progress
    await page.waitForTimeout(10000);

    // Get updated count
    const updatedText = await taskCount.textContent();
    const updatedMatch = updatedText?.match(taskCountRegex);
    const updatedCompleted = updatedMatch ? parseInt(updatedMatch[1]) : 0;

    // Verify progress was made
    expect(updatedCompleted).toBeGreaterThan(initialCompleted);
  });

  test('Component UI behavior', async ({ page }) => {
    // First, trigger a task to make the component appear
    await sendChatMessage(page, 'Help me organize my project files. Create a plan to: 1) Analyze current structure, 2) Suggest improvements, 3) Create organization script');

    // Wait for component
    await page.waitForSelector('[data-testid="agent-task-display"], .agent-task-display, div:has-text("Agent Tasks")', { 
      timeout: 15000,
      state: 'visible' 
    });

    const agentTaskComponent = page.locator('[data-testid="agent-task-display"], .agent-task-display, div:has-text("Agent Tasks")').first();

    // Test 1: Verify component starts collapsed
    const taskList = page.locator('.agent-plan, [class*="task-list"], div:has(text("pending"))').first();
    await expect(taskList).not.toBeVisible();

    // Test 2: Expand functionality
    const expandButton = page.locator('button:has(svg[class*="ChevronDown"], svg[class*="ChevronUp"])').first();
    await expandButton.click();
    await expect(taskList).toBeVisible();

    // Test 3: Collapse functionality
    await expandButton.click();
    await expect(taskList).not.toBeVisible();

    // Test 4: Close button functionality (if tasks are present)
    const closeButton = page.locator('button:has(svg[class*="X"])').first();
    if (await closeButton.isVisible()) {
      await closeButton.click();
      // Component should hide or show empty state
      await expect(agentTaskComponent).toBeHidden({ timeout: 5000 }).catch(() => {
        // Or it might show empty state
        expect(page.locator('text=/tasks will appear here|no active tasks/i')).toBeVisible();
      });
    }

    // Test 5: Progress indicator
    await sendChatMessage(page, 'Create another multi-step task plan for refactoring code');
    
    await page.waitForSelector('[data-testid="agent-task-display"], .agent-task-display, div:has-text("Agent Tasks")', { 
      timeout: 15000,
      state: 'visible' 
    });

    // Check for progress bar
    const progressBar = page.locator('div[class*="bg-primary"], div[class*="progress"]').first();
    await expect(progressBar).toBeVisible();
  });

  test('Error handling and failed tasks', async ({ page }) => {
    // Send a request that might fail
    await sendChatMessage(page, 'Add a non-existent MCP server called "fake-server-12345" that definitely does not exist');

    // Wait for agent tasks
    await page.waitForSelector('[data-testid="agent-task-display"], .agent-task-display, div:has-text("Agent Tasks")', { 
      timeout: 15000,
      state: 'visible' 
    });

    // Expand to see tasks
    const expandButton = page.locator('button:has(svg[class*="ChevronDown"], svg[class*="ChevronUp"])').first();
    await expandButton.click();

    // Wait for search task
    await expect(page.locator('text=/[Ss]earch.*fake-server/')).toBeVisible({ timeout: 10000 });

    // The search might fail or find no results - both are valid
    // Look for either completed search with no results or a need-help status
    await expect(page.locator('text=/could not find|no results|not found|need.*help|failed/i')).toBeVisible({ timeout: 30000 });
  });

  test('TodoWrite and AGENT_PLAN integration', async ({ page }) => {
    // Test that both TodoWrite and AGENT_PLAN markers work
    await sendChatMessage(page, 'I need you to create a detailed plan and then execute it. Plan should include: analyzing code quality, suggesting improvements, and implementing one improvement.');

    // Wait for component
    await page.waitForSelector('[data-testid="agent-task-display"], .agent-task-display, div:has-text("Agent Tasks")', { 
      timeout: 15000,
      state: 'visible' 
    });

    // Look for AGENT_PLAN in the response
    await expect(page.locator('text=/\\[AGENT_PLAN\\]|I\'ll.*create.*plan|Let me.*organize/i')).toBeVisible({ timeout: 15000 });

    // Expand to verify tasks
    const expandButton = page.locator('button:has(svg[class*="ChevronDown"], svg[class*="ChevronUp"])').first();
    await expandButton.click();

    // Verify tasks are created and visible
    await expect(page.locator('text=/analyz|quality|improvement/i')).toBeVisible();

    // Check for TodoWrite updates in the messages
    await expect(page.locator('.message-content')).toContainText(/TodoWrite|Update task|✅ Completed:/);
  });

  test('Real-time sync between todo and UI', async ({ page }) => {
    // Send a complex request
    await sendChatMessage(page, 'Set up a complete development environment with: 1) Git configuration, 2) Node.js setup verification, 3) Install common dev tools');

    // Wait for tasks to appear
    await page.waitForSelector('[data-testid="agent-task-display"], .agent-task-display, div:has-text("Agent Tasks")', { 
      timeout: 15000,
      state: 'visible' 
    });

    // Expand component
    const expandButton = page.locator('button:has(svg[class*="ChevronDown"], svg[class*="ChevronUp"])').first();
    await expandButton.click();

    // Monitor real-time updates
    let previousCompletedCount = 0;
    
    for (let i = 0; i < 5; i++) {
      // Get current completed count
      const taskCountText = await page.locator('text=/\\d+\\/\\d+ completed/').textContent();
      const match = taskCountText?.match(/(\d+)\/\d+ completed/);
      const currentCompleted = match ? parseInt(match[1]) : 0;

      // Verify progress is being made
      if (currentCompleted > previousCompletedCount) {
        // Progress detected
        expect(currentCompleted).toBeGreaterThan(previousCompletedCount);
        previousCompletedCount = currentCompleted;
      }

      // Also check for status updates in the UI
      const statusElements = await page.locator('[class*="status"], [data-status]').count();
      expect(statusElements).toBeGreaterThan(0);

      await page.waitForTimeout(3000); // Check every 3 seconds
    }

    // Verify at least some progress was made
    expect(previousCompletedCount).toBeGreaterThan(0);
  });
});