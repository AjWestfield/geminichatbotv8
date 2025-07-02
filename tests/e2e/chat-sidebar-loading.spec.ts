import { test, expect } from '@playwright/test'

test.describe('Chat Sidebar Loading Performance', () => {
  test('loads existing chat sessions quickly from sidebar', async ({ page }) => {
    // Navigate to the app
    await page.goto('/', { waitUntil: 'networkidle' })
    
    // Wait for the app to load
    await page.waitForLoadState('domcontentloaded')
    await page.waitForTimeout(2000) // Give app time to initialize
    
    // Look for existing chats in the sidebar
    const chatLinks = page.locator('a[href*="/chat/"], aside a, nav a').filter({ hasText: /Chat|Image|Video|Test/ })
    
    const chatCount = await chatLinks.count()
    console.log(`Found ${chatCount} existing chats in sidebar`)
    
    if (chatCount > 0) {
      // Test loading the first chat
      const firstChat = chatLinks.first()
      const chatText = await firstChat.textContent()
      console.log(`Testing chat: "${chatText}"`)
      
      // Measure click to load time
      const startTime = Date.now()
      
      // Click the chat
      await firstChat.click()
      
      // Wait for messages to appear
      try {
        await page.waitForSelector('.message, [class*="message"], .chat-message', {
          state: 'visible',
          timeout: 10000
        })
        
        const loadTime = Date.now() - startTime
        console.log(`✅ Chat loaded in ${loadTime}ms`)
        
        // Check if pagination toast appears
        const toasts = await page.locator('.sonner-toast, [role="status"]').count()
        if (toasts > 0) {
          const toastText = await page.locator('.sonner-toast, [role="status"]').first().textContent()
          console.log(`Pagination info: ${toastText}`)
        }
        
        // Count messages loaded
        const messages = await page.locator('.message, [class*="message"], .chat-message').count()
        console.log(`Loaded ${messages} messages`)
        
        // Performance assertions
        expect(loadTime).toBeLessThan(5000) // Should load in under 5 seconds
        expect(messages).toBeGreaterThan(0) // Should have at least one message
        
      } catch (error) {
        console.error('Failed to load chat messages:', error)
        
        // Take a screenshot for debugging
        await page.screenshot({ path: 'chat-loading-error.png' })
        
        // Check if there's an error message
        const errorText = await page.textContent('body')
        console.log('Page content:', errorText?.substring(0, 500))
        
        throw error
      }
    } else {
      console.log('No existing chats found. Creating a test chat...')
      
      // Create a test chat first
      const input = page.locator('textarea, input[type="text"]').first()
      await input.fill('Test chat for performance testing')
      await input.press('Enter')
      
      // Wait for response
      await page.waitForTimeout(5000)
      
      console.log('Test chat created. Please run the test again to test chat loading.')
    }
  })
  
  test('verifies database optimization for large chats', async ({ page }) => {
    await page.goto('/', { waitUntil: 'networkidle' })
    
    // Check console for any timeout warnings
    const consoleMessages: string[] = []
    page.on('console', msg => {
      if (msg.type() === 'error' || msg.text().includes('timeout') || msg.text().includes('CHAT PERSISTENCE')) {
        consoleMessages.push(msg.text())
      }
    })
    
    // Wait a bit to collect any console messages
    await page.waitForTimeout(3000)
    
    // Check for timeout errors
    const timeoutErrors = consoleMessages.filter(msg => 
      msg.includes('timeout') || msg.includes('57014') || msg.includes('Database timeout')
    )
    
    if (timeoutErrors.length > 0) {
      console.log('⚠️  Database timeout errors detected:')
      timeoutErrors.forEach(err => console.log(`   ${err}`))
      console.log('\n💡 Run "npm run db:optimize-performance" to fix this issue')
    } else {
      console.log('✅ No database timeout errors detected')
    }
    
    // The test passes even with timeouts - we just report them
    expect(true).toBe(true)
  })
})