#!/usr/bin/env node

// Test script to verify image persistence fix
import { chromium } from 'playwright'

async function testImagePersistence() {
  console.log('🧪 Testing image persistence fix...\n')
  
  const browser = await chromium.launch({ headless: false })
  const page = await browser.newPage()
  
  try {
    // Navigate to the app
    console.log('1️⃣ Navigating to the app...')
    await page.goto('http://localhost:3001')
    await page.waitForTimeout(3000)
    
    // Click on the images tab
    console.log('2️⃣ Clicking on images tab...')
    await page.click('button:has-text("Images")')
    await page.waitForTimeout(1000)
    
    // Create a test image file
    console.log('3️⃣ Creating test image for upload...')
    const buffer = Buffer.from('data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg=='.split(',')[1], 'base64')
    
    // Upload the image
    console.log('4️⃣ Uploading image to gallery...')
    const fileInput = await page.locator('input[type="file"]').first()
    await fileInput.setInputFiles({
      name: 'test-image.png',
      mimeType: 'image/png',
      buffer
    })
    
    // Wait for upload to complete
    await page.waitForTimeout(3000)
    
    // Check if image appears
    console.log('5️⃣ Checking if image appears in gallery...')
    const imageCount = await page.locator('[data-testid="image-gallery"] img').count()
    console.log(`   Found ${imageCount} image(s) in gallery`)
    
    if (imageCount === 0) {
      throw new Error('No images found after upload!')
    }
    
    // Refresh the page
    console.log('6️⃣ Refreshing the page...')
    await page.reload()
    await page.waitForTimeout(3000)
    
    // Click on images tab again
    console.log('7️⃣ Clicking on images tab after refresh...')
    await page.click('button:has-text("Images")')
    await page.waitForTimeout(1000)
    
    // Check if image still appears
    console.log('8️⃣ Checking if image persists after refresh...')
    const imageCountAfterRefresh = await page.locator('[data-testid="image-gallery"] img').count()
    console.log(`   Found ${imageCountAfterRefresh} image(s) in gallery after refresh`)
    
    if (imageCountAfterRefresh === 0) {
      console.log('❌ TEST FAILED: Images disappeared after refresh!')
      console.log('   The fix may not be working properly.')
    } else {
      console.log('✅ TEST PASSED: Images persist after refresh!')
      console.log('   The fix is working correctly.')
    }
    
  } catch (error) {
    console.error('❌ Test failed with error:', error.message)
  } finally {
    console.log('\n🔧 Keeping browser open for manual inspection...')
    console.log('   Press Ctrl+C to close.')
    
    // Keep browser open for inspection
    await new Promise(() => {})
  }
}

testImagePersistence().catch(console.error)
