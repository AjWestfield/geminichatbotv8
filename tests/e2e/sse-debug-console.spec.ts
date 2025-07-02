import { test, expect } from '@playwright/test'

test.describe('SSE Debug - Console Logs', () => {
  test.setTimeout(60000)

  test('Instagram download with console monitoring', async ({ page }) => {
    // Capture console logs
    const consoleLogs: string[] = []
    page.on('console', msg => {
      const text = msg.text()
      consoleLogs.push(`[${msg.type()}] ${text}`)
      if (msg.type() === 'error') {
        console.log(`❌ Console Error: ${text}`)
      }
    })
    
    // Capture network failures
    page.on('requestfailed', request => {
      console.log(`❌ Request failed: ${request.url()} - ${request.failure()?.errorText}`)
    })
    
    // Navigate to app
    await page.goto('http://localhost:3000')
    await page.waitForLoadState('networkidle')
    
    const chatInput = await page.getByPlaceholder('What can I do for you?')
    
    console.log('Testing Instagram download...')
    
    // Monitor SSE response in detail
    page.on('response', async response => {
      if (response.url().includes('instagram-download-sse')) {
        console.log('\n📡 SSE Response Details:')
        console.log(`  URL: ${response.url()}`)
        console.log(`  Status: ${response.status()}`)
        console.log(`  Headers: ${JSON.stringify(response.headers())}`)
        
        // Try to read the response body
        try {
          const body = await response.text()
          const lines = body.split('\n').slice(0, 5) // First 5 lines
          console.log(`  Body preview: ${lines.join('\\n  ')}`)
        } catch (e) {
          console.log('  Body: (streaming, cannot read)')
        }
      }
    })
    
    // Paste URL
    await chatInput.fill('https://www.instagram.com/p/C5qLPhxsQMJ/')
    
    // Wait for progress to complete or timeout
    let progressComplete = false
    for (let i = 0; i < 30; i++) {
      const progressBar = page.locator('[role="progressbar"]').first()
      if (await progressBar.isVisible()) {
        const value = await progressBar.getAttribute('aria-valuenow')
        if (value === '100') {
          progressComplete = true
          console.log('✅ Progress reached 100%')
          break
        }
      }
      await page.waitForTimeout(1000)
    }
    
    // Check for any error messages in UI
    const errorElements = await page.locator('.text-red-500, .text-destructive, [class*="error"]').all()
    for (const element of errorElements) {
      const text = await element.textContent()
      if (text) {
        console.log(`❌ UI Error: ${text}`)
      }
    }
    
    // Print relevant console logs
    console.log('\n📋 Console Logs:')
    consoleLogs.forEach(log => {
      if (log.includes('error') || log.includes('Error') || 
          log.includes('download') || log.includes('SSE')) {
        console.log(log)
      }
    })
    
    // Check final state
    console.log('\n📊 Final State:')
    console.log(`- Progress complete: ${progressComplete}`)
    console.log(`- Input value: "${await chatInput.inputValue()}"`)
    console.log(`- File in list: ${await page.locator('div[data-file-name*=".mp4"]').isVisible()}`)
    
    // Take a screenshot for debugging
    await page.screenshot({ path: 'sse-debug-screenshot.png', fullPage: true })
    console.log('Screenshot saved as sse-debug-screenshot.png')
  })

  test('Check API endpoints directly', async ({ page }) => {
    // Test Instagram download endpoint
    console.log('Testing Instagram download API...')
    
    const response = await page.request.post('http://localhost:3000/api/instagram-download-sse', {
      data: {
        url: 'https://www.instagram.com/p/C5qLPhxsQMJ/'
      },
      headers: {
        'Content-Type': 'application/json'
      }
    })
    
    console.log(`Instagram API Status: ${response.status()}`)
    console.log(`Content-Type: ${response.headers()['content-type']}`)
    
    if (response.status() !== 200) {
      const body = await response.text()
      console.log(`Response body: ${body}`)
    } else {
      console.log('✅ Instagram SSE endpoint is accessible')
    }
    
    // Test regular Instagram download endpoint
    console.log('\nTesting regular Instagram download API...')
    const regularResponse = await page.request.post('http://localhost:3000/api/instagram-download', {
      data: {
        url: 'https://www.instagram.com/p/C5qLPhxsQMJ/'
      },
      headers: {
        'Content-Type': 'application/json'
      }
    })
    
    console.log(`Regular API Status: ${regularResponse.status()}`)
    if (regularResponse.status() !== 200) {
      const body = await regularResponse.text()
      console.log(`Error: ${body}`)
    }
  })
})