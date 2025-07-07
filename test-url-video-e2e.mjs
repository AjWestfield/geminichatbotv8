
import { chromium } from 'playwright';

async function testUrlToVideo() {
  console.log('🧪 Testing URL to Video Functionality\n');
  
  const browser = await chromium.launch({ headless: false });
  const page = await browser.newPage();
  
  try {
    // Navigate to app
    await page.goto('http://localhost:3000');
    await page.waitForLoadState('networkidle');
    
    // Find chat input
    const input = await page.locator('textarea[placeholder*="Type"], textarea[placeholder*="What"]').first();
    await input.click();
    
    // Test YouTube URL
    const testUrl = 'https://www.youtube.com/watch?v=jNQXAC9IVRw';
    console.log('📋 Pasting YouTube URL:', testUrl);
    
    await input.fill(testUrl);
    await page.waitForTimeout(1000);
    
    // Check for download UI
    const downloadUI = await page.locator('text=/download|progress/i').first();
    if (await downloadUI.isVisible()) {
      console.log('✅ Download UI detected!');
    } else {
      console.log('❌ No download UI found');
    }
    
    // Wait for file to appear
    const fileUI = await page.locator('[data-file-name*=".mp4"]').first();
    if (await fileUI.isVisible({ timeout: 30000 })) {
      console.log('✅ Video file appeared!');
    } else {
      console.log('❌ Video file did not appear');
    }
    
  } catch (error) {
    console.error('Test error:', error);
  } finally {
    await browser.close();
  }
}

testUrlToVideo();
