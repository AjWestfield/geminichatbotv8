import { test, expect } from '@playwright/test';

test.describe('Social Media URL Auto-Download Fix', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to the app
    await page.goto('http://localhost:3000');
    
    // Wait for the app to load
    await page.waitForSelector('[data-testid="chat-input"]', { timeout: 10000 });
    
    // Enable auto-download in settings
    await page.click('button[aria-label="Open settings"]');
    await page.waitForSelector('text=Auto-download from URLs', { timeout: 5000 });
    
    // Enable auto-download if not already enabled
    const autoDownloadToggle = page.locator('button[role="switch"]').filter({ hasText: /Auto-download from URLs/i });
    const isEnabled = await autoDownloadToggle.getAttribute('aria-checked');
    if (isEnabled !== 'true') {
      await autoDownloadToggle.click();
    }
    
    // Close settings
    await page.keyboard.press('Escape');
    await page.waitForTimeout(500);
  });

  test('Instagram URL should not appear in input when pasted', async ({ page }) => {
    const instagramUrl = 'https://www.instagram.com/p/DLX1qBJpXxL';
    
    // Focus on the chat input
    const chatInput = page.locator('[data-testid="chat-input"]');
    await chatInput.click();
    
    // Get initial value
    const initialValue = await chatInput.inputValue();
    
    // Paste the Instagram URL
    await page.keyboard.insertText(instagramUrl);
    await page.waitForTimeout(100);
    
    // Check that URL is NOT in the input
    const afterPasteValue = await chatInput.inputValue();
    expect(afterPasteValue).not.toContain(instagramUrl);
    expect(afterPasteValue).toBe(initialValue); // Should remain unchanged
    
    // Check for download progress indicator
    await expect(page.locator('text=/Downloading content|Processing media/i')).toBeVisible({ timeout: 5000 });
    
    // Ensure no MCP tool message appears
    await expect(page.locator('text=/instagram_for_business_api_request/i')).not.toBeVisible({ timeout: 3000 });
    await expect(page.locator('text=/TOOL_CALL/i')).not.toBeVisible({ timeout: 3000 });
  });

  test('YouTube URL should not appear in input when pasted', async ({ page }) => {
    const youtubeUrl = 'https://www.youtube.com/watch?v=dQw4w9WgXcQ';
    
    // Focus on the chat input
    const chatInput = page.locator('[data-testid="chat-input"]');
    await chatInput.click();
    
    // Paste the YouTube URL
    await page.keyboard.insertText(youtubeUrl);
    await page.waitForTimeout(100);
    
    // Check that URL is NOT in the input
    const afterPasteValue = await chatInput.inputValue();
    expect(afterPasteValue).not.toContain(youtubeUrl);
    expect(afterPasteValue).not.toContain('youtube.com');
    
    // Check for download progress
    await expect(page.locator('text=/Downloading|Download/i')).toBeVisible({ timeout: 5000 });
  });

  test('Submit button should be disabled during download', async ({ page }) => {
    const instagramUrl = 'https://www.instagram.com/p/DLX1qBJpXxL';
    
    // Focus on the chat input
    const chatInput = page.locator('[data-testid="chat-input"]');
    await chatInput.click();
    
    // Paste the Instagram URL
    await page.keyboard.insertText(instagramUrl);
    await page.waitForTimeout(100);
    
    // Check submit button is disabled
    const submitButton = page.locator('button[aria-label="Send message"]');
    await expect(submitButton).toBeDisabled({ timeout: 3000 });
    
    // Tooltip should show download in progress
    await submitButton.hover();
    await expect(page.locator('text=/Download in progress/i')).toBeVisible({ timeout: 2000 });
  });

  test('Mixed content paste should only remove URLs', async ({ page }) => {
    const mixedContent = 'Check out this video https://www.instagram.com/p/DLX1qBJpXxL it is amazing!';
    const expectedContent = 'Check out this video  it is amazing!'; // URL removed
    
    // Focus on the chat input
    const chatInput = page.locator('[data-testid="chat-input"]');
    await chatInput.click();
    
    // Paste mixed content
    await chatInput.fill(''); // Clear first
    await page.evaluate(async (text) => {
      await navigator.clipboard.writeText(text);
    }, mixedContent);
    
    await page.keyboard.press('Control+V');
    await page.waitForTimeout(200);
    
    // Check that only URL was removed
    const afterPasteValue = await chatInput.inputValue();
    expect(afterPasteValue).not.toContain('instagram.com');
    expect(afterPasteValue.trim()).toBe(expectedContent.trim());
  });

  test('Manual download mode should show URL in input', async ({ page }) => {
    // Disable auto-download
    await page.click('button[aria-label="Open settings"]');
    await page.waitForSelector('text=Auto-download from URLs', { timeout: 5000 });
    
    const autoDownloadToggle = page.locator('button[role="switch"]').filter({ hasText: /Auto-download from URLs/i });
    await autoDownloadToggle.click(); // Disable
    
    // Close settings
    await page.keyboard.press('Escape');
    await page.waitForTimeout(500);
    
    const instagramUrl = 'https://www.instagram.com/p/DLX1qBJpXxL';
    
    // Focus on the chat input
    const chatInput = page.locator('[data-testid="chat-input"]');
    await chatInput.click();
    
    // Paste URL
    await page.keyboard.insertText(instagramUrl);
    await page.waitForTimeout(100);
    
    // URL SHOULD appear in input when auto-download is disabled
    const afterPasteValue = await chatInput.inputValue();
    expect(afterPasteValue).toContain(instagramUrl);
    
    // Manual download UI should appear
    await expect(page.locator('text=/Instagram.*detected/i')).toBeVisible({ timeout: 3000 });
  });

  test('No message should be sent when URL is pasted', async ({ page }) => {
    const instagramUrl = 'https://www.instagram.com/p/DLX1qBJpXxL';
    
    // Focus on the chat input
    const chatInput = page.locator('[data-testid="chat-input"]');
    await chatInput.click();
    
    // Count initial messages
    const initialMessages = await page.locator('[role="article"]').count();
    
    // Paste URL
    await page.keyboard.insertText(instagramUrl);
    await page.waitForTimeout(100);
    
    // Try to submit (should not work)
    await page.keyboard.press('Enter');
    await page.waitForTimeout(1000);
    
    // Message count should not increase
    const afterMessages = await page.locator('[role="article"]').count();
    expect(afterMessages).toBe(initialMessages);
    
    // No user message with URL should appear
    await expect(page.locator(`[role="article"]:has-text("${instagramUrl}")`)).not.toBeVisible();
  });
});