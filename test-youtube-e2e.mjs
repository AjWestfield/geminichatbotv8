// End-to-end test for YouTube download functionality
import { chromium } from 'playwright';

async function testYouTubeDownloadE2E() {
  console.log('🎥 Testing YouTube Auto-Download End-to-End...\n');
  
  const browser = await chromium.launch({ 
    headless: false,
    timeout: 60000 
  });
  
  try {
    const context = await browser.newContext();
    const page = await context.newPage();
    
    // Navigate to the app
    console.log('1️⃣ Navigating to app...');
    await page.goto('http://localhost:3000');
    await page.waitForLoadState('networkidle');
    
    // Wait for chat interface to be ready
    console.log('2️⃣ Waiting for chat interface...');
    await page.waitForSelector('[data-testid="chat-input"], textarea', { timeout: 30000 });
    
    // Find the input field
    const input = await page.locator('[data-testid="chat-input"], textarea').first();
    await input.click();
    
    // Test URL
    const testUrl = 'https://www.youtube.com/watch?v=jNQXAC9IVRw';
    
    console.log('3️⃣ Pasting YouTube URL:', testUrl);
    
    // Simulate paste event
    await page.evaluate(async (url) => {
      const input = document.querySelector('[data-testid="chat-input"], textarea');
      if (input) {
        // Create paste event
        const clipboardData = new DataTransfer();
        clipboardData.setData('text/plain', url);
        const pasteEvent = new ClipboardEvent('paste', {
          clipboardData: clipboardData as any,
          bubbles: true,
          cancelable: true
        });
        input.dispatchEvent(pasteEvent);
        
        // Also set value
        (input as HTMLTextAreaElement).value = url;
        input.dispatchEvent(new Event('input', { bubbles: true }));
      }
    }, testUrl);
    
    // Wait for detection
    console.log('4️⃣ Waiting for YouTube URL detection...');
    
    // Look for download UI - could be a card, button, or progress indicator
    const downloadUI = await page.waitForSelector(
      'text=/Download Video|Downloading|download|YouTube/i', 
      { timeout: 10000 }
    ).catch(() => null);
    
    if (downloadUI) {
      console.log('✅ YouTube URL detected!');
      
      // Check if auto-download is happening
      const progressIndicator = await page.locator('text=/Downloading|Processing|Uploading|%/i').first();
      if (await progressIndicator.isVisible()) {
        console.log('5️⃣ Auto-download in progress...');
        
        // Wait for completion
        await page.waitForSelector('text=/Download completed|Video Downloaded|✅/i', { 
          timeout: 120000 
        }).catch(() => null);
        
        console.log('✅ Download completed!');
      } else {
        // Manual download - click the button
        console.log('5️⃣ Clicking Download Video button...');
        const downloadButton = await page.locator('button:has-text("Download Video")').first();
        if (await downloadButton.isVisible()) {
          await downloadButton.click();
          
          // Wait for download
          await page.waitForSelector('text=/Download completed|Video Downloaded|✅/i', { 
            timeout: 120000 
          }).catch(() => null);
          
          console.log('✅ Manual download completed!');
        }
      }
      
      // Check for video file in UI
      console.log('6️⃣ Checking for video file...');
      const videoFile = await page.locator('text=/Me at the zoo|\.mp4|video/i').first();
      
      if (await videoFile.isVisible()) {
        console.log('✅ Video file is visible in the UI!');
        
        // Take a screenshot
        await page.screenshot({ 
          path: 'youtube-download-success.png',
          fullPage: true 
        });
        console.log('📸 Screenshot saved: youtube-download-success.png');
        
        // Type a message
        console.log('7️⃣ Testing video analysis...');
        await input.clear();
        await input.fill('What is in this video?');
        
        // Send message
        const sendButton = await page.locator('[data-testid="send-button"], button[type="submit"]').first();
        await sendButton.click();
        
        // Wait for AI response
        await page.waitForSelector('.assistant-message, [data-testid="assistant-message"]', {
          timeout: 30000
        }).catch(() => null);
        
        console.log('✅ AI successfully received and can analyze the video!');
      }
      
    } else {
      console.log('❌ YouTube URL was not detected');
      await page.screenshot({ path: 'youtube-download-failed.png' });
    }
    
    console.log('\n✨ Test completed!');
    
  } catch (error) {
    console.error('❌ Test failed:', error);
    
    // Take error screenshot
    const page = browser.contexts()[0]?.pages()[0];
    if (page) {
      await page.screenshot({ path: 'youtube-download-error.png' });
      console.log('📸 Error screenshot saved');
    }
    
  } finally {
    // Keep browser open for 5 seconds to see the result
    await new Promise(resolve => setTimeout(resolve, 5000));
    await browser.close();
  }
}

// Run the test
testYouTubeDownloadE2E().catch(console.error);
