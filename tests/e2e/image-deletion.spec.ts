import { test, expect } from '@playwright/test'

test.describe('Image Deletion', () => {
  test.beforeEach(async ({ page }) => {
    // Go to the application
    await page.goto('/')
    
    // Wait for app to load by checking for the AI Assistant header
    await page.waitForSelector('h1:has-text("AI Assistant")', { timeout: 10000 })
  })

  test('should delete image from gallery', async ({ page }) => {
    // Navigate to Images tab using the data-testid
    await page.click('[data-testid="images-tab"]')
    await page.waitForSelector('[data-testid="image-gallery"]', { timeout: 5000 })

    // Check if there are any images
    const imageCards = await page.locator('.group.relative.aspect-square').count()
    
    if (imageCards === 0) {
      // Generate a test image first
      await page.click('button:has-text("Chat")')
      await page.fill('textarea[placeholder*="Type your message"]', 'Generate an image of a red cube')
      await page.keyboard.press('Enter')
      
      // Wait for image generation
      await page.waitForTimeout(5000)
      
      // Go back to Images tab
      await page.click('[data-testid="images-tab"]')
      await page.waitForSelector('.group.relative.aspect-square', { timeout: 30000 })
    }

    // Get initial image count
    const initialCount = await page.locator('.group.relative.aspect-square').count()
    console.log(`Initial image count: ${initialCount}`)

    // Hover over first image to show actions
    const firstImage = page.locator('.group.relative.aspect-square').first()
    await firstImage.hover()

    // Click delete button
    await firstImage.locator('button[title="Delete image"]').click()

    // Confirm deletion in dialog
    await page.waitForSelector('text="Delete Image"', { timeout: 5000 })
    await page.click('button:has-text("Delete Image"):not([title])')

    // Wait for deletion to complete
    await page.waitForTimeout(2000)

    // Verify image was deleted
    const finalCount = await page.locator('.group.relative.aspect-square').count()
    console.log(`Final image count: ${finalCount}`)
    
    expect(finalCount).toBe(initialCount - 1)

    // Verify success toast
    await expect(page.locator('text="Image deleted successfully"')).toBeVisible()
  })

  test('should delete multiple images in bulk', async ({ page }) => {
    // Navigate to Images tab
    await page.click('[data-testid="images-tab"]')
    await page.waitForSelector('[data-testid="image-gallery"]', { timeout: 5000 })

    // Check if there are enough images
    const imageCards = await page.locator('.group.relative.aspect-square').count()
    
    if (imageCards < 2) {
      // Generate test images
      await page.click('button:has-text("Chat")')
      
      for (let i = 0; i < 2; i++) {
        await page.fill('textarea[placeholder*="Type your message"]', `Generate an image of a ${i === 0 ? 'blue' : 'green'} sphere`)
        await page.keyboard.press('Enter')
        await page.waitForTimeout(3000)
      }
      
      // Go back to Images tab
      await page.click('[data-testid="images-tab"]')
      await page.waitForTimeout(2000)
    }

    // Get initial count
    const initialCount = await page.locator('.group.relative.aspect-square').count()
    console.log(`Initial image count for bulk delete: ${initialCount}`)

    // Enter selection mode
    await page.click('button:has-text("Select")')

    // Select first two images
    const images = page.locator('.group.relative.aspect-square')
    await images.nth(0).click()
    await images.nth(1).click()

    // Click bulk delete button
    await page.click('button:has-text("Delete Selected")')

    // Confirm deletion
    await page.waitForSelector('text="Delete Selected Images"', { timeout: 5000 })
    await page.click('button:has-text("Delete 2 Images")')

    // Wait for deletion to complete
    await page.waitForTimeout(3000)

    // Verify images were deleted
    const finalCount = await page.locator('.group.relative.aspect-square').count()
    console.log(`Final image count after bulk delete: ${finalCount}`)
    
    expect(finalCount).toBe(initialCount - 2)

    // Verify success toast
    await expect(page.locator('text="Successfully deleted 2 images"')).toBeVisible()
  })

  test('should handle deletion errors gracefully', async ({ page }) => {
    // Navigate to Images tab
    await page.click('[data-testid="images-tab"]')
    await page.waitForSelector('[data-testid="image-gallery"]', { timeout: 5000 })

    // Intercept the delete API call to simulate an error
    await page.route('**/api/images/*', (route) => {
      if (route.request().method() === 'DELETE') {
        route.fulfill({
          status: 500,
          contentType: 'application/json',
          body: JSON.stringify({ error: 'Test error: Failed to delete image' })
        })
      } else {
        route.continue()
      }
    })

    // Check if there are any images
    const imageCards = await page.locator('.group.relative.aspect-square').count()
    
    if (imageCards > 0) {
      // Hover over first image
      const firstImage = page.locator('.group.relative.aspect-square').first()
      await firstImage.hover()

      // Click delete button
      await firstImage.locator('button[title="Delete image"]').click()

      // Confirm deletion
      await page.waitForSelector('text="Delete Image"', { timeout: 5000 })
      await page.click('button:has-text("Delete Image"):not([title])')

      // Wait for error
      await page.waitForTimeout(2000)

      // Verify error toast
      await expect(page.locator('text="Test error: Failed to delete image"')).toBeVisible()

      // Verify image was not deleted
      const finalCount = await page.locator('.group.relative.aspect-square').count()
      expect(finalCount).toBe(imageCards)
    }
  })
})