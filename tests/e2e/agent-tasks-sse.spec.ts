import { test, expect } from '@playwright/test';

const sampleTasks = [
  {
    id: 'sse-1',
    title: 'SSE Step 1',
    description: '',
    status: 'pending',
    priority: 'medium',
    level: 0,
    dependencies: [],
    subtasks: [],
  },
  {
    id: 'sse-2',
    title: 'SSE Step 2',
    description: '',
    status: 'pending',
    priority: 'medium',
    level: 0,
    dependencies: ['sse-1'],
    subtasks: [],
  },
];

test.describe('Agent Task SSE', () => {
  test('auto-expands and shows tasks when SSE create event received', async ({ page, request }) => {
    // 1. Open the app
    await page.goto('/');

    // small delay to allow EventSource to connect
    await page.waitForTimeout(1000);
    // 2. Emit create event via API
    await request.post('/api/agent-tasks', {
      data: {
        action: 'create',
        tasks: sampleTasks,
      },
    });

    // Retry once after 1s in case SSE connection was late
    await page.waitForTimeout(1000);
    await request.post('/api/agent-tasks', {
      data: { action: 'create', tasks: sampleTasks },
    });

    // 3. Panel should appear and auto-expand with tasks
    const header = page.locator('text=Agent Tasks');
    await expect(header).toBeVisible({ timeout: 5000 });

    // One of the task titles should be rendered
    await expect(page.locator('text=SSE Step 1')).toHaveCount(1, { timeout: 15000 });
  });
});
