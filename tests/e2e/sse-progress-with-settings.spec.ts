import { test, expect } from '@playwright/test'

test.describe('SSE Progress with Settings Enabled', () => {
  test.setTimeout(90000)

  test('Enable auto-download and test all platforms', async ({ page }) => {
    // Navigate to the app
    await page.goto('http://localhost:3000')
    await page.waitForLoadState('networkidle')
    
    console.log('1. Navigating to settings page...')
    
    // Go to settings page directly
    await page.goto('http://localhost:3000/settings')
    await page.waitForLoadState('networkidle')
    
    console.log('2. Looking for auto-download toggles...')
    
    // Enable auto-download for all platforms
    // Look for switches in the settings page
    const switches = await page.locator('button[role="switch"]').all()
    console.log(`Found ${switches.length} toggle switches`)
    
    // Enable all switches
    for (let i = 0; i < switches.length; i++) {
      const toggle = switches[i]
      const isChecked = await toggle.getAttribute('aria-checked')
      const label = await toggle.textContent()
      console.log(`Toggle ${i + 1}: ${label || 'No label'} - Currently: ${isChecked}`)
      
      if (isChecked === 'false') {
        await toggle.click()
        await page.waitForTimeout(200)
        console.log(`  ✅ Enabled toggle ${i + 1}`)
      }
    }
    
    console.log('3. Going back to main page...')
    
    // Go back to main page
    await page.goto('http://localhost:3000')
    await page.waitForLoadState('networkidle')
    
    // Test Instagram
    console.log('\n=== Testing Instagram ===')
    await testPlatform(page, 'Instagram', 'https://www.instagram.com/p/C5qLPhxsQMJ/')
    
    // Test YouTube
    console.log('\n=== Testing YouTube ===')
    await page.reload()
    await page.waitForLoadState('networkidle')
    await testPlatform(page, 'YouTube', 'https://www.youtube.com/watch?v=dQw4w9WgXcQ')
    
    // Test TikTok
    console.log('\n=== Testing TikTok ===')
    await page.reload()
    await page.waitForLoadState('networkidle')
    await testPlatform(page, 'TikTok', 'https://www.tiktok.com/@username/video/7123456789012345678')
  })

  async function testPlatform(page: any, platform: string, url: string) {
    const chatInput = await page.getByPlaceholder('What can I do for you?')
    await expect(chatInput).toBeVisible()
    
    const progressUpdates: number[] = []
    const progressMessages: string[] = []
    let sseEndpointCalled = false
    let hasDetectedUI = false
    
    // Monitor SSE endpoint
    const responseHandler = (response: any) => {
      if (response.url().includes(`${platform.toLowerCase()}-download-sse`)) {
        sseEndpointCalled = true
        console.log(`✅ ${platform} SSE endpoint called`)
      }
    }
    page.on('response', responseHandler)
    
    // Monitor for "Video Detected" UI and progress
    const monitoringPromise = (async () => {
      // Quick check for detected UI
      const detectedCheck = page.waitForSelector('text="Video Detected"', { 
        timeout: 2000, 
        state: 'visible' 
      }).then(() => {
        hasDetectedUI = true
        console.log(`❌ "Video Detected" UI appeared for ${platform}`)
      }).catch(() => {
        hasDetectedUI = false
        console.log(`✅ No "Video Detected" UI for ${platform}`)
      })
      
      // Monitor progress
      for (let i = 0; i < 150; i++) { // 30 seconds
        try {
          const progressBar = page.locator('[role="progressbar"]').first()
          if (await progressBar.isVisible({ timeout: 100 })) {
            const value = await progressBar.getAttribute('aria-valuenow')
            const progress = parseInt(value || '0')
            if (!progressUpdates.includes(progress)) {
              progressUpdates.push(progress)
              
              // Get progress message
              const messageEl = page.locator('.animate-pulse').first()
              if (await messageEl.isVisible({ timeout: 100 })) {
                const message = await messageEl.textContent()
                if (message && !progressMessages.includes(message)) {
                  progressMessages.push(message)
                  console.log(`Progress: ${progress}% - ${message}`)
                }
              } else {
                console.log(`Progress: ${progress}%`)
              }
            }
          }
        } catch (e) {
          // Progress not visible
        }
        await page.waitForTimeout(200)
      }
      
      await detectedCheck
    })()
    
    // Paste URL
    await chatInput.fill(url)
    console.log(`Pasted ${platform} URL`)
    
    // Wait for download to complete - try multiple selectors
    try {
      await page.waitForSelector('div[data-file-name*=".mp4"]', { timeout: 45000 })
      console.log(`✅ Video file appeared in list`)
    } catch (e) {
      // Try alternative selectors
      try {
        await page.waitForSelector('[data-testid="file-item"]', { timeout: 5000 })
        console.log(`✅ Video file appeared (alternative selector)`)
      } catch (e2) {
        console.log(`❌ Video file did not appear in list`)
        
        // Check if there's an error message
        const errorMsg = await page.locator('.text-red-500').first()
        if (await errorMsg.isVisible()) {
          console.log(`Error message: ${await errorMsg.textContent()}`)
        }
      }
    }
    
    await monitoringPromise
    
    // Clean up listener
    page.off('response', responseHandler)
    
    // Results
    console.log(`\n${platform} Results:`)
    console.log(`- SSE endpoint called: ${sseEndpointCalled ? '✅' : '❌'}`)
    console.log(`- No detection UI: ${!hasDetectedUI ? '✅' : '❌'}`)
    console.log(`- Progress updates: ${progressUpdates.length}`)
    console.log(`- Progress values: ${progressUpdates.slice(0, 10).join(', ')}${progressUpdates.length > 10 ? '...' : ''}`)
    console.log(`- Smooth progress: ${progressUpdates.length > 3 ? '✅' : '❌'}`)
    
    // Verify input cleared
    const inputValue = await chatInput.inputValue()
    console.log(`- Input cleared: ${inputValue === '' ? '✅' : '❌'}`)
    
    // Check for video options
    const hasOptions = await page.locator('text="Analyze video"').or(page.locator('text="Reverse engineer"')).isVisible()
    console.log(`- Video options shown: ${hasOptions ? '✅' : '❌'}`)
    
    // Assertions
    expect(sseEndpointCalled).toBe(true)
    expect(hasDetectedUI).toBe(false)
    expect(progressUpdates.length).toBeGreaterThan(2)
    expect(inputValue).toBe('')
  }
})

// Alternative test that checks current behavior without settings
test('Check current behavior without settings', async ({ page }) => {
  await page.goto('http://localhost:3000')
  await page.waitForLoadState('networkidle')
  
  const chatInput = await page.getByPlaceholder('What can I do for you?')
  await chatInput.fill('https://www.instagram.com/p/C5qLPhxsQMJ/')
  
  // Wait a moment to see what happens
  await page.waitForTimeout(2000)
  
  // Check if "Video Detected" UI appears
  const hasDetectedUI = await page.locator('text="Video Detected"').isVisible()
  
  if (hasDetectedUI) {
    console.log('Auto-download is NOT enabled by default')
    console.log('User needs to click download button or enable auto-download in settings')
    
    // Try clicking the download button
    const downloadButton = page.locator('button:has-text("Download")')
    if (await downloadButton.isVisible()) {
      await downloadButton.click()
      console.log('Clicked download button')
      
      // Now check for progress
      const progressBar = await page.waitForSelector('[role="progressbar"]', { timeout: 5000 })
      if (progressBar) {
        console.log('✅ Progress bar appeared after manual download')
      }
    }
  } else {
    console.log('✅ Auto-download appears to be working')
  }
})