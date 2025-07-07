import { test, expect } from '@playwright/test';
import path from 'path';

// Test timeout set to 2 minutes for video download
test.setTimeout(120000);

test.describe('Video Analyze and Reverse Engineer E2E Tests', () => {
  const testVideoUrl = 'https://www.instagram.com/reels/DKDng9oPWqG/';
  
  test.beforeEach(async ({ page }) => {
    // Navigate to the app
    await page.goto('http://localhost:3000');
    
    // Wait for the app to load
    await expect(page.locator('text=/AI Assistant|Hello|How can I help/i')).toBeVisible({ timeout: 10000 });
    
    console.log('✅ App loaded successfully');
  });

  test('Video URL download and analyze functionality', async ({ page }) => {
    console.log('🧪 Testing video analyze functionality...');
    
    // Find the chat input
    const chatInput = page.locator('input[placeholder*="What can I do for you"], textarea[placeholder*="What can I do for you"]').first();
    await expect(chatInput).toBeVisible();
    
    // Paste the video URL
    console.log('📋 Pasting video URL:', testVideoUrl);
    await chatInput.click();
    await chatInput.fill(testVideoUrl);
    
    // Wait a moment for URL detection
    await page.waitForTimeout(1000);
    
    // Check if the smart social preview appears
    const socialPreview = page.locator('[class*="smart-social-preview"], [class*="SmartSocialPreview"]');
    const previewVisible = await socialPreview.isVisible().catch(() => false);
    
    if (previewVisible) {
      console.log('✅ Smart social preview detected');
      
      // Wait for download to complete (look for progress or completion)
      await expect(page.locator('text=/Download.*complete|Upload.*complete|100%/i')).toBeVisible({ timeout: 30000 });
      console.log('✅ Video download completed');
    } else {
      console.log('⚠️  Smart social preview not visible, checking for direct file upload');
    }
    
    // Wait for video options to appear
    const analyzeButton = page.locator('button:has-text("Analyze"), button:has-text("🔍 Analyze")').first();
    const reverseEngineerButton = page.locator('button:has-text("Reverse Engineer"), button:has-text("⚙️ Reverse Engineer")').first();
    
    // Wait for at least one button to be visible
    await expect(analyzeButton.or(reverseEngineerButton)).toBeVisible({ timeout: 30000 });
    console.log('✅ Video action buttons are visible');
    
    // Test Analyze functionality
    console.log('🔍 Testing Analyze functionality...');
    await analyzeButton.click();
    
    // Wait for the AI response to start
    await expect(page.locator('text=/analyzing|processing|examining/i')).toBeVisible({ timeout: 15000 });
    console.log('✅ AI is processing the analyze request');
    
    // Wait for a substantial response (containing video analysis keywords)
    await expect(page.locator('text=/transcription|timestamp|audio|visual|duration/i')).toBeVisible({ timeout: 60000 });
    console.log('✅ AI provided video analysis response');
    
    // Verify the response doesn't contain error messages about missing video
    const errorMessages = [
      'provide the video',
      'need the video',
      'upload the video',
      'where is the video',
      'cannot find the video'
    ];
    
    for (const errorMsg of errorMessages) {
      const hasError = await page.locator(`text=/${errorMsg}/i`).isVisible().catch(() => false);
      expect(hasError).toBe(false);
    }
    console.log('✅ No error messages about missing video');
    
    // Take a screenshot of successful analysis
    await page.screenshot({ 
      path: path.join(__dirname, '..', 'test-results', 'video-analyze-success.png'),
      fullPage: true 
    });
  });

  test('Video URL download and reverse engineer functionality', async ({ page }) => {
    console.log('🧪 Testing video reverse engineer functionality...');
    
    // Find the chat input
    const chatInput = page.locator('input[placeholder*="What can I do for you"], textarea[placeholder*="What can I do for you"]').first();
    await expect(chatInput).toBeVisible();
    
    // Clear any existing input and paste the video URL
    await chatInput.click();
    await chatInput.fill('');
    await chatInput.fill(testVideoUrl);
    
    // Wait for download to complete
    await page.waitForTimeout(2000);
    
    // Wait for video options to appear
    const reverseEngineerButton = page.locator('button:has-text("Reverse Engineer"), button:has-text("⚙️ Reverse Engineer")').first();
    await expect(reverseEngineerButton).toBeVisible({ timeout: 30000 });
    console.log('✅ Reverse Engineer button is visible');
    
    // Click Reverse Engineer
    await reverseEngineerButton.click();
    console.log('✅ Clicked Reverse Engineer button');
    
    // Wait for the AI response to start
    await expect(page.locator('text=/reverse.*engineer|analyzing.*production|breakdown/i')).toBeVisible({ timeout: 15000 });
    console.log('✅ AI is processing the reverse engineer request');
    
    // Wait for a substantial response (containing reverse engineering keywords)
    await expect(page.locator('text=/production.*breakdown|technical.*recreation|workflow|equipment/i')).toBeVisible({ timeout: 60000 });
    console.log('✅ AI provided reverse engineering response');
    
    // Verify no error messages
    const hasError = await page.locator('text=/provide.*video|need.*video|upload.*video/i').isVisible().catch(() => false);
    expect(hasError).toBe(false);
    console.log('✅ No error messages about missing video');
    
    // Take a screenshot
    await page.screenshot({ 
      path: path.join(__dirname, '..', 'test-results', 'video-reverse-engineer-success.png'),
      fullPage: true 
    });
  });

  test('Video options appear after URL paste', async ({ page }) => {
    console.log('🧪 Testing video options UI...');
    
    const chatInput = page.locator('input[placeholder*="What can I do for you"], textarea[placeholder*="What can I do for you"]').first();
    await chatInput.click();
    await chatInput.fill(testVideoUrl);
    
    // Wait for video options
    const videoOptions = page.locator('button:has-text("Analyze"), button:has-text("Reverse Engineer")');
    await expect(videoOptions.first()).toBeVisible({ timeout: 30000 });
    
    // Count the options
    const optionCount = await videoOptions.count();
    expect(optionCount).toBeGreaterThanOrEqual(2);
    console.log(`✅ Found ${optionCount} video action options`);
    
    // Verify both buttons exist
    await expect(page.locator('button:has-text("Analyze")')).toBeVisible();
    await expect(page.locator('button:has-text("Reverse Engineer")')).toBeVisible();
    console.log('✅ Both Analyze and Reverse Engineer buttons are present');
  });
});

// Helper test to verify the app is running
test('App health check', async ({ page }) => {
  await page.goto('http://localhost:3000');
  await expect(page).toHaveTitle(/Gemini|Chat|AI/i);
  console.log('✅ App is running and accessible');
});
