#!/usr/bin/env node

import { chromium } from 'playwright';

console.log('🎥 Testing Video Upload and Playback Fix');
console.log('======================================\n');

async function testVideoPlayback() {
  const browser = await chromium.launch({ 
    headless: false,
    args: ['--disable-blink-features=AutomationControlled']
  });
  
  const context = await browser.newContext({
    viewport: { width: 1280, height: 720 }
  });
  
  const page = await context.newPage();
  
  // Capture console logs
  const logs = [];
  page.on('console', msg => {
    const text = msg.text();
    if (text.includes('[Upload]') || 
        text.includes('[handleFileClick]') || 
        text.includes('[FilePreviewModal]') ||
        text.includes('[processFile]') ||
        text.includes('preview')) {
      logs.push(`[${msg.type()}] ${text}`);
      console.log(`[Browser] ${text}`);
    }
  });
  
  page.on('pageerror', error => {
    console.error('[Page Error]:', error.message);
  });

  try {
    console.log('1️⃣ Navigating to app...');
    await page.goto('http://localhost:3000');
    await page.waitForLoadState('networkidle');
    
    console.log('2️⃣ Waiting for chat interface...');
    // Wait for the main chat container or input
    await page.waitForSelector('textarea[placeholder*="Message"], textarea[placeholder*="Type"], .chat-interface, main', { 
      timeout: 10000,
      state: 'visible' 
    });
    
    console.log('3️⃣ Creating test video file...');
    
    // Find file input
    const fileInput = await page.locator('input[type="file"][accept*="video"]').first();
    
    // Create a test video file
    await fileInput.setInputFiles({
      name: 'test-video.mp4',
      mimeType: 'video/mp4',
      buffer: Buffer.from('This is a fake video file for testing. In real usage, this would be actual video data.')
    });
    
    console.log('4️⃣ Waiting for upload to complete...');
    await page.waitForTimeout(3000);
    
    console.log('5️⃣ Looking for video thumbnail...');
    
    // Look for video elements or thumbnails
    const videoSelectors = [
      'video',
      'img[alt*="Video"]',
      'img[alt*="video"]',
      '[data-testid*="video"]',
      '.rounded-lg img' // Common class for thumbnails
    ];
    
    let videoElement = null;
    for (const selector of videoSelectors) {
      const element = await page.locator(selector).first();
      if (await element.isVisible().catch(() => false)) {
        videoElement = element;
        console.log(`✅ Found video element with selector: ${selector}`);
        break;
      }
    }
    
    if (!videoElement) {
      console.log('❌ No video thumbnail found');
      console.log('\n📋 Debug: Looking for any clickable elements...');
      const clickables = await page.locator('img, video, button').all();
      for (const el of clickables) {
        const text = await el.textContent().catch(() => '');
        const alt = await el.getAttribute('alt').catch(() => '');
        const src = await el.getAttribute('src').catch(() => '');
        if (text || alt || src) {
          console.log(`- Found: ${await el.evaluate(e => e.tagName)} - alt="${alt}", src="${src?.substring(0, 50)}..."`);
        }
      }
      return;
    }
    
    console.log('6️⃣ Clicking on video thumbnail...');
    await videoElement.click();
    
    console.log('7️⃣ Waiting for modal...');
    const modal = await page.locator('[role="dialog"]');
    await modal.waitFor({ state: 'visible', timeout: 5000 });
    
    console.log('8️⃣ Checking modal content...');
    
    // Check for video in modal
    const modalVideo = await modal.locator('video').first();
    const hasVideo = await modalVideo.isVisible().catch(() => false);
    
    if (hasVideo) {
      console.log('✅ Video element found in modal!');
      
      // Get video details
      const videoInfo = await modalVideo.evaluate((video) => {
        const sources = Array.from(video.querySelectorAll('source')).map(s => ({
          src: s.src,
          type: s.type
        }));
        
        return {
          src: video.src,
          currentSrc: video.currentSrc,
          sources,
          readyState: video.readyState,
          networkState: video.networkState,
          error: video.error ? { code: video.error.code, message: video.error.message } : null
        };
      });
      
      console.log('\n📊 Video element details:');
      console.log(JSON.stringify(videoInfo, null, 2));
      
      if (videoInfo.src && !videoInfo.src.includes('generativelanguage.googleapis.com')) {
        console.log('\n✅ SUCCESS: Video has a valid local URL!');
        console.log(`   URL type: ${videoInfo.src.startsWith('blob:') ? 'Blob URL' : videoInfo.src.startsWith('data:') ? 'Data URL' : 'Other'}`);
      } else {
        console.log('\n❌ ISSUE: Video URL is missing or is a Gemini URL');
      }
      
    } else {
      // Check for Gemini message
      const geminiText = await modal.locator('text=/stored on Gemini AI/').isVisible();
      if (geminiText) {
        console.log('⚠️ Modal shows "stored on Gemini AI" message');
        console.log('This indicates the local preview URL was not preserved!');
      } else {
        console.log('❌ No video element and no Gemini message in modal');
      }
    }
    
    console.log('\n📋 Console logs summary:');
    logs.slice(-10).forEach(log => console.log(log));
    
  } catch (error) {
    console.error('\n❌ Test failed:', error.message);
    
    // Take screenshot
    await page.screenshot({ 
      path: 'video-playback-test-error.png',
      fullPage: true 
    });
    console.log('📸 Screenshot saved as video-playback-test-error.png');
    
  } finally {
    console.log('\n🏁 Test complete. Browser will close in 5 seconds...');
    await page.waitForTimeout(5000);
    await browser.close();
  }
}

// Run the test
testVideoPlayback().catch(console.error);