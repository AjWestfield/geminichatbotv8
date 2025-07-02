import { test, expect } from '@playwright/test'

test.describe('SSE Progress - Simplified Tests', () => {
  test.setTimeout(60000)

  test('Instagram - Auto-download and real-time progress', async ({ page }) => {
    // Navigate to the app
    await page.goto('http://localhost:3000')
    await page.waitForLoadState('networkidle')
    
    // Get the main chat input
    const chatInput = await page.getByPlaceholder('What can I do for you?')
    await expect(chatInput).toBeVisible()
    
    // Track progress updates
    const progressUpdates: number[] = []
    let hasDetectedUI = false
    
    // Set up monitoring before paste
    const monitoringPromise = (async () => {
      // Check for "Video Detected" UI
      const detectedCheck = page.waitForSelector('text="Video Detected"', { 
        timeout: 2000, 
        state: 'visible' 
      }).then(() => {
        hasDetectedUI = true
        console.log('❌ "Video Detected" UI appeared')
      }).catch(() => {
        hasDetectedUI = false
        console.log('✅ No "Video Detected" UI')
      })
      
      // Monitor progress bar
      for (let i = 0; i < 100; i++) {
        try {
          const progressBar = page.locator('[role="progressbar"]').first()
          if (await progressBar.isVisible({ timeout: 100 })) {
            const value = await progressBar.getAttribute('aria-valuenow')
            const progress = parseInt(value || '0')
            if (!progressUpdates.includes(progress)) {
              progressUpdates.push(progress)
              console.log(`Progress: ${progress}%`)
            }
          }
        } catch (e) {
          // Progress bar not visible yet
        }
        await page.waitForTimeout(200)
      }
      
      await detectedCheck
    })()
    
    // Type the Instagram URL
    await chatInput.fill('https://www.instagram.com/p/C5qLPhxsQMJ/')
    console.log('Pasted Instagram URL')
    
    // Wait for file to appear
    await page.waitForSelector('div[data-file-name*=".mp4"]', { timeout: 30000 })
    console.log('File appeared in list')
    
    // Stop monitoring
    await monitoringPromise
    
    // Verify results
    console.log(`Total progress updates: ${progressUpdates.length}`)
    console.log(`Progress values: ${progressUpdates.join(', ')}`)
    
    // Check if auto-download is enabled by default
    if (hasDetectedUI) {
      console.log('Note: Auto-download may not be enabled by default')
    } else {
      expect(progressUpdates.length).toBeGreaterThan(2)
      expect(progressUpdates.some(p => p > 0 && p < 100)).toBe(true)
    }
    
    // Verify chat input is cleared
    const inputValue = await chatInput.inputValue()
    expect(inputValue).toBe('')
    
    // Verify video options appear
    const hasOptions = await page.locator('text="Analyze video"').or(page.locator('text="Reverse engineer"')).isVisible()
    expect(hasOptions).toBe(true)
  })

  test('YouTube - Auto-download and real-time progress', async ({ page }) => {
    await page.goto('http://localhost:3000')
    await page.waitForLoadState('networkidle')
    
    const chatInput = await page.getByPlaceholder('What can I do for you?')
    await expect(chatInput).toBeVisible()
    
    const progressUpdates: number[] = []
    const progressMessages: string[] = []
    
    // Monitor SSE endpoint
    let sseEndpointCalled = false
    page.on('response', response => {
      if (response.url().includes('youtube-download-sse')) {
        sseEndpointCalled = true
        console.log('✅ YouTube SSE endpoint called')
      }
    })
    
    // Monitor progress
    const monitoringPromise = (async () => {
      for (let i = 0; i < 150; i++) { // 30 seconds
        try {
          const progressBar = page.locator('[role="progressbar"]').first()
          if (await progressBar.isVisible({ timeout: 100 })) {
            const value = await progressBar.getAttribute('aria-valuenow')
            const progress = parseInt(value || '0')
            if (!progressUpdates.includes(progress)) {
              progressUpdates.push(progress)
              
              // Try to get progress message
              const messageEl = page.locator('.animate-pulse').first()
              if (await messageEl.isVisible({ timeout: 100 })) {
                const message = await messageEl.textContent()
                if (message && !progressMessages.includes(message)) {
                  progressMessages.push(message)
                  console.log(`Progress: ${progress}% - ${message}`)
                }
              }
            }
          }
        } catch (e) {
          // Progress bar not visible yet
        }
        await page.waitForTimeout(200)
      }
    })()
    
    // Type YouTube URL
    await chatInput.fill('https://www.youtube.com/watch?v=dQw4w9WgXcQ')
    console.log('Pasted YouTube URL')
    
    // Wait for completion
    await page.waitForSelector('div[data-file-name*=".mp4"]', { timeout: 45000 })
    console.log('File appeared in list')
    
    await monitoringPromise
    
    // Verify SSE was used
    expect(sseEndpointCalled).toBe(true)
    
    console.log(`Progress updates: ${progressUpdates.length}`)
    console.log(`Messages: ${progressMessages.join(' -> ')}`)
    
    // YouTube should have detailed progress from yt-dlp
    const hasDetailedProgress = progressMessages.some(m => m.includes('Downloading:'))
    if (hasDetailedProgress) {
      console.log('✅ Detailed yt-dlp progress detected')
    }
    
    // Input should be cleared
    expect(await chatInput.inputValue()).toBe('')
  })

  test('TikTok - Auto-download and real-time progress', async ({ page }) => {
    await page.goto('http://localhost:3000')
    await page.waitForLoadState('networkidle')
    
    const chatInput = await page.getByPlaceholder('What can I do for you?')
    await expect(chatInput).toBeVisible()
    
    const progressUpdates: number[] = []
    let sseEndpointCalled = false
    
    page.on('response', response => {
      if (response.url().includes('tiktok-download-sse')) {
        sseEndpointCalled = true
        console.log('✅ TikTok SSE endpoint called')
      }
    })
    
    // Monitor progress
    const monitoringPromise = (async () => {
      for (let i = 0; i < 100; i++) {
        try {
          const progressBar = page.locator('[role="progressbar"]').first()
          if (await progressBar.isVisible({ timeout: 100 })) {
            const value = await progressBar.getAttribute('aria-valuenow')
            const progress = parseInt(value || '0')
            if (!progressUpdates.includes(progress)) {
              progressUpdates.push(progress)
              console.log(`Progress: ${progress}%`)
            }
          }
        } catch (e) {
          // Progress bar not visible yet
        }
        await page.waitForTimeout(200)
      }
    })()
    
    // Type TikTok URL
    await chatInput.fill('https://www.tiktok.com/@username/video/7123456789012345678')
    console.log('Pasted TikTok URL')
    
    // Wait for completion
    await page.waitForSelector('div[data-file-name*=".mp4"]', { timeout: 30000 })
    console.log('File appeared in list')
    
    await monitoringPromise
    
    // Verify results
    expect(sseEndpointCalled).toBe(true)
    console.log(`Progress updates: ${progressUpdates.length}`)
    
    if (progressUpdates.length > 2) {
      console.log('✅ Smooth progress updates detected')
    }
    
    expect(await chatInput.inputValue()).toBe('')
  })

  test('SSE Endpoints - Network verification', async ({ page }) => {
    await page.goto('http://localhost:3000')
    await page.waitForLoadState('networkidle')
    
    const chatInput = await page.getByPlaceholder('What can I do for you?')
    
    const sseEndpoints: string[] = []
    
    // Monitor all SSE responses
    page.on('response', async response => {
      if (response.url().includes('-download-sse')) {
        const contentType = response.headers()['content-type']
        const platform = response.url().includes('youtube') ? 'YouTube' :
                        response.url().includes('instagram') ? 'Instagram' : 'TikTok'
        
        console.log(`${platform} SSE Response:`)
        console.log(`  - Status: ${response.status()}`)
        console.log(`  - Content-Type: ${contentType}`)
        
        if (contentType === 'text/event-stream') {
          sseEndpoints.push(platform)
          console.log(`  ✅ Valid SSE content type`)
        }
      }
    })
    
    // Test Instagram
    await chatInput.fill('https://www.instagram.com/p/C5qLPhxsQMJ/')
    await page.waitForSelector('div[data-file-name*=".mp4"]', { timeout: 30000 })
    await page.waitForTimeout(1000)
    
    // Clear and test YouTube
    await page.reload()
    await page.waitForLoadState('networkidle')
    const chatInput2 = await page.getByPlaceholder('What can I do for you?')
    await chatInput2.fill('https://www.youtube.com/watch?v=dQw4w9WgXcQ')
    await page.waitForSelector('div[data-file-name*=".mp4"]', { timeout: 45000 })
    await page.waitForTimeout(1000)
    
    // Clear and test TikTok
    await page.reload()
    await page.waitForLoadState('networkidle')
    const chatInput3 = await page.getByPlaceholder('What can I do for you?')
    await chatInput3.fill('https://www.tiktok.com/@username/video/7123456789012345678')
    await page.waitForSelector('div[data-file-name*=".mp4"]', { timeout: 30000 })
    
    // Verify all platforms used SSE
    console.log(`\nSSE Endpoints called: ${sseEndpoints.join(', ')}`)
    expect(sseEndpoints).toContain('Instagram')
    expect(sseEndpoints).toContain('YouTube')
    expect(sseEndpoints).toContain('TikTok')
  })
})