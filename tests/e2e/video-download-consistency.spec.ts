import { test, expect } from '@playwright/test'

test.describe('Video Download Consistency', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('http://localhost:3000')
    
    // Wait for the app to be ready
    await expect(page.getByTestId('chat-input')).toBeVisible()
  })

  test('YouTube videos should be added directly to file list with options in chat', async ({ page }) => {
    // Paste YouTube URL
    const chatInput = page.getByTestId('chat-input')
    await chatInput.fill('https://www.youtube.com/watch?v=dQw4w9WgXcQ')
    
    // Wait for download to complete (mock or real depending on setup)
    await page.waitForTimeout(3000)
    
    // Verify file appears in the file list
    const filePreview = page.locator('[data-testid="file-preview"]').first()
    await expect(filePreview).toBeVisible({ timeout: 10000 })
    
    // Verify video options appear in chat interface (not in input area)
    const videoOptions = page.locator('text="Analyze & Transcribe"').first()
    await expect(videoOptions).toBeVisible({ timeout: 5000 })
    
    // Verify NO pending video UI in input area
    const pendingVideoUI = page.locator('text="Video downloaded successfully!"')
    await expect(pendingVideoUI).not.toBeVisible()
  })

  test('TikTok videos should be added directly to file list with options in chat', async ({ page }) => {
    // Paste TikTok URL
    const chatInput = page.getByTestId('chat-input')
    await chatInput.fill('https://www.tiktok.com/@username/video/7123456789012345678')
    
    // Wait for download to complete
    await page.waitForTimeout(3000)
    
    // Verify file appears in the file list
    const filePreview = page.locator('[data-testid="file-preview"]').first()
    await expect(filePreview).toBeVisible({ timeout: 10000 })
    
    // Verify video options appear in chat interface
    const videoOptions = page.locator('text="Reverse Engineer"').first()
    await expect(videoOptions).toBeVisible({ timeout: 5000 })
    
    // Verify NO pending video UI in input area
    const pendingVideoUI = page.locator('text="Video downloaded successfully!"')
    await expect(pendingVideoUI).not.toBeVisible()
  })

  test('Instagram videos should be added directly to file list with options in chat', async ({ page }) => {
    // Paste Instagram URL
    const chatInput = page.getByTestId('chat-input')
    await chatInput.fill('https://www.instagram.com/p/C5qLPhxsQMJ/')
    
    // Wait for download to complete
    await page.waitForTimeout(3000)
    
    // Verify file appears in the file list
    const filePreview = page.locator('[data-testid="file-preview"]').first()
    await expect(filePreview).toBeVisible({ timeout: 10000 })
    
    // Verify video options appear in chat interface
    const videoOptions = page.locator('text="Analyze & Transcribe"').first()
    await expect(videoOptions).toBeVisible({ timeout: 5000 })
    
    // Verify NO pending video UI in input area
    const pendingVideoUI = page.locator('text="Video downloaded successfully!"')
    await expect(pendingVideoUI).not.toBeVisible()
  })

  test('Video options should work when clicked', async ({ page }) => {
    // Paste any video URL (using YouTube for this test)
    const chatInput = page.getByTestId('chat-input')
    await chatInput.fill('https://www.youtube.com/watch?v=dQw4w9WgXcQ')
    
    // Wait for download and options to appear
    await page.waitForTimeout(3000)
    const analyzeButton = page.locator('text="Analyze & Transcribe"').first()
    await expect(analyzeButton).toBeVisible({ timeout: 10000 })
    
    // Click analyze button
    await analyzeButton.click()
    
    // Verify the analysis prompt is inserted into chat input
    await expect(chatInput).toHaveValue(/Please provide a detailed examination/)
    
    // Verify the chat is submitted (you might need to adjust this based on your implementation)
    await page.waitForTimeout(500)
    const sendButton = page.locator('[data-testid="send-button"]')
    const isDisabled = await sendButton.isDisabled()
    expect(isDisabled).toBe(false) // Should be ready to send
  })
})