import { test, expect } from '@playwright/test'

test.describe('Chat Loading Performance', () => {
  test.beforeEach(async ({ page }) => {
    // Set a reasonable timeout for loading
    page.setDefaultTimeout(30000)
    
    // Navigate to the app
    await page.goto('/', { waitUntil: 'networkidle' })
    
    // Wait for the app to fully load - look for main chat elements
    await page.waitForSelector('main, .chat-interface, [role="main"]', { 
      state: 'visible',
      timeout: 10000 
    })
  })

  test('app loads successfully without webpack errors', async ({ page }) => {
    // Check that the page loaded without errors
    const pageTitle = await page.title()
    expect(pageTitle).toBeTruthy()
    
    // Check for any error messages on the page (excluding persistence notification)
    const errorMessages = await page.locator('.error-message, [role="alert"]:not(:has-text("Database persistence"))').count()
    expect(errorMessages).toBe(0)
    
    // Verify main components are present
    await expect(page.locator('main, .chat-interface, [role="main"]').first()).toBeVisible()
    
    // Check for sidebar - it might be in a sheet or aside element
    const sidebar = page.locator('aside, [role="complementary"], .sidebar, nav').first()
    await expect(sidebar).toBeVisible()
  })

  test('can load chat sessions from sidebar', async ({ page }) => {
    // Wait for sidebar to be ready
    await page.waitForSelector('aside, [role="complementary"], .sidebar, nav', { state: 'visible' })
    
    // Get chat list items - look for list items with chat info
    const chatItems = page.locator('nav a[href*="/chat/"], aside a[href*="/chat/"], .sidebar a[href*="/chat/"], button:has-text("Chat"), li:has(a[href*="/chat/"])')
    const chatCount = await chatItems.count()
    
    if (chatCount === 0) {
      console.log('No existing chats found, creating a new chat for testing')
      
      // Create a new chat by sending a message
      const input = page.locator('textarea[placeholder*="What can"], input[placeholder*="What can"], textarea[placeholder*="Message"], input[placeholder*="Message"]').first()
      await input.fill('Test message for E2E')
      await input.press('Enter')
      
      // Wait for response - look for assistant messages
      await page.waitForSelector('[role="assistant"], .assistant-message, div:has-text("Assistant"), .message.assistant', { 
        state: 'visible',
        timeout: 30000 
      })
      
      // Refresh to see the new chat in sidebar
      await page.reload({ waitUntil: 'networkidle' })
      await page.waitForSelector('nav a[href*="/chat/"], aside a[href*="/chat/"], .sidebar a[href*="/chat/"]', { state: 'visible' })
    }
    
    // Click on the first chat
    const firstChat = chatItems.first()
    const chatTitle = await firstChat.textContent()
    console.log(`Clicking on chat: ${chatTitle}`)
    
    // Measure loading time
    const startTime = Date.now()
    await firstChat.click()
    
    // Wait for messages to load
    await page.waitForSelector('.message, [role="user"], [role="assistant"], .chat-message, div[class*="message"]', { 
      state: 'visible',
      timeout: 10000 // 10 second timeout for loading
    })
    
    const loadTime = Date.now() - startTime
    console.log(`Chat loaded in ${loadTime}ms`)
    
    // Verify load time is reasonable (under 5 seconds)
    expect(loadTime).toBeLessThan(5000)
    
    // Check if pagination toast appears for large chats
    const toastMessage = page.locator('.sonner-toast, [role="status"], .toast, [class*="toast"]')
    const toastCount = await toastMessage.count()
    if (toastCount > 0) {
      const toastText = await toastMessage.first().textContent()
      console.log(`Pagination toast shown: ${toastText}`)
    }
    
    // Verify messages are displayed
    const messages = page.locator('.message, [role="user"], [role="assistant"], .chat-message, div[class*="message"]')
    const messageCount = await messages.count()
    expect(messageCount).toBeGreaterThan(0)
    console.log(`Loaded ${messageCount} messages`)
  })

  test('handles chat loading errors gracefully', async ({ page }) => {
    // Try to load a non-existent chat
    const response = await page.goto('/chat/non-existent-chat-id', { waitUntil: 'networkidle' })
    
    // Should return 404 status
    expect(response?.status()).toBe(404)
    
    // App should still show UI (404 page)
    await page.waitForLoadState('networkidle')
    const bodyText = await page.textContent('body')
    expect(bodyText).toBeTruthy()
  })

  test('multiple chat switches work smoothly', async ({ page }) => {
    // Wait for sidebar
    await page.waitForSelector('aside, [role="complementary"], .sidebar, nav', { state: 'visible' })
    
    const chatItems = page.locator('nav a[href*="/chat/"], aside a[href*="/chat/"], .sidebar a[href*="/chat/"], button:has-text("Chat"), li:has(a[href*="/chat/"])')
    const chatCount = await chatItems.count()
    
    if (chatCount >= 2) {
      // Switch between first two chats
      const firstChat = chatItems.nth(0)
      const secondChat = chatItems.nth(1)
      
      // Load first chat
      await firstChat.click()
      await page.waitForSelector('.message, [role="user"], [role="assistant"], .chat-message, div[class*="message"]', { 
        state: 'visible',
        timeout: 5000 
      })
      
      // Switch to second chat
      const switchStartTime = Date.now()
      await secondChat.click()
      await page.waitForSelector('.message, [role="user"], [role="assistant"], .chat-message, div[class*="message"]', { 
        state: 'visible',
        timeout: 5000 
      })
      const switchTime = Date.now() - switchStartTime
      
      console.log(`Chat switch completed in ${switchTime}ms`)
      expect(switchTime).toBeLessThan(3000) // Should switch in under 3 seconds
      
      // Switch back to first chat
      await firstChat.click()
      await page.waitForSelector('.message, [role="user"], [role="assistant"], .chat-message, div[class*="message"]', { 
        state: 'visible',
        timeout: 5000 
      })
    } else {
      console.log('Not enough chats for switching test')
    }
  })

  test('performance metrics are acceptable', async ({ page }) => {
    // Measure initial page load performance
    const performanceMetrics = await page.evaluate(() => {
      const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming
      return {
        domContentLoaded: navigation.domContentLoadedEventEnd - navigation.domContentLoadedEventStart,
        loadComplete: navigation.loadEventEnd - navigation.loadEventStart,
        firstPaint: performance.getEntriesByName('first-paint')[0]?.startTime || 0,
        firstContentfulPaint: performance.getEntriesByName('first-contentful-paint')[0]?.startTime || 0
      }
    })
    
    console.log('Performance Metrics:', performanceMetrics)
    
    // Verify performance thresholds
    expect(performanceMetrics.firstContentfulPaint).toBeLessThan(3000) // FCP under 3s
    expect(performanceMetrics.loadComplete).toBeLessThan(5000) // Full load under 5s
  })
})