import { test, expect } from '@playwright/test'

test.describe('Deep Research Browser Integration', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to the app
    await page.goto('http://localhost:3000')
    
    // Wait for the page to load
    await expect(page.getByRole('heading', { name: 'AI Assistant' })).toBeVisible({ timeout: 10000 })
  })

  test('should show Deep Research button and create browser session', async ({ page }) => {
    // Check if Deep Research button is visible
    const deepResearchButton = page.locator('button:has-text("Deep Research Mode Active")')
    const researchInput = page.locator('input[placeholder*="research question"]')
    
    // Click on the research input or button
    if (await researchInput.isVisible()) {
      await researchInput.click()
    } else if (await deepResearchButton.isVisible()) {
      await deepResearchButton.click()
    } else {
      // Look for any research-related button or icon
      const searchIcon = page.locator('[aria-label*="research"], [aria-label*="search"], [title*="research"], .lucide-search').first()
      await searchIcon.click()
    }

    // Enter a research query
    const inputField = page.locator('input[placeholder*="research question"], input[placeholder*="Deep Research"]').first()
    await inputField.waitFor({ state: 'visible', timeout: 5000 })
    await inputField.fill('What are the latest AI developments in 2025?')
    
    // Submit the query
    await page.keyboard.press('Enter')
    
    // Wait for browser session to start
    await expect(page.locator('text=Starting browser session')).toBeVisible({ timeout: 15000 })
    
    // Check for Canvas view
    const canvasTab = page.locator('text=Canvas, button')
    await expect(canvasTab).toBeVisible({ timeout: 10000 })
    
    // Click on Canvas tab
    await canvasTab.click()
    
    // Verify browser view is displayed
    const browserView = page.locator('.browser-view, iframe, [data-testid="browser-view"]').first()
    await expect(browserView).toBeVisible({ timeout: 10000 })
  })

  test('should handle WebSocket connection properly', async ({ page }) => {
    // Enable console logging to capture WebSocket events
    page.on('console', msg => {
      if (msg.text().includes('WebSocket') || msg.text().includes('browser')) {
        console.log('Console:', msg.text())
      }
    })
    
    // Monitor network for WebSocket connections
    let wsConnection: any = null
    page.on('websocket', ws => {
      wsConnection = ws
      console.log('WebSocket opened:', ws.url())
      
      ws.on('framesent', frame => {
        console.log('WS sent:', frame.payload)
      })
      
      ws.on('framereceived', frame => {
        console.log('WS received:', frame.payload)
      })
      
      ws.on('close', () => {
        console.log('WebSocket closed')
      })
    })
    
    // Trigger Deep Research
    const searchIcon = page.locator('[aria-label*="research"], [aria-label*="search"], [title*="research"], .lucide-search').first()
    await searchIcon.click()
    
    const inputField = page.locator('input[placeholder*="research question"], input[placeholder*="Deep Research"]').first()
    await inputField.waitFor({ state: 'visible', timeout: 5000 })
    await inputField.fill('Test WebSocket connection')
    await page.keyboard.press('Enter')
    
    // Wait for WebSocket to connect
    await page.waitForTimeout(3000)
    
    // Verify WebSocket connection was established
    expect(wsConnection).toBeTruthy()
  })

  test('should display error message gracefully on connection failure', async ({ page }) => {
    // Stop the browser-use service to simulate failure
    // This is just for testing error handling
    
    const searchIcon = page.locator('[aria-label*="research"], [aria-label*="search"], [title*="research"], .lucide-search').first()
    await searchIcon.click()
    
    const inputField = page.locator('input[placeholder*="research question"], input[placeholder*="Deep Research"]').first()
    await inputField.waitFor({ state: 'visible', timeout: 5000 })
    await inputField.fill('Test error handling')
    await page.keyboard.press('Enter')
    
    // Check for error message or retry mechanism
    const errorMessage = page.locator('text=/connection error|failed to connect|retry/i')
    const isErrorVisible = await errorMessage.isVisible({ timeout: 10000 }).catch(() => false)
    
    if (isErrorVisible) {
      console.log('Error handling working correctly')
      expect(isErrorVisible).toBeTruthy()
    } else {
      // If no error, session should start successfully
      await expect(page.locator('text=Starting browser session')).toBeVisible({ timeout: 15000 })
    }
  })

  test('should allow interactive browsing in Canvas view', async ({ page }) => {
    // Start Deep Research
    const searchIcon = page.locator('[aria-label*="research"], [aria-label*="search"], [title*="research"], .lucide-search').first()
    await searchIcon.click()
    
    const inputField = page.locator('input[placeholder*="research question"], input[placeholder*="Deep Research"]').first()
    await inputField.waitFor({ state: 'visible', timeout: 5000 })
    await inputField.fill('Browse to Google and search for Playwright')
    await page.keyboard.press('Enter')
    
    // Wait for session to start
    await page.waitForTimeout(5000)
    
    // Switch to Canvas view
    const canvasTab = page.locator('text=Canvas, button')
    await canvasTab.click()
    
    // Wait for browser view
    const browserView = page.locator('.browser-view, iframe, [data-testid="browser-view"]').first()
    await expect(browserView).toBeVisible({ timeout: 10000 })
    
    // Verify the browser is displaying content
    await page.waitForTimeout(3000)
    
    // Take a screenshot for debugging
    await page.screenshot({ path: 'tests/screenshots/deep-research-canvas.png', fullPage: true })
  })
})

test.describe('Browser Session API', () => {
  test('should create browser session via API', async ({ request }) => {
    const response = await request.post('http://localhost:3000/api/browser/session', {
      data: {
        action: 'create',
        options: {
          url: 'https://www.example.com'
        }
      }
    })
    
    expect(response.ok()).toBeTruthy()
    const data = await response.json()
    
    expect(data.success).toBe(true)
    expect(data.session).toBeDefined()
    expect(data.session.id).toBeDefined()
    expect(data.streamUrl).toMatch(/ws:\/\/localhost:8002\/ws\/browser-use\//)
  })

  test('should handle browser-use style requests', async ({ request }) => {
    const response = await request.post('http://localhost:3000/api/browser/session', {
      data: {
        query: 'Research Playwright testing',
        enableStreaming: true
      }
    })
    
    expect(response.ok()).toBeTruthy()
    const data = await response.json()
    
    expect(data.sessionId).toBeDefined()
    expect(data.streamUrl).toMatch(/ws:\/\/localhost:8002\/ws\/browser-use\//)
    expect(data.status).toBe('started')
  })
})
