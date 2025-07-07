import { test, expect } from '@playwright/test';

test('Quick syntax and functionality check', async ({ page }) => {
  console.log('🧪 Running quick functionality check...');
  
  // Navigate to the app
  await page.goto('http://localhost:3000');
  
  // Wait for initial load - more flexible selectors
  const appLoaded = await page.waitForSelector('text=/AI Assistant|Hello|How can I help|What can I do/i', { 
    timeout: 10000 
  }).catch(() => null);
  
  if (!appLoaded) {
    throw new Error('App did not load properly - check for compilation errors');
  }
  
  console.log('✅ App loaded successfully');
  
  // Check for any React error boundaries or error messages
  const errorBoundary = await page.locator('text=/Error:|error boundary|Something went wrong/i').isVisible().catch(() => false);
  if (errorBoundary) {
    const errorText = await page.locator('text=/Error:|error boundary|Something went wrong/i').textContent();
    throw new Error(`React Error Boundary triggered: ${errorText}`);
  }
  
  // Find the chat input with flexible selectors
  const chatInput = await page.locator('input[type="text"], textarea').filter({ 
    hasText: /^$/ // empty input
  }).first();
  
  const inputVisible = await chatInput.isVisible().catch(() => false);
  if (!inputVisible) {
    throw new Error('Chat input not found or not visible');
  }
  
  console.log('✅ Chat input is visible and ready');
  
  // Type a simple message to verify input works
  await chatInput.click();
  await chatInput.type('Hello', { delay: 50 });
  
  const inputValue = await chatInput.inputValue();
  expect(inputValue).toBe('Hello');
  console.log('✅ Input field is accepting text');
  
  // Clear the input
  await chatInput.fill('');
  
  // Test pasting a URL
  const testUrl = 'https://www.instagram.com/reels/test/';
  await chatInput.fill(testUrl);
  await page.waitForTimeout(1000);
  
  console.log('✅ URL pasted successfully');
  
  // Check if any download UI appears (social preview, progress, etc)
  const downloadUI = await page.locator('[class*="social"], [class*="download"], [class*="progress"], text=/download/i').first();
  const hasDownloadUI = await downloadUI.isVisible({ timeout: 3000 }).catch(() => false);
  
  if (hasDownloadUI) {
    console.log('✅ Download UI detected after URL paste');
  } else {
    console.log('⚠️  No download UI detected - this may be normal for test URLs');
  }
  
  // Look for video action buttons
  const actionButtons = await page.locator('button').filter({ 
    hasText: /analyze|reverse.*engineer|🔍|⚙️/i 
  });
  
  const buttonCount = await actionButtons.count();
  console.log(`✅ Found ${buttonCount} action buttons`);
  
  // Take a diagnostic screenshot
  await page.screenshot({ 
    path: 'test-results/quick-check-screenshot.png',
    fullPage: true 
  });
  
  console.log('✅ Quick functionality check completed successfully');
});
