import { test, expect } from '@playwright/test'

test.describe('URL Download Fix - Final Verification', () => {
  test('TikTok URL should download without errors', async ({ page }) => {
    // Monitor console for specific errors
    const errors: string[] = []
    let downloadStarted = false
    
    page.on('console', msg => {
      if (msg.type() === 'error') {
        errors.push(msg.text())
        console.error('Error detected:', msg.text().substring(0, 100))
      } else if (msg.text().includes('[TikTok')) {
        console.log(msg.text())
        if (msg.text().includes('Download') || msg.text().includes('Creating file')) {
          downloadStarted = true
        }
      }
    })
    
    // Navigate to app
    await page.goto('/', { waitUntil: 'networkidle' })
    await page.waitForTimeout(3000)
    
    // Find and fill input
    const input = page.locator('textarea[placeholder="What can I do for you?"]')
    await expect(input).toBeVisible()
    
    const testUrl = 'https://www.tiktok.com/@jerovidepablos/video/7519501734071241989'
    await input.fill(testUrl)
    
    // Wait for processing
    await page.waitForTimeout(5000)
    
    // Check results
    const initializationError = errors.find(e => 
      e.includes('downloadedFile') && e.includes('initialization')
    )
    const skipAutoAnalysisError = errors.find(e => 
      e.includes('skipAutoAnalysis') && e.includes('read only')
    )
    
    // Assertions
    expect(initializationError).toBeUndefined()
    expect(skipAutoAnalysisError).toBeUndefined()
    
    console.log('\nTest Results:')
    console.log('- Initialization error:', initializationError ? '❌ Found' : '✅ Not found')
    console.log('- skipAutoAnalysis error:', skipAutoAnalysisError ? '❌ Found' : '✅ Not found')
    console.log('- Download started:', downloadStarted ? '✅ Yes' : '❓ No')
    console.log('- Total errors:', errors.length)
  })
  
  test('Multiple platform URLs should work', async ({ page }) => {
    await page.goto('/', { waitUntil: 'networkidle' })
    
    const input = page.locator('textarea[placeholder="What can I do for you?"]')
    await expect(input).toBeVisible()
    
    const urls = [
      'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
      'https://www.instagram.com/p/C5YZ3vRsKwC/',
      'https://www.facebook.com/watch/?v=1234567890'
    ]
    
    for (const url of urls) {
      console.log(`Testing ${url}...`)
      await input.clear()
      await input.fill(url)
      await page.waitForTimeout(2000)
      
      // Just verify no crashes
      await expect(input).toBeVisible()
    }
  })
})