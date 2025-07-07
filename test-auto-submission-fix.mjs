import { test, expect } from '@playwright/test';

test('verify chat input does not auto-submit', async ({ page }) => {
  // Navigate to the app
  await page.goto('http://localhost:3001');
  
  // Wait for the chat interface to load
  await page.waitForSelector('textarea', { timeout: 10000 });
  
  // Find the chat input
  const chatInput = page.locator('textarea').first();
  
  // Type some text
  await chatInput.fill('This is a test message');
  
  // Wait 2 seconds to ensure no auto-submission
  await page.waitForTimeout(2000);
  
  // Verify the text is still in the input
  const inputValue = await chatInput.inputValue();
  expect(inputValue).toBe('This is a test message');
  
  // Verify no messages were sent
  const messages = await page.locator('[data-testid="chat-message"]').count();
  expect(messages).toBe(0);
  
  console.log('✅ Chat input does not auto-submit!');
});

test('verify YouTube URL does not auto-submit', async ({ page }) => {
  await page.goto('http://localhost:3001');
  await page.waitForSelector('textarea', { timeout: 10000 });
  
  const chatInput = page.locator('textarea').first();
  
  // Paste a YouTube URL
  await chatInput.fill('https://www.youtube.com/watch?v=dQw4w9WgXcQ');
  
  // Wait to ensure no auto-download/submission
  await page.waitForTimeout(3000);
  
  // Verify the URL is still in the input
  const inputValue = await chatInput.inputValue();
  expect(inputValue).toBe('https://www.youtube.com/watch?v=dQw4w9WgXcQ');
  
  console.log('✅ YouTube URL does not trigger auto-submission!');
});

test('verify manual submission still works', async ({ page }) => {
  await page.goto('http://localhost:3001');
  await page.waitForSelector('textarea', { timeout: 10000 });
  
  const chatInput = page.locator('textarea').first();
  const sendButton = page.locator('[data-testid="send-button"]');
  
  // Type a message
  await chatInput.fill('Test manual submission');
  
  // Click send button
  await sendButton.click();
  
  // Wait for the message to appear
  await page.waitForSelector('[data-testid="chat-message"], .flex.gap-x-4', { timeout: 10000 });
  
  // Verify the input was cleared
  const inputValue = await chatInput.inputValue();
  expect(inputValue).toBe('');
  
  console.log('✅ Manual submission works correctly!');
});
