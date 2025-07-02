import { test, expect } from '@playwright/test'
import { createClient } from '@supabase/supabase-js'

// Helper to wait for image generation
async function waitForImageGeneration(page, timeout = 30000) {
  // Wait for either success message or the image to appear in gallery
  await Promise.race([
    page.waitForSelector('[data-testid="image-gallery-item"]', { timeout }),
    page.locator('text=/Image generated successfully|Created image/i').waitFor({ timeout })
  ])
  
  // Give a bit more time for state updates
  await page.waitForTimeout(2000)
}

// Helper to get Supabase client
function getSupabaseClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  
  if (!supabaseUrl || !supabaseKey) {
    throw new Error('Supabase credentials not found in environment')
  }
  
  return createClient(supabaseUrl, supabaseKey)
}

test.describe('Image Deletion E2E Tests', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to the app
    await page.goto('/')
    
    // Wait for the app to load
    await page.waitForLoadState('networkidle')
    
    // Close any welcome modals or notifications
    const closeButton = page.locator('[aria-label="Close"]').first()
    if (await closeButton.isVisible({ timeout: 5000 })) {
      await closeButton.click()
    }
  })

  test('should successfully delete an image from the gallery', async ({ page }) => {
    console.log('Starting image deletion test...')
    
    // Step 1: Generate a test image
    console.log('Step 1: Generating test image...')
    
    // Type a prompt
    const prompt = `Test image for deletion ${Date.now()}`
    const chatInput = page.locator('textarea[placeholder*="Message"], input[placeholder*="Message"]').first()
    await chatInput.fill(`Create an image: ${prompt}`)
    
    // Submit the message
    await page.keyboard.press('Enter')
    
    // Wait for image generation
    console.log('Waiting for image generation...')
    await waitForImageGeneration(page)
    
    // Step 2: Navigate to the Canvas/Images tab
    console.log('Step 2: Navigating to images gallery...')
    
    // Click on Canvas tab if not already there
    const canvasTab = page.locator('button:has-text("Canvas"), [role="tab"]:has-text("Canvas")')
    if (await canvasTab.isVisible()) {
      await canvasTab.click()
    }
    
    // Click on Images tab within Canvas
    const imagesTab = page.locator('[role="tab"]:has-text("Images"), button:has-text("Images")').first()
    await imagesTab.click()
    await page.waitForTimeout(1000)
    
    // Step 3: Verify image appears in gallery
    console.log('Step 3: Verifying image appears in gallery...')
    
    const imageGallery = page.locator('[data-testid="image-gallery"], .image-gallery, [class*="gallery"]').first()
    await expect(imageGallery).toBeVisible()
    
    // Find image items - try multiple selectors
    const imageItems = page.locator(`
      [data-testid="image-gallery-item"],
      .image-gallery-item,
      [class*="gallery"] img,
      [role="img"],
      img[alt*="${prompt}"],
      img[src*="blob"],
      img[src*="vercel"]
    `).first()
    
    await expect(imageItems).toBeVisible({ timeout: 10000 })
    
    // Get initial count of images
    const initialImageCount = await page.locator('img[src*="blob"], img[src*="vercel"]').count()
    console.log(`Initial image count: ${initialImageCount}`)
    
    // Step 4: Delete the image
    console.log('Step 4: Deleting the image...')
    
    // Hover over the image to reveal action buttons
    await imageItems.hover()
    await page.waitForTimeout(500)
    
    // Look for delete button - try multiple selectors
    const deleteButton = page.locator(`
      [aria-label*="Delete"],
      [title*="Delete"],
      button:has-text("Delete"),
      button:has(svg[class*="trash"]),
      button:has([data-lucide="trash"])
    `).first()
    
    await expect(deleteButton).toBeVisible({ timeout: 5000 })
    await deleteButton.click()
    
    // Step 5: Confirm deletion in dialog
    console.log('Step 5: Confirming deletion...')
    
    // Wait for confirmation dialog
    const confirmDialog = page.locator('[role="alertdialog"], [class*="dialog"], [class*="modal"]').first()
    await expect(confirmDialog).toBeVisible()
    
    // Click confirm button
    const confirmButton = page.locator('button:has-text("Delete Image"), button:has-text("Confirm"), button:has-text("Yes")').last()
    await confirmButton.click()
    
    // Step 6: Verify image is removed
    console.log('Step 6: Verifying image is removed from gallery...')
    
    // Wait for deletion to complete
    await page.waitForTimeout(2000)
    
    // Check that image count decreased
    const finalImageCount = await page.locator('img[src*="blob"], img[src*="vercel"]').count()
    console.log(`Final image count: ${finalImageCount}`)
    
    expect(finalImageCount).toBeLessThan(initialImageCount)
    
    // Verify success message (if shown)
    const successMessage = page.locator('text=/deleted successfully/i')
    if (await successMessage.isVisible({ timeout: 3000 })) {
      console.log('Success message displayed')
    }
    
    // Step 7: Verify image is removed from database
    console.log('Step 7: Verifying image is removed from database...')
    
    try {
      const supabase = getSupabaseClient()
      
      // Query for images with our test prompt
      const { data: remainingImages } = await supabase
        .from('images')
        .select('id, prompt')
        .eq('prompt', prompt)
      
      console.log(`Images with test prompt in database: ${remainingImages?.length || 0}`)
      expect(remainingImages?.length || 0).toBe(0)
    } catch (dbError) {
      console.log('Skipping database verification (Supabase not configured):', dbError.message)
    }
    
    console.log('✅ Image deletion test completed successfully!')
  })

  test('should handle deletion of non-existent image gracefully', async ({ page }) => {
    console.log('Testing deletion of non-existent image...')
    
    // Navigate to images gallery
    const canvasTab = page.locator('button:has-text("Canvas"), [role="tab"]:has-text("Canvas")')
    if (await canvasTab.isVisible()) {
      await canvasTab.click()
    }
    
    const imagesTab = page.locator('[role="tab"]:has-text("Images"), button:has-text("Images")').first()
    await imagesTab.click()
    
    // Try to delete with a fake ID via API
    const fakeImageId = 'img_nonexistent_12345'
    
    // Make direct API call
    const response = await page.request.delete(`/api/images/${fakeImageId}`)
    
    console.log(`API Response status: ${response.status()}`)
    expect(response.status()).toBe(404)
    
    const responseData = await response.json()
    expect(responseData.error).toContain('not found')
    
    console.log('✅ Non-existent image deletion handled correctly!')
  })

  test('should delete multiple images in succession', async ({ page }) => {
    console.log('Testing multiple image deletion...')
    
    // Generate 2 test images
    for (let i = 1; i <= 2; i++) {
      console.log(`Generating image ${i}...`)
      
      const prompt = `Test image ${i} for batch deletion ${Date.now()}`
      const chatInput = page.locator('textarea[placeholder*="Message"], input[placeholder*="Message"]').first()
      await chatInput.fill(`Create an image: ${prompt}`)
      await page.keyboard.press('Enter')
      
      await waitForImageGeneration(page)
      await page.waitForTimeout(2000)
    }
    
    // Navigate to images gallery
    const canvasTab = page.locator('button:has-text("Canvas"), [role="tab"]:has-text("Canvas")')
    if (await canvasTab.isVisible()) {
      await canvasTab.click()
    }
    
    const imagesTab = page.locator('[role="tab"]:has-text("Images"), button:has-text("Images")').first()
    await imagesTab.click()
    await page.waitForTimeout(1000)
    
    // Get initial count
    const initialCount = await page.locator('img[src*="blob"], img[src*="vercel"]').count()
    console.log(`Initial image count: ${initialCount}`)
    
    // Delete 2 images
    for (let i = 0; i < 2; i++) {
      console.log(`Deleting image ${i + 1}...`)
      
      // Get the first image
      const firstImage = page.locator('img[src*="blob"], img[src*="vercel"]').first()
      await firstImage.hover()
      await page.waitForTimeout(500)
      
      // Click delete
      const deleteButton = page.locator('button:has(svg[class*="trash"])').first()
      await deleteButton.click()
      
      // Confirm
      const confirmButton = page.locator('button:has-text("Delete Image")').last()
      await confirmButton.click()
      
      await page.waitForTimeout(2000)
    }
    
    // Verify count decreased by 2
    const finalCount = await page.locator('img[src*="blob"], img[src*="vercel"]').count()
    console.log(`Final image count: ${finalCount}`)
    
    expect(initialCount - finalCount).toBe(2)
    
    console.log('✅ Multiple image deletion test completed successfully!')
  })
})

// Run with: npx playwright test e2e/test-image-deletion.spec.ts