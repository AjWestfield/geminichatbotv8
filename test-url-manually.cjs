#!/usr/bin/env node

const { chromium } = require('@playwright/test');

async function testURLPaste() {
  console.log('Starting manual URL paste test...\n');
  
  const browser = await chromium.launch({ 
    headless: false,  // Show browser window
    slowMo: 1000      // Slow down actions to see what's happening
  });
  
  const page = await browser.newPage();
  
  try {
    console.log('1. Navigating to http://localhost:3000...');
    await page.goto('http://localhost:3000');
    
    console.log('2. Waiting for page to load...');
    await page.waitForTimeout(5000);
    
    console.log('3. Taking screenshot of initial state...');
    await page.screenshot({ path: 'test-initial.png' });
    
    console.log('4. Looking for chat input...');
    // Try different selectors
    const selectors = [
      '[data-testid="chat-input"]',
      'textarea',
      'input[type="text"]',
      '[contenteditable="true"]',
      '.chat-input',
      '#ai-input-15'
    ];
    
    let inputFound = false;
    let chatInput;
    
    for (const selector of selectors) {
      try {
        chatInput = page.locator(selector).first();
        if (await chatInput.isVisible({ timeout: 1000 })) {
          console.log(`   Found input with selector: ${selector}`);
          inputFound = true;
          break;
        }
      } catch (e) {
        // Continue
      }
    }
    
    if (!inputFound) {
      console.log('   ERROR: Could not find chat input!');
      console.log('   Page title:', await page.title());
      console.log('   Page URL:', page.url());
      await page.screenshot({ path: 'test-no-input.png' });
      return;
    }
    
    console.log('5. Clicking on chat input...');
    await chatInput.click();
    
    console.log('6. Typing test URL...');
    await chatInput.fill('https://www.instagram.com/p/DLX1qBJpXxL');
    await page.waitForTimeout(1000);
    
    const valueAfterType = await chatInput.inputValue();
    console.log(`   Value after typing: "${valueAfterType}"`);
    
    console.log('7. Clearing and testing paste...');
    await chatInput.clear();
    
    // Use keyboard paste
    await chatInput.press('Control+a');
    await chatInput.press('Delete');
    await page.keyboard.type('https://www.instagram.com/p/test123');
    
    await page.waitForTimeout(1000);
    const valueAfterPaste = await chatInput.inputValue();
    console.log(`   Value after paste simulation: "${valueAfterPaste}"`);
    
    console.log('8. Taking final screenshot...');
    await page.screenshot({ path: 'test-final.png' });
    
    console.log('\n=== TEST RESULTS ===');
    console.log(`URL appears in input when typed: ${valueAfterType.includes('instagram.com')}`);
    console.log(`URL appears in input when pasted: ${valueAfterPaste.includes('instagram.com')}`);
    
    console.log('\nTest complete! Check test-*.png files for visual confirmation.');
    console.log('Browser will close in 5 seconds...');
    await page.waitForTimeout(5000);
    
  } catch (error) {
    console.error('Test failed:', error);
    await page.screenshot({ path: 'test-error.png' });
  } finally {
    await browser.close();
  }
}

testURLPaste().catch(console.error);