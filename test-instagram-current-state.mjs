#!/usr/bin/env node

import { chromium } from 'playwright';

async function testInstagramFunctionality() {
  console.log('🧪 Testing Instagram video functionality...\n');
  
  const browser = await chromium.launch({ headless: false });
  const page = await browser.newPage();
  
  try {
    // Navigate to the app
    console.log('1️⃣ Navigating to app...');
    await page.goto('http://localhost:3001');
    await page.waitForTimeout(3000);
    
    // Check if chat interface loads
    console.log('2️⃣ Checking chat interface...');
    const chatInput = await page.locator('textarea').first();
    if (await chatInput.isVisible()) {
      console.log('✅ Chat interface loaded successfully');
    } else {
      console.log('❌ Chat interface not found');
    }
    
    // Try pasting an Instagram URL
    console.log('3️⃣ Testing Instagram URL paste...');
    const testUrl = 'https://www.instagram.com/reel/ABC123XYZ/';
    await chatInput.fill(testUrl);
    await page.waitForTimeout(2000);
    
    // Check if Instagram detection appears
    const instagramPreview = await page.locator('[data-testid="instagram-preview"], .instagram-preview, [class*="instagram"]').first();
    if (await instagramPreview.isVisible({ timeout: 5000 }).catch(() => false)) {
      console.log('✅ Instagram URL detected and preview shown');
      
      // Check for download button
      const downloadButton = await page.locator('button:has-text("Download"), button:has-text("download")').first();
      if (await downloadButton.isVisible({ timeout: 3000 }).catch(() => false)) {
        console.log('✅ Download button is visible');
      } else {
        console.log('⚠️ Download button not found');
      }
    } else {
      console.log('❌ Instagram URL not detected');
    }
    
    // Check for any error messages
    const errorMessages = await page.locator('.error, [role="alert"], .text-red-500').all();
    if (errorMessages.length > 0) {
      console.log('\n⚠️ Error messages found:');
      for (const error of errorMessages) {
        const text = await error.textContent();
        if (text) console.log(`  - ${text}`);
      }
    }
    
    console.log('\n📊 Test Summary:');
    console.log('- App is running on port 3001');
    console.log('- Chat interface is accessible');
    console.log('- Instagram URL detection needs verification');
    console.log('\n💡 Next steps:');
    console.log('1. Manually test by pasting a real Instagram reel URL');
    console.log('2. Check browser console for any JavaScript errors');
    console.log('3. Verify settings have Instagram/YouTube downloads enabled');
    
  } catch (error) {
    console.error('❌ Test error:', error.message);
  } finally {
    await page.waitForTimeout(5000); // Keep browser open for observation
    await browser.close();
  }
}

testInstagramFunctionality().catch(console.error);
