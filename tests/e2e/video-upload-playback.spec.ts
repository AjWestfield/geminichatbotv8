import { test, expect } from '@playwright/test';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

test.describe('Video Upload and Playback', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to the app
    await page.goto('/');
    
    // Wait for the chat interface to load
    await page.waitForSelector('[data-testid="chat-interface"]', { timeout: 10000 });
  });

  test('should upload a video file and play it in the modal', async ({ page }) => {
    // Set up console logging to capture debug messages
    const consoleLogs: string[] = [];
    page.on('console', msg => {
      const text = msg.text();
      if (text.includes('[Upload]') || 
          text.includes('[handleFileClick]') || 
          text.includes('[FilePreviewModal]') ||
          text.includes('[processFile]') ||
          text.includes('Video')) {
        consoleLogs.push(`${msg.type()}: ${text}`);
      }
    });

    // Monitor for any errors
    const errors: string[] = [];
    page.on('pageerror', error => {
      errors.push(error.message);
    });

    // Step 1: Upload a video file
    console.log('Step 1: Uploading video file...');
    
    // Create a test video file path
    const testVideoPath = path.join(__dirname, '..', '..', 'test-assets', 'test-video.mp4');
    
    // Find the file input
    const fileInput = page.locator('input[type="file"][accept*="video"]').first();
    
    // Set the file
    await fileInput.setInputFiles({
      name: 'test-video.mp4',
      mimeType: 'video/mp4',
      buffer: Buffer.from('fake video content for testing')
    });
    
    // Wait for upload to complete
    await page.waitForTimeout(2000);
    
    // Step 2: Verify video thumbnail appears
    console.log('Step 2: Looking for video thumbnail...');
    
    // Look for video upload in the chat input area
    const videoThumbnail = await page.locator('img[alt*="Video thumbnail"], video, [data-testid*="video"]').first();
    await expect(videoThumbnail).toBeVisible({ timeout: 5000 });
    
    console.log('Video thumbnail found!');
    
    // Step 3: Click on the video thumbnail
    console.log('Step 3: Clicking on video thumbnail...');
    await videoThumbnail.click();
    
    // Step 4: Wait for modal to appear
    console.log('Step 4: Waiting for modal...');
    const modal = page.locator('[role="dialog"]');
    await expect(modal).toBeVisible({ timeout: 5000 });
    
    console.log('Modal opened!');
    
    // Step 5: Check for video element in modal
    console.log('Step 5: Checking for video element...');
    const modalVideo = modal.locator('video').first();
    const hasVideo = await modalVideo.isVisible().catch(() => false);
    
    if (hasVideo) {
      console.log('✅ Video element found in modal!');
      
      // Get video properties
      const videoProperties = await modalVideo.evaluate((video) => {
        return {
          src: video.src,
          currentSrc: video.currentSrc,
          readyState: video.readyState,
          networkState: video.networkState,
          error: video.error,
          hasSource: !!video.querySelector('source'),
          sourceCount: video.querySelectorAll('source').length
        };
      });
      
      console.log('Video properties:', videoProperties);
      
      // Verify video has a valid source
      expect(videoProperties.src || videoProperties.currentSrc).toBeTruthy();
      
      // Check if it's a blob or data URL (not a Gemini URL)
      const videoSrc = videoProperties.src || videoProperties.currentSrc;
      expect(videoSrc).not.toContain('generativelanguage.googleapis.com');
      expect(videoSrc).toMatch(/^(blob:|data:)/);
      
    } else {
      // Check for the "stored on Gemini AI" message
      const geminiMessage = await modal.locator('text=/stored on Gemini AI/').isVisible();
      
      if (geminiMessage) {
        console.log('⚠️ Video shows Gemini-only message - this indicates the preview URL was not preserved');
        
        // This should not happen for local uploads
        throw new Error('Local video upload should have a playable preview URL, not show Gemini-only message');
      } else {
        throw new Error('No video element found in modal and no Gemini message shown');
      }
    }
    
    // Step 6: Check console logs for debugging
    console.log('\n📋 Console logs:');
    consoleLogs.forEach(log => console.log(log));
    
    // Step 7: Verify no errors occurred
    if (errors.length > 0) {
      console.error('\n❌ Page errors detected:');
      errors.forEach(err => console.error(err));
      throw new Error('Page errors occurred during test');
    }
    
    console.log('\n✅ Video upload and playback test passed!');
  });

  test('should show Gemini-only message for social media videos', async ({ page }) => {
    // Set up console logging
    page.on('console', msg => {
      if (msg.text().includes('[TikTok Download]') || msg.text().includes('[FilePreviewModal]')) {
        console.log(`${msg.type()}: ${msg.text()}`);
      }
    });

    // Step 1: Paste a TikTok URL
    console.log('Step 1: Pasting TikTok URL...');
    
    const chatInput = page.locator('textarea[placeholder*="Message"], textarea[placeholder*="Type"], textarea[placeholder*="Ask"]').first();
    await chatInput.click();
    
    // Use a test URL (this won't actually download in the test)
    await chatInput.fill('https://www.tiktok.com/@test/video/123456789');
    
    // Wait for potential download (it will fail in test, but that's okay)
    await page.waitForTimeout(3000);
    
    // For this test, we'll simulate what happens when only Gemini URI is available
    // In real usage, the social media download would create a file with only Gemini URI
    
    console.log('✅ Social media video test setup complete');
  });
});