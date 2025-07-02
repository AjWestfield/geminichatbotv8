import { test, expect } from '@playwright/test'

test.describe('SSE Progress Updates - All Platforms', () => {
  test.setTimeout(60000) // Increase timeout to 60 seconds
  
  test.beforeEach(async ({ page }) => {
    // Navigate to the app
    await page.goto('http://localhost:3000')
    await page.waitForLoadState('networkidle')
    
    // Enable auto-download in settings for all platforms
    // Try multiple selectors for the settings button
    const settingsButton = page.locator('button:has-text("Settings")').first()
    
    await settingsButton.click()
    await page.waitForTimeout(500)
    
    // Find all auto-download toggles and enable them
    const toggles = await page.locator('button[role="switch"]').all()
    for (const toggle of toggles) {
      const isChecked = await toggle.getAttribute('aria-checked')
      if (isChecked === 'false') {
        await toggle.click()
        await page.waitForTimeout(200)
      }
    }
    
    // Close settings - either click outside or press Escape
    try {
      await page.keyboard.press('Escape')
    } catch (e) {
      // If Escape doesn't work, click outside
      await page.locator('body').click({ position: { x: 10, y: 10 } })
    }
    await page.waitForTimeout(1000)
  })

  test('Instagram - Real-time progress and auto-download', async ({ page }) => {
    console.log('\n=== Testing Instagram SSE Progress ===')
    
    const progressUpdates: number[] = []
    const progressMessages: string[] = []
    
    // Monitor progress updates
    page.on('response', async response => {
      if (response.url().includes('instagram-download-sse')) {
        console.log('Instagram SSE endpoint called')
      }
    })
    
    // Focus chat input - try multiple selectors
    const chatInput = page.locator('textbox').first()
    await chatInput.click()
    
    // Start monitoring for progress updates before pasting
    const progressPromise = page.waitForFunction(() => {
      const progressBar = document.querySelector('[role="progressbar"]')
      return progressBar && progressBar.getAttribute('aria-valuenow') === '100'
    }, { timeout: 30000 })
    
    // Monitor progress bar changes
    const monitorProgress = async () => {
      let lastProgress = -1
      for (let i = 0; i < 100; i++) { // Check for 10 seconds
        try {
          const progressBar = page.locator('[role="progressbar"]').first()
          if (await progressBar.isVisible()) {
            const value = await progressBar.getAttribute('aria-valuenow')
            const progress = parseInt(value || '0')
            if (progress !== lastProgress) {
              lastProgress = progress
              progressUpdates.push(progress)
              
              // Get progress message
              const messageEl = page.locator('.animate-pulse').first()
              if (await messageEl.isVisible()) {
                const message = await messageEl.textContent()
                if (message && !progressMessages.includes(message)) {
                  progressMessages.push(message)
                }
              }
            }
          }
        } catch (e) {
          // Progress bar might not be visible yet
        }
        await page.waitForTimeout(100)
      }
    }
    
    // Start monitoring in background
    const monitorPromise = monitorProgress()
    
    // Paste Instagram URL
    await chatInput.fill('https://www.instagram.com/p/C5qLPhxsQMJ/')
    
    // Verify no "Video Detected" UI appears
    await page.waitForTimeout(500)
    const hasDetectedUI = await page.locator('text="Video Detected"').isVisible()
    expect(hasDetectedUI).toBe(false)
    
    // Wait for download to complete
    await progressPromise
    await monitorPromise
    
    // Verify smooth progress updates
    console.log(`Progress updates: ${progressUpdates.join(', ')}`)
    console.log(`Progress messages: ${progressMessages.join(' -> ')}`)
    
    expect(progressUpdates.length).toBeGreaterThan(3)
    expect(progressUpdates.some(p => p > 0 && p < 100)).toBe(true)
    
    // Verify file appears in list
    await expect(page.locator('div[data-file-name*=".mp4"]').first()).toBeVisible()
    
    // Verify chat input is cleared
    const inputValue = await chatInput.inputValue()
    expect(inputValue).toBe('')
    
    // Verify video options appear
    await expect(page.locator('text="Analyze video"').or(page.locator('text="Reverse engineer"'))).toBeVisible()
  })

  test('YouTube - Real-time progress with yt-dlp parsing', async ({ page }) => {
    console.log('\n=== Testing YouTube SSE Progress ===')
    
    const progressUpdates: number[] = []
    const progressMessages: string[] = []
    
    // Monitor SSE responses
    page.on('response', async response => {
      if (response.url().includes('youtube-download-sse')) {
        console.log('YouTube SSE endpoint called')
      }
    })
    
    // Focus chat input - try multiple selectors
    const chatInput = page.locator('textbox').first()
    await chatInput.click()
    
    // Monitor progress
    const progressPromise = page.waitForFunction(() => {
      const progressBar = document.querySelector('[role="progressbar"]')
      return progressBar && progressBar.getAttribute('aria-valuenow') === '100'
    }, { timeout: 45000 }) // YouTube might take longer
    
    const monitorProgress = async () => {
      let lastProgress = -1
      for (let i = 0; i < 150; i++) { // Check for 15 seconds
        try {
          const progressBar = page.locator('[role="progressbar"]').first()
          if (await progressBar.isVisible()) {
            const value = await progressBar.getAttribute('aria-valuenow')
            const progress = parseInt(value || '0')
            if (progress !== lastProgress) {
              lastProgress = progress
              progressUpdates.push(progress)
              
              const messageEl = page.locator('.animate-pulse').first()
              if (await messageEl.isVisible()) {
                const message = await messageEl.textContent()
                if (message && !progressMessages.includes(message)) {
                  progressMessages.push(message)
                }
              }
            }
          }
        } catch (e) {
          // Progress bar might not be visible yet
        }
        await page.waitForTimeout(100)
      }
    }
    
    const monitorPromise = monitorProgress()
    
    // Paste YouTube URL
    await chatInput.fill('https://www.youtube.com/watch?v=dQw4w9WgXcQ')
    
    // Verify no "Video Detected" UI
    await page.waitForTimeout(500)
    const hasDetectedUI = await page.locator('text="Video Detected"').isVisible()
    expect(hasDetectedUI).toBe(false)
    
    // Wait for completion
    await progressPromise
    await monitorPromise
    
    // Verify progress updates
    console.log(`Progress updates: ${progressUpdates.join(', ')}`)
    console.log(`Progress messages: ${progressMessages.join(' -> ')}`)
    
    expect(progressUpdates.length).toBeGreaterThan(3)
    expect(progressUpdates.some(p => p > 0 && p < 100)).toBe(true)
    
    // YouTube should have more granular updates due to yt-dlp parsing
    const hasDetailedProgress = progressMessages.some(m => m.includes('Downloading:'))
    expect(hasDetailedProgress).toBe(true)
    
    // Verify file and UI state
    await expect(page.locator('div[data-file-name*=".mp4"]').first()).toBeVisible()
    expect(await chatInput.inputValue()).toBe('')
    await expect(page.locator('text="Analyze video"').or(page.locator('text="Reverse engineer"'))).toBeVisible()
  })

  test('TikTok - Real-time progress and consistent behavior', async ({ page }) => {
    console.log('\n=== Testing TikTok SSE Progress ===')
    
    const progressUpdates: number[] = []
    const progressMessages: string[] = []
    
    page.on('response', async response => {
      if (response.url().includes('tiktok-download-sse')) {
        console.log('TikTok SSE endpoint called')
      }
    })
    
    const chatInput = page.locator('textarea[placeholder*="Type a message"]').first()
    await chatInput.click()
    
    const progressPromise = page.waitForFunction(() => {
      const progressBar = document.querySelector('[role="progressbar"]')
      return progressBar && progressBar.getAttribute('aria-valuenow') === '100'
    }, { timeout: 30000 })
    
    const monitorProgress = async () => {
      let lastProgress = -1
      for (let i = 0; i < 100; i++) {
        try {
          const progressBar = page.locator('[role="progressbar"]').first()
          if (await progressBar.isVisible()) {
            const value = await progressBar.getAttribute('aria-valuenow')
            const progress = parseInt(value || '0')
            if (progress !== lastProgress) {
              lastProgress = progress
              progressUpdates.push(progress)
              
              const messageEl = page.locator('.animate-pulse').first()
              if (await messageEl.isVisible()) {
                const message = await messageEl.textContent()
                if (message && !progressMessages.includes(message)) {
                  progressMessages.push(message)
                }
              }
            }
          }
        } catch (e) {
          // Progress bar might not be visible yet
        }
        await page.waitForTimeout(100)
      }
    }
    
    const monitorPromise = monitorProgress()
    
    // Paste TikTok URL
    await chatInput.fill('https://www.tiktok.com/@username/video/7123456789012345678')
    
    // Verify behavior
    await page.waitForTimeout(500)
    const hasDetectedUI = await page.locator('text="Video Detected"').isVisible()
    expect(hasDetectedUI).toBe(false)
    
    await progressPromise
    await monitorPromise
    
    console.log(`Progress updates: ${progressUpdates.join(', ')}`)
    console.log(`Progress messages: ${progressMessages.join(' -> ')}`)
    
    expect(progressUpdates.length).toBeGreaterThan(3)
    expect(progressUpdates.some(p => p > 0 && p < 100)).toBe(true)
    
    await expect(page.locator('div[data-file-name*=".mp4"]').first()).toBeVisible()
    expect(await chatInput.inputValue()).toBe('')
    await expect(page.locator('text="Analyze video"').or(page.locator('text="Reverse engineer"'))).toBeVisible()
  })

  test('All platforms - Consistent behavior comparison', async ({ page }) => {
    console.log('\n=== Testing All Platforms Consistency ===')
    
    const testPlatform = async (url: string, platform: string) => {
      await page.reload()
      await page.waitForLoadState('networkidle')
      
      const chatInput = page.locator('textarea[placeholder*="Type a message"]').first()
      await chatInput.click()
      
      const startTime = Date.now()
      let progressCount = 0
      let hasDetectedUI = false
      
      // Check for "Video Detected" UI
      const checkDetectedUI = page.waitForSelector('text="Video Detected"', { 
        timeout: 1000 
      }).then(() => {
        hasDetectedUI = true
      }).catch(() => {
        hasDetectedUI = false
      })
      
      // Monitor progress
      const monitorProgress = async () => {
        for (let i = 0; i < 100; i++) {
          const progressBar = page.locator('[role="progressbar"]').first()
          if (await progressBar.isVisible()) {
            progressCount++
          }
          await page.waitForTimeout(100)
        }
      }
      
      const monitorPromise = monitorProgress()
      
      // Paste URL
      await chatInput.fill(url)
      
      // Wait for file to appear
      await page.waitForSelector('div[data-file-name*=".mp4"]', { timeout: 30000 })
      
      await checkDetectedUI
      await monitorPromise
      
      const duration = Date.now() - startTime
      const inputCleared = (await chatInput.inputValue()) === ''
      
      return {
        platform,
        duration,
        progressCount,
        hasDetectedUI,
        inputCleared
      }
    }
    
    // Test all platforms
    const results = await Promise.all([
      testPlatform('https://www.instagram.com/p/C5qLPhxsQMJ/', 'Instagram'),
      testPlatform('https://www.youtube.com/watch?v=dQw4w9WgXcQ', 'YouTube'),
      testPlatform('https://www.tiktok.com/@username/video/7123456789012345678', 'TikTok')
    ])
    
    console.log('\nConsistency Results:')
    results.forEach(r => {
      console.log(`${r.platform}:`)
      console.log(`  - Duration: ${r.duration}ms`)
      console.log(`  - Progress updates: ${r.progressCount}`)
      console.log(`  - Detected UI shown: ${r.hasDetectedUI}`)
      console.log(`  - Input cleared: ${r.inputCleared}`)
    })
    
    // All platforms should behave the same
    expect(results.every(r => !r.hasDetectedUI)).toBe(true)
    expect(results.every(r => r.inputCleared)).toBe(true)
    expect(results.every(r => r.progressCount > 3)).toBe(true)
  })

  test('SSE Network Verification', async ({ page }) => {
    console.log('\n=== Testing SSE Network Streams ===')
    
    const sseResponses: string[] = []
    
    // Intercept SSE responses
    page.on('response', async response => {
      if (response.url().includes('-download-sse')) {
        const contentType = response.headers()['content-type']
        expect(contentType).toBe('text/event-stream')
        
        const platform = response.url().includes('youtube') ? 'YouTube' :
                        response.url().includes('instagram') ? 'Instagram' : 'TikTok'
        
        console.log(`${platform} SSE Response:`)
        console.log(`  - Status: ${response.status()}`)
        console.log(`  - Content-Type: ${contentType}`)
        
        sseResponses.push(platform)
      }
    })
    
    const chatInput = page.locator('textarea[placeholder*="Type a message"]').first()
    
    // Test each platform
    for (const { url, platform } of [
      { url: 'https://www.instagram.com/p/C5qLPhxsQMJ/', platform: 'Instagram' },
      { url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ', platform: 'YouTube' },
      { url: 'https://www.tiktok.com/@username/video/7123456789012345678', platform: 'TikTok' }
    ]) {
      await page.reload()
      await chatInput.click()
      await chatInput.fill(url)
      await page.waitForSelector('div[data-file-name*=".mp4"]', { timeout: 30000 })
    }
    
    // Verify all SSE endpoints were called
    expect(sseResponses).toContain('Instagram')
    expect(sseResponses).toContain('YouTube')
    expect(sseResponses).toContain('TikTok')
  })
})