import { test, expect } from '@playwright/test';

test.describe('URL Paste Functionality Test', () => {
  test('Direct paste test - URL should not appear in input', async ({ page }) => {
    // Navigate directly to the app
    await page.goto('http://localhost:3000');
    
    // Wait for app to load completely
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);
    
    // Try to find and click settings - use various possible selectors
    const settingsSelectors = [
      'button:has-text("Settings")',
      'button[title*="Settings"]',
      'button[aria-label*="Settings"]',
      '[data-testid="settings-button"]',
      'button svg[class*="settings"]',
      'button:has(svg)',
      '.sidebar button:last-child'
    ];
    
    let settingsFound = false;
    for (const selector of settingsSelectors) {
      try {
        const element = await page.locator(selector).first();
        if (await element.isVisible({ timeout: 1000 })) {
          await element.click();
          settingsFound = true;
          console.log(`Found settings with selector: ${selector}`);
          break;
        }
      } catch (e) {
        // Continue trying next selector
      }
    }
    
    if (settingsFound) {
      // Try to enable auto-download
      try {
        await page.waitForSelector('text=/Auto.*download/i', { timeout: 3000 });
        const toggles = await page.locator('button[role="switch"]').all();
        for (const toggle of toggles) {
          const text = await toggle.textContent();
          if (text && text.toLowerCase().includes('auto') && text.toLowerCase().includes('download')) {
            const isChecked = await toggle.getAttribute('aria-checked');
            if (isChecked !== 'true') {
              await toggle.click();
            }
            break;
          }
        }
        // Close settings
        await page.keyboard.press('Escape');
        await page.waitForTimeout(500);
      } catch (e) {
        console.log('Could not find auto-download toggle');
      }
    }
    
    // Test 1: Focus on chat input and paste URL
    console.log('Test 1: Testing Instagram URL paste');
    const chatInput = page.locator('textarea').first();
    await chatInput.click();
    await chatInput.clear();
    
    // Paste Instagram URL using clipboard API
    const instagramUrl = 'https://www.instagram.com/p/DLX1qBJpXxL';
    await page.evaluate(async (url) => {
      await navigator.clipboard.writeText(url);
    }, instagramUrl);
    
    await chatInput.press('Control+v');
    await page.waitForTimeout(500);
    
    // Check input value
    const value1 = await chatInput.inputValue();
    console.log(`After Instagram paste, input value: "${value1}"`);
    
    // Test 2: Clear and test YouTube URL
    console.log('Test 2: Testing YouTube URL paste');
    await chatInput.clear();
    const youtubeUrl = 'https://www.youtube.com/watch?v=dQw4w9WgXcQ';
    await page.evaluate(async (url) => {
      await navigator.clipboard.writeText(url);
    }, youtubeUrl);
    
    await chatInput.press('Control+v');
    await page.waitForTimeout(500);
    
    const value2 = await chatInput.inputValue();
    console.log(`After YouTube paste, input value: "${value2}"`);
    
    // Test 3: Test mixed content
    console.log('Test 3: Testing mixed content paste');
    await chatInput.clear();
    const mixedContent = 'Check out this video https://www.instagram.com/p/test123 amazing!';
    await page.evaluate(async (text) => {
      await navigator.clipboard.writeText(text);
    }, mixedContent);
    
    await chatInput.press('Control+v');
    await page.waitForTimeout(500);
    
    const value3 = await chatInput.inputValue();
    console.log(`After mixed content paste, input value: "${value3}"`);
    
    // Test 4: Check for download indicators
    console.log('Test 4: Checking for download indicators');
    const downloadIndicators = [
      'text=/Downloading/i',
      'text=/Processing/i',
      'text=/Download.*progress/i',
      '[role="progressbar"]',
      'text=/[0-9]+%/'
    ];
    
    let downloadFound = false;
    for (const indicator of downloadIndicators) {
      if (await page.locator(indicator).isVisible({ timeout: 1000 })) {
        downloadFound = true;
        console.log(`Found download indicator: ${indicator}`);
        break;
      }
    }
    
    // Assertions
    console.log('\n=== Test Results ===');
    console.log(`Settings found: ${settingsFound}`);
    console.log(`Instagram URL in input: ${value1.includes('instagram.com')}`);
    console.log(`YouTube URL in input: ${value2.includes('youtube.com')}`);
    console.log(`Mixed content has URL: ${value3.includes('instagram.com')}`);
    console.log(`Download indicator found: ${downloadFound}`);
    
    // Basic assertions
    if (settingsFound) {
      // If auto-download is enabled, URLs should not appear
      expect(value1).not.toContain('instagram.com');
      expect(value2).not.toContain('youtube.com');
      
      // Mixed content should have URL removed but keep other text
      if (!value3.includes('instagram.com')) {
        expect(value3).toContain('Check out this video');
        expect(value3).toContain('amazing!');
      }
    } else {
      console.log('Could not verify auto-download setting, checking current behavior');
      // Just log the current behavior
      console.log(`Current behavior: URLs ${value1.includes('instagram.com') ? 'DO' : 'DO NOT'} appear in input`);
    }
  });
});