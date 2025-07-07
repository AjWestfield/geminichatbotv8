#!/usr/bin/env node

import { chromium } from 'playwright';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

console.log('🎥 Video Playback E2E Test');
console.log('========================\n');

async function testVideoPlayback() {
  const browser = await chromium.launch({ 
    headless: false,
    args: ['--disable-blink-features=AutomationControlled']
  });
  
  const context = await browser.newContext({
    viewport: { width: 1280, height: 720 }
  });
  
  const page = await context.newPage();
  
  // Set up console logging
  page.on('console', msg => {
    const text = msg.text();
    if (text.includes('[handleFileClick]') || 
        text.includes('[FilePreviewModal]') || 
        text.includes('[Video Proxy]') ||
        text.includes('Video') ||
        text.includes('video')) {
      console.log(`[Browser Console] ${msg.type()}: ${text}`);
    }
  });
  
  page.on('pageerror', error => {
    console.error('[Page Error]:', error.message);
  });

  try {
    console.log('1️⃣ Navigating to app...');
    await page.goto('http://localhost:3000');
    await page.waitForLoadState('networkidle');
    
    // Wait for chat interface
    await page.waitForSelector('[data-testid="chat-interface"]', { 
      timeout: 10000,
      state: 'visible' 
    });
    console.log('✅ Chat interface loaded');
    
    // Find file input
    console.log('\n2️⃣ Preparing to upload video file...');
    const fileInput = await page.locator('input[type="file"][accept*="video"]').first();
    
    // Create a test video file path (you'll need to adjust this to a real video file)
    const testVideoPath = join(__dirname, 'test-assets', 'sample-video.mp4');
    
    console.log('📁 Looking for test video at:', testVideoPath);
    
    // For this test, we'll use a YouTube URL instead
    console.log('\n3️⃣ Testing with YouTube URL instead...');
    
    // Focus on the chat input
    const chatInput = await page.locator('textarea[placeholder*="Message"], textarea[placeholder*="Type"], textarea[placeholder*="Ask"]').first();
    await chatInput.click();
    await page.waitForTimeout(500);
    
    // Type a YouTube URL to test auto-download
    const youtubeUrl = 'https://www.youtube.com/watch?v=dQw4w9WgXcQ';
    console.log('📝 Pasting YouTube URL:', youtubeUrl);
    await chatInput.fill(youtubeUrl);
    
    // Wait for auto-download to trigger
    console.log('\n4️⃣ Waiting for auto-download...');
    await page.waitForTimeout(3000);
    
    // Check if a video thumbnail appears
    const videoThumbnail = await page.locator('img[alt*="Video thumbnail"], video, [data-testid*="video"]').first();
    const hasThumbnail = await videoThumbnail.isVisible().catch(() => false);
    
    if (hasThumbnail) {
      console.log('✅ Video thumbnail detected');
      
      // Click on the thumbnail
      console.log('\n5️⃣ Clicking on video thumbnail...');
      await videoThumbnail.click();
      
      // Wait for modal to appear
      await page.waitForSelector('[role="dialog"]', { timeout: 5000 });
      console.log('✅ Modal dialog opened');
      
      // Check for video element in modal
      const modalVideo = await page.locator('[role="dialog"] video').first();
      const hasVideo = await modalVideo.isVisible().catch(() => false);
      
      if (hasVideo) {
        console.log('✅ Video element found in modal');
        
        // Check video source
        const videoSrc = await modalVideo.evaluate((video) => {
          const source = video.querySelector('source');
          return {
            src: source?.src || video.src,
            type: source?.type || video.type,
            error: video.error,
            readyState: video.readyState,
            networkState: video.networkState
          };
        });
        
        console.log('\n📊 Video element state:');
        console.log('- Source:', videoSrc.src);
        console.log('- Type:', videoSrc.type);
        console.log('- Ready State:', videoSrc.readyState);
        console.log('- Network State:', videoSrc.networkState);
        console.log('- Error:', videoSrc.error);
        
        // Try to play the video
        console.log('\n6️⃣ Attempting to play video...');
        await modalVideo.evaluate((video) => video.play()).catch(err => {
          console.error('❌ Play error:', err.message);
        });
        
        await page.waitForTimeout(2000);
        
        // Check if video is playing
        const isPlaying = await modalVideo.evaluate((video) => !video.paused);
        if (isPlaying) {
          console.log('✅ Video is playing successfully!');
        } else {
          console.log('⚠️ Video is not playing');
        }
        
      } else {
        console.log('❌ Video element not found in modal');
        
        // Check for error messages
        const errorMessage = await page.locator('[role="dialog"] .text-red-400').textContent().catch(() => null);
        if (errorMessage) {
          console.log('🔴 Error message:', errorMessage);
        }
      }
      
    } else {
      console.log('⚠️ No video thumbnail found - checking for direct file upload...');
      
      // Alternative: try direct file upload simulation
      console.log('\n🔄 Simulating direct video upload...');
      
      // Create a test video blob
      const videoBlob = new Blob(['test video content'], { type: 'video/mp4' });
      const fileName = 'test-video.mp4';
      
      // Simulate file drop
      await page.evaluate(({ fileName, mimeType }) => {
        const dataTransfer = new DataTransfer();
        const file = new File(['test content'], fileName, { type: mimeType });
        dataTransfer.items.add(file);
        
        const dropEvent = new DragEvent('drop', {
          dataTransfer,
          bubbles: true,
          cancelable: true
        });
        
        const chatInput = document.querySelector('textarea');
        if (chatInput) {
          chatInput.dispatchEvent(dropEvent);
        }
      }, { fileName, mimeType: 'video/mp4' });
      
      await page.waitForTimeout(2000);
    }
    
    // Final check for any console errors
    console.log('\n7️⃣ Final checks...');
    await page.waitForTimeout(1000);
    
    console.log('\n✅ Test completed!');
    
  } catch (error) {
    console.error('\n❌ Test failed:', error.message);
    
    // Take screenshot on error
    await page.screenshot({ 
      path: 'video-playback-error.png',
      fullPage: true 
    });
    console.log('📸 Screenshot saved as video-playback-error.png');
    
  } finally {
    await page.waitForTimeout(3000); // Keep open for manual inspection
    await browser.close();
  }
}

// Run the test
testVideoPlayback().catch(console.error);