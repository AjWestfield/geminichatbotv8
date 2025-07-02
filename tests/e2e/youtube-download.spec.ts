import { test, expect } from '@playwright/test';
import {
  waitForChatReady,
  fillChatInput,
  clickSendButton,
  sendChatMessage,
  waitForMessage,
  waitForAIResponse,
  openSettings,
  closeSettings,
  navigateToSettingsTab
} from '../utils/test-helpers';

test.describe('YouTube Auto-Download E2E Tests', () => {
  // Test YouTube URL - using a short video for faster testing
  const TEST_YOUTUBE_URL = 'https://www.youtube.com/watch?v=jNQXAC9IVRw'; // "Me at the zoo" - first YouTube video (19 seconds)

  test.beforeEach(async ({ page }) => {
    // Navigate to the app
    await page.goto('/');

    // Wait for the chat interface to be ready
    await waitForChatReady(page);
  });

  test('should verify YouTube download settings are enabled by default', async ({ page }) => {
    // Open settings
    await openSettings(page);

    // Navigate to Video tab
    await page.click('button:has-text("Video")');
    await page.waitForTimeout(500);

    // Scroll to YouTube settings section
    const youtubeSection = page.locator('h3:has-text("YouTube Download Settings")');
    await youtubeSection.scrollIntoViewIfNeeded();
    await expect(youtubeSection).toBeVisible();

    // Verify all settings are enabled by default
    const enableSwitch = page.locator('#youtube-enabled');
    const autoDetectSwitch = page.locator('#youtube-auto-detect');
    const autoDownloadSwitch = page.locator('#youtube-auto-download');

    await expect(enableSwitch).toBeChecked();
    await expect(autoDetectSwitch).toBeChecked();
    await expect(autoDownloadSwitch).toBeChecked();

    // Verify default quality is "Auto"
    const qualitySelect = page.locator('#youtube-quality');
    await expect(qualitySelect).toHaveValue('auto');

    // Close settings
    await closeSettings(page);
  });

  test('should auto-download YouTube video when URL is pasted', async ({ page }) => {
    // Focus on chat input
    const chatInput = page.locator('[data-testid="chat-input"]');
    await chatInput.click();

    // Paste YouTube URL (simulate paste event)
    await page.evaluate(async (url) => {
      const input = document.querySelector('[data-testid="chat-input"]') as HTMLTextAreaElement;
      if (input) {
        // Create and dispatch paste event
        const clipboardData = new DataTransfer();
        clipboardData.setData('text/plain', url);
        const pasteEvent = new ClipboardEvent('paste', {
          clipboardData: clipboardData as any,
          bubbles: true,
          cancelable: true
        });
        input.dispatchEvent(pasteEvent);
        
        // Also set the value to ensure it's there
        input.value = url;
        input.dispatchEvent(new Event('input', { bubbles: true }));
      }
    }, TEST_YOUTUBE_URL);

    // Wait for download to start
    console.log('[Test] Waiting for download progress indicator...');
    
    // Look for download progress indicators
    const downloadProgress = page.locator('text=/Preparing to download|Downloading|download/i').first();
    await expect(downloadProgress).toBeVisible({ timeout: 10000 });
    console.log('[Test] Download started!');

    // Wait for download to complete (this may take 30-60 seconds)
    console.log('[Test] Waiting for download to complete...');
    
    // Wait for success toast
    const successToast = page.locator('text=/Video Downloaded|download.*complete/i');
    await expect(successToast).toBeVisible({ timeout: 120000 }); // 2 minute timeout for download
    console.log('[Test] Download completed!');

    // Verify video file appears in the file preview area
    console.log('[Test] Checking for video file in preview area...');
    
    // Look for video file indicators
    const videoFile = page.locator('[data-testid="file-preview"], .file-preview, [class*="file"]').filter({
      has: page.locator('text=/\.mp4|YouTube|Video/i')
    }).first();
    
    await expect(videoFile).toBeVisible({ timeout: 10000 });
    console.log('[Test] Video file is visible!');

    // Verify the URL was cleared from input
    await expect(chatInput).toHaveValue('');
  });

  test('should send downloaded YouTube video with a message', async ({ page }) => {
    // First, download a video (simplified version of previous test)
    const chatInput = page.locator('[data-testid="chat-input"]');
    await chatInput.click();

    // Paste YouTube URL
    await page.evaluate(async (url) => {
      const input = document.querySelector('[data-testid="chat-input"]') as HTMLTextAreaElement;
      if (input) {
        const clipboardData = new DataTransfer();
        clipboardData.setData('text/plain', url);
        const pasteEvent = new ClipboardEvent('paste', {
          clipboardData: clipboardData as any,
          bubbles: true,
          cancelable: true
        });
        input.dispatchEvent(pasteEvent);
        input.value = url;
        input.dispatchEvent(new Event('input', { bubbles: true }));
      }
    }, TEST_YOUTUBE_URL);

    // Wait for download to complete
    const successToast = page.locator('text=/Video Downloaded|download.*complete/i');
    await expect(successToast).toBeVisible({ timeout: 120000 });

    // Wait a bit for file to be ready
    await page.waitForTimeout(2000);

    // Type a message
    await fillChatInput(page, 'Please analyze this video and tell me what you see');

    // Send the message
    await clickSendButton(page);

    // Wait for the message to appear in chat
    await waitForMessage(page, 'Please analyze this video');

    // Wait for AI response
    console.log('[Test] Waiting for AI response...');
    await waitForAIResponse(page, 30000); // 30 second timeout

    // Verify AI response contains video-related content
    const aiResponse = page.locator('[data-testid="message"], .message').last();
    const responseText = await aiResponse.textContent();
    
    // The AI should mention something about the video content
    expect(responseText?.toLowerCase()).toMatch(/video|zoo|elephant|animal/i);
    console.log('[Test] AI successfully analyzed the video!');
  });

  test('should disable auto-download and show manual download UI', async ({ page }) => {
    // Open settings and disable auto-download
    await openSettings(page);
    await page.click('button:has-text("Video")');
    
    // Find and disable auto-download
    const autoDownloadSwitch = page.locator('#youtube-auto-download');
    await autoDownloadSwitch.scrollIntoViewIfNeeded();
    await autoDownloadSwitch.click();
    await expect(autoDownloadSwitch).not.toBeChecked();

    // Close settings
    await closeSettings(page);

    // Paste YouTube URL
    const chatInput = page.locator('[data-testid="chat-input"]');
    await chatInput.click();
    await chatInput.fill(TEST_YOUTUBE_URL);
    await page.keyboard.press('Space'); // Trigger URL detection

    // Wait for manual download UI to appear
    console.log('[Test] Waiting for manual download UI...');
    const downloadCard = page.locator('text=/Download Video|youtube.com/i').first();
    await expect(downloadCard).toBeVisible({ timeout: 10000 });

    // Verify quality selector is visible (if enabled in settings)
    const qualitySelector = page.locator('select').filter({ has: page.locator('option[value="1080p"]') });
    if (await qualitySelector.isVisible()) {
      console.log('[Test] Quality selector is visible');
      // Select a specific quality
      await qualitySelector.selectOption('720p');
    }

    // Click download button
    const downloadButton = page.locator('button:has-text("Download Video")');
    await downloadButton.click();

    // Wait for download to complete
    const successToast = page.locator('text=/Video Downloaded|download.*complete/i');
    await expect(successToast).toBeVisible({ timeout: 120000 });
    console.log('[Test] Manual download completed!');
  });
});
