import { chromium } from 'playwright';

async function testImageDeletion() {
  console.log('🧪 Quick Image Deletion Test');
  console.log('============================\n');
  
  const browser = await chromium.launch({ headless: false });
  const page = await browser.newPage();
  
  try {
    // Navigate to the app
    console.log('1. Navigating to app...');
    await page.goto('http://localhost:3000');
    await page.waitForLoadState('networkidle');
    
    // Add test image via console
    console.log('2. Adding test image to localStorage...');
    await page.evaluate(() => {
      const testImage = {
        id: 'img_quick_test_' + Date.now(),
        url: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAoAAAAKCAYAAACNMs+9AAAAFUlEQVR42mP8/5+hnoEIwDiqkL4KAcT9GO0U4BxoAAAAAElFTkSuQmCC',
        prompt: 'Quick test - red square',
        model: 'test',
        quality: 'standard',
        timestamp: new Date().toISOString()
      };
      
      const images = JSON.parse(localStorage.getItem('generatedImages') || '[]');
      images.push(testImage);
      localStorage.setItem('generatedImages', JSON.stringify(images));
      console.log('Added test image:', testImage.id);
    });
    
    // Navigate to Images tab
    console.log('3. Navigating to Images tab...');
    await page.click('[data-testid="images-tab"]');
    await page.waitForTimeout(1000);
    
    // Force a page reload to trigger localStorage loading
    console.log('   Reloading page to trigger localStorage loading...');
    await page.reload();
    await page.waitForLoadState('networkidle');
    
    // Navigate back to Images tab
    await page.click('[data-testid="images-tab"]');
    await page.waitForTimeout(1000);
    
    // Check if image is visible
    const imageCount = await page.locator('.group.relative.aspect-square').count();
    console.log(`   Found ${imageCount} images in gallery`);
    
    if (imageCount > 0) {
      // Capture current state
      await page.screenshot({ path: 'before-deletion.png' });
      
      // Try to delete first image
      console.log('4. Attempting to delete image...');
      const firstImage = page.locator('.group.relative.aspect-square').first();
      await firstImage.hover();
      
      // Look for delete button
      const deleteButton = firstImage.locator('button[title="Delete image"]');
      const hasDeleteButton = await deleteButton.isVisible();
      
      if (hasDeleteButton) {
        await deleteButton.click();
        console.log('   Clicked delete button');
        
        // Wait for confirmation dialog
        await page.waitForSelector('text="Delete Image"', { timeout: 5000 });
        await page.click('button:has-text("Delete Image"):not([title])');
        console.log('   Confirmed deletion');
        
        // Wait for toast
        await page.waitForTimeout(2000);
        
        // Check for success
        const successToast = await page.locator('text="Image deleted successfully"').isVisible();
        console.log(`   Success toast visible: ${successToast}`);
        
        // Capture after state
        await page.screenshot({ path: 'after-deletion.png' });
        
        // Check final count
        const finalCount = await page.locator('.group.relative.aspect-square').count();
        console.log(`   Images after deletion: ${finalCount}`);
        console.log(`   ✅ Deletion ${finalCount < imageCount ? 'SUCCESSFUL' : 'FAILED'}`);
      } else {
        console.log('   ❌ Delete button not found');
      }
    } else {
      console.log('   ⚠️  No images found in gallery');
      console.log('   This might mean localStorage images are not being loaded');
    }
    
    // Test API directly
    console.log('\n5. Testing API directly...');
    const apiResponse = await page.evaluate(async () => {
      const response = await fetch('/api/images/img_test_api_check', {
        method: 'DELETE'
      });
      return {
        status: response.status,
        data: await response.json()
      };
    });
    
    console.log('   API Response:', apiResponse);
    console.log(`   ✅ API returns success: ${apiResponse.data.success === true}`);
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  } finally {
    console.log('\nTest complete. Browser will close in 5 seconds...');
    await page.waitForTimeout(5000);
    await browser.close();
  }
}

testImageDeletion().catch(console.error);