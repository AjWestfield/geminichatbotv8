import { test, expect } from '@playwright/test';

test.describe('Chat Input Auto-Submission Fix', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to the chat interface
    await page.goto('http://localhost:3001');
    
    // Wait for the chat interface to load
    await page.waitForSelector('[data-testid="chat-interface"]', { timeout: 10000 });
  });

  test('should not auto-submit when typing regular text', async ({ page }) => {
    // Find the chat input textarea
    const chatInput = page.locator('textarea').first();
    
    // Type some text
    await chatInput.fill('This is a test message');
    
    // Wait a bit to ensure no auto-submission occurs
    await page.waitForTimeout(2000);
    
    // Verify the text is still in the input and no message was sent
    const inputValue = await chatInput.inputValue();
    expect(inputValue).toBe('This is a test message');
    
    // Check that no messages were sent (look for message elements)
    const messages = await page.locator('[data-testid="chat-message"]').count();
    expect(messages).toBe(0);
  });

  test('should not auto-submit when pasting YouTube URL', async ({ page }) => {
    const chatInput = page.locator('textarea').first();
    
    // Paste a YouTube URL
    const youtubeUrl = 'https://www.youtube.com/watch?v=dQw4w9WgXcQ';
    await chatInput.fill(youtubeUrl);
    
    // Wait to ensure no auto-download/submission
    await page.waitForTimeout(3000);
    
    // Verify the URL is still in the input
    const inputValue = await chatInput.inputValue();
    expect(inputValue).toBe(youtubeUrl);
    
    // Verify no automatic submission occurred
    const messages = await page.locator('[data-testid="chat-message"]').count();
    expect(messages).toBe(0);
  });

  test('should not auto-submit when pasting Instagram URL', async ({ page }) => {
    const chatInput = page.locator('textarea').first();
    
    // Paste an Instagram URL
    const instagramUrl = 'https://www.instagram.com/p/ABC123/';
    await chatInput.fill(instagramUrl);
    
    // Wait to ensure no auto-download/submission
    await page.waitForTimeout(3000);
    
    // Verify the URL is still in the input
    const inputValue = await chatInput.inputValue();
    expect(inputValue).toBe(instagramUrl);
    
    // Verify no automatic submission occurred
    const messages = await page.locator('[data-testid="chat-message"]').count();
    expect(messages).toBe(0);
  });

  test('should only submit when clicking send button', async ({ page }) => {
    const chatInput = page.locator('textarea').first();
    const sendButton = page.locator('[data-testid="send-button"]');
    
    // Type a message
    await chatInput.fill('Test message for manual submission');
    
    // Click the send button
    await sendButton.click();
    
    // Wait for the message to be sent
    await page.waitForSelector('[data-testid="chat-message"]', { timeout: 5000 });
    
    // Verify the input was cleared
    const inputValue = await chatInput.inputValue();
    expect(inputValue).toBe('');
    
    // Verify a message was sent
    const messages = await page.locator('[data-testid="chat-message"]').count();
    expect(messages).toBeGreaterThan(0);
  });

  test('should submit with Enter key but not auto-submit', async ({ page }) => {
    const chatInput = page.locator('textarea').first();
    
    // Type a message
    await chatInput.fill('Test message with Enter key');
    
    // Press Enter to submit
    await chatInput.press('Enter');
    
    // Wait for the message to be sent
    await page.waitForSelector('[data-testid="chat-message"]', { timeout: 5000 });
    
    // Verify the input was cleared
    const inputValue = await chatInput.inputValue();
    expect(inputValue).toBe('');
    
    // Verify a message was sent
    const messages = await page.locator('[data-testid="chat-message"]').count();
    expect(messages).toBeGreaterThan(0);
  });

  test('should not submit with Shift+Enter (new line)', async ({ page }) => {
    const chatInput = page.locator('textarea').first();
    
    // Type a message with new line
    await chatInput.fill('Line 1');
    await chatInput.press('Shift+Enter');
    await chatInput.type('Line 2');
    
    // Wait to ensure no submission
    await page.waitForTimeout(1000);
    
    // Verify the text is still in the input with newline
    const inputValue = await chatInput.inputValue();
    expect(inputValue).toContain('Line 1');
    expect(inputValue).toContain('Line 2');
    
    // Verify no message was sent
    const messages = await page.locator('[data-testid="chat-message"]').count();
    expect(messages).toBe(0);
  });
});
