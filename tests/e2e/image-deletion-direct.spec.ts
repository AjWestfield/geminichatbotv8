import { test, expect } from '@playwright/test'

test.describe('Direct Image Deletion Tests', () => {
  test.beforeEach(async ({ page }) => {
    // Go to the application
    await page.goto('/')
    
    // Wait for app to load
    await page.waitForLoadState('networkidle')
  })

  test('should handle image deletion with localStorage-only images', async ({ page }) => {
    // Inject test image directly into localStorage
    await page.evaluate(() => {
      const testImage = {
        id: 'img_test_e2e_' + Date.now(),
        url: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==',
        prompt: 'E2E Test Image for Deletion',
        model: 'test',
        quality: 'standard',
        created_at: new Date().toISOString()
      };
      
      const existingImages = JSON.parse(localStorage.getItem('generated-images') || '[]');
      existingImages.push(testImage);
      localStorage.setItem('generated-images', JSON.stringify(existingImages));
    })

    // Navigate to Images tab
    await page.click('[data-testid="images-tab"]')
    await page.waitForSelector('[data-testid="image-gallery"]', { timeout: 5000 })

    // Verify image is visible
    const imageCards = await page.locator('.group.relative.aspect-square').count()
    expect(imageCards).toBeGreaterThan(0)

    // Get initial count
    const initialCount = imageCards

    // Hover over first image to show actions
    const firstImage = page.locator('.group.relative.aspect-square').first()
    await firstImage.hover()

    // Click delete button
    await firstImage.locator('button[title="Delete image"]').click()

    // Confirm deletion in dialog
    await page.waitForSelector('text="Delete Image"', { timeout: 5000 })
    await page.click('button:has-text("Delete Image"):not([title])')

    // Wait for deletion to complete
    await page.waitForTimeout(1000)

    // Verify image was deleted
    const finalCount = await page.locator('.group.relative.aspect-square').count()
    expect(finalCount).toBe(initialCount - 1)

    // Verify success toast
    await expect(page.locator('text="Image deleted successfully"')).toBeVisible()

    // Verify image is removed from localStorage
    const remainingImages = await page.evaluate(() => {
      return JSON.parse(localStorage.getItem('generated-images') || '[]').length
    })
    expect(remainingImages).toBe(finalCount)
  })

  test('should successfully delete image when API returns localStorage-only response', async ({ page }) => {
    // Inject test image
    const testImageId = 'img_test_api_' + Date.now()
    await page.evaluate((id) => {
      const testImage = {
        id: id,
        url: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg==',
        prompt: 'API Test Image',
        model: 'test',
        quality: 'standard',
        created_at: new Date().toISOString()
      };
      
      localStorage.setItem('generated-images', JSON.stringify([testImage]));
    }, testImageId)

    // Navigate to Images tab
    await page.click('[data-testid="images-tab"]')
    await page.waitForSelector('[data-testid="image-gallery"]', { timeout: 5000 })

    // Set up response interceptor to log API calls
    const apiResponses: any[] = []
    page.on('response', response => {
      if (response.url().includes('/api/images/') && response.request().method() === 'DELETE') {
        apiResponses.push({
          url: response.url(),
          status: response.status(),
          statusText: response.statusText()
        })
      }
    })

    // Delete the image
    const firstImage = page.locator('.group.relative.aspect-square').first()
    await firstImage.hover()
    await firstImage.locator('button[title="Delete image"]').click()
    await page.waitForSelector('text="Delete Image"', { timeout: 5000 })
    await page.click('button:has-text("Delete Image"):not([title])')

    // Wait for API call
    await page.waitForTimeout(1000)

    // Verify API returned success
    expect(apiResponses.length).toBeGreaterThan(0)
    expect(apiResponses[0].status).toBe(200)

    // Verify toast message
    await expect(page.locator('text="Image deleted successfully"')).toBeVisible()

    // Verify localStorage is empty
    const remainingImages = await page.evaluate(() => {
      return JSON.parse(localStorage.getItem('generated-images') || '[]').length
    })
    expect(remainingImages).toBe(0)
  })

  test('should handle bulk deletion of localStorage images', async ({ page }) => {
    // Inject multiple test images
    await page.evaluate(() => {
      const testImages = Array.from({ length: 3 }, (_, i) => ({
        id: 'img_bulk_test_' + Date.now() + '_' + i,
        url: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==',
        prompt: `Bulk Test Image ${i + 1}`,
        model: 'test',
        quality: 'standard',
        created_at: new Date().toISOString()
      }));
      
      localStorage.setItem('generated-images', JSON.stringify(testImages));
    })

    // Navigate to Images tab
    await page.click('[data-testid="images-tab"]')
    await page.waitForSelector('[data-testid="image-gallery"]', { timeout: 5000 })

    // Enter selection mode
    await page.click('button:has-text("Select")')

    // Select all images
    const images = page.locator('.group.relative.aspect-square')
    const imageCount = await images.count()
    
    for (let i = 0; i < imageCount; i++) {
      await images.nth(i).click()
    }

    // Click bulk delete button
    await page.click('button:has-text("Delete Selected")')

    // Confirm deletion
    await page.waitForSelector('text="Delete Selected Images"', { timeout: 5000 })
    await page.click('button:has-text("Delete"):has-text("Images")')

    // Wait for deletion to complete
    await page.waitForTimeout(2000)

    // Verify all images were deleted
    const finalCount = await page.locator('.group.relative.aspect-square').count()
    expect(finalCount).toBe(0)

    // Verify success toast
    await expect(page.locator('text=Successfully deleted')).toBeVisible()

    // Verify localStorage is empty
    const remainingImages = await page.evaluate(() => {
      return JSON.parse(localStorage.getItem('generated-images') || '[]').length
    })
    expect(remainingImages).toBe(0)
  })

  test('should show empty state after deleting all images', async ({ page }) => {
    // Inject a single test image
    await page.evaluate(() => {
      const testImage = {
        id: 'img_empty_test_' + Date.now(),
        url: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==',
        prompt: 'Last Image Test',
        model: 'test',
        quality: 'standard',
        created_at: new Date().toISOString()
      };
      
      localStorage.setItem('generated-images', JSON.stringify([testImage]));
    })

    // Navigate to Images tab
    await page.click('[data-testid="images-tab"]')
    await page.waitForSelector('[data-testid="image-gallery"]', { timeout: 5000 })

    // Delete the image
    const firstImage = page.locator('.group.relative.aspect-square').first()
    await firstImage.hover()
    await firstImage.locator('button[title="Delete image"]').click()
    await page.waitForSelector('text="Delete Image"', { timeout: 5000 })
    await page.click('button:has-text("Delete Image"):not([title])')

    // Wait for deletion
    await page.waitForTimeout(1000)

    // Verify empty state is shown
    await expect(page.locator('text="No Images Generated Yet"')).toBeVisible()
    await expect(page.locator('text="Start generating images by typing prompts"')).toBeVisible()
    
    // Verify data-testid is still present for consistency
    await expect(page.locator('[data-testid="image-gallery"]')).toBeVisible()
  })
})