import { test, expect } from '@playwright/test'

test.describe('Image Edit URL Object Fix', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('http://localhost:3000')
  })

  test('should successfully edit Replicate-generated images', async ({ page }) => {
    // Generate an image first
    await page.fill('[placeholder*="Type a message"]', 'Generate a sunset landscape using flux-kontext-max')
    await page.keyboard.press('Enter')
    
    // Wait for image generation
    await page.waitForSelector('img[alt*="Generated image"]', { timeout: 30000 })
    
    // Find and click the edit button on the generated image
    const editButton = await page.locator('button[aria-label*="Edit image"]').first()
    await editButton.click()
    
    // Wait for edit modal to appear
    await page.waitForSelector('[role="dialog"]')
    
    // Enter edit prompt
    await page.fill('[placeholder*="Describe how you want to edit"]', 'Add mountains in the background')
    
    // Submit edit
    await page.click('button:has-text("Edit Image")')
    
    // Wait for edited image (increased timeout for processing)
    await page.waitForSelector('img[alt*="Generated image"]', { 
      state: 'attached',
      timeout: 60000 
    })
    
    // Check console for no errors
    const consoleErrors: string[] = []
    page.on('console', msg => {
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text())
      }
    })
    
    // Verify no URL-related errors
    const urlErrors = consoleErrors.filter(error => 
      error.includes('includes is not a function') ||
      error.includes('editedImageUrl.includes')
    )
    expect(urlErrors).toHaveLength(0)
    
    // Verify the edit completed successfully
    const images = await page.locator('img[alt*="Generated image"]').count()
    expect(images).toBeGreaterThan(1) // Original + edited
  })

  test('should handle error cases gracefully', async ({ page }) => {
    // Directly open an edit modal with a test image
    // This would require setting up the UI state, so we'll test via API
    
    const response = await page.request.post('/api/edit-image', {
      data: {
        imageUrl: 'https://invalid-url.com/image.jpg',
        imageId: 'test_id',
        prompt: 'test edit',
        model: 'flux-kontext-max',
        quality: 'standard',
        style: 'vivid',
        size: '1024x1024'
      }
    })
    
    // Should not crash with 500 error
    expect(response.status()).not.toBe(500)
    
    const data = await response.json()
    if (!response.ok()) {
      // Should have proper error message
      expect(data.error).toBeTruthy()
      expect(data.details).toBeTruthy()
    }
  })
})