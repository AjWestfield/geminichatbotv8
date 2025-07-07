import { test, expect } from '@playwright/test'

test.describe('Chat Submission Fix', () => {
  test.beforeEach(async ({ page }) => {
    // Go to the homepage
    await page.goto('http://localhost:3000')
    
    // Wait for the page to load
    await page.waitForSelector('[data-testid="chat-input"]', { timeout: 10000 })
  })

  test('should NOT auto-submit when typing in chat input', async ({ page }) => {
    // Find the chat input textarea
    const chatInput = page.locator('[data-testid="chat-input"]')
    
    // Set up a listener to detect if form submission happens
    let submissionDetected = false
    page.on('request', request => {
      if (request.url().includes('/api/chat') && request.method() === 'POST') {
        submissionDetected = true
      }
    })
    
    // Type text slowly to simulate real user input
    await chatInput.click()
    await chatInput.type('This is a test message', { delay: 100 })
    
    // Wait a bit to ensure no auto-submission happens
    await page.waitForTimeout(2000)
    
    // Verify that no submission was triggered
    expect(submissionDetected).toBe(false)
    
    // Verify the text is still in the input
    const inputValue = await chatInput.inputValue()
    expect(inputValue).toBe('This is a test message')
  })

  test('should only submit when Enter key is pressed', async ({ page }) => {
    // Find the chat input textarea
    const chatInput = page.locator('[data-testid="chat-input"]')
    
    // Set up a listener to detect form submission
    let submissionDetected = false
    let requestPromise = page.waitForRequest(request => 
      request.url().includes('/api/chat') && request.method() === 'POST',
      { timeout: 5000 }
    ).then(() => {
      submissionDetected = true
    }).catch(() => {
      // Timeout is fine, it means no submission happened
    })
    
    // Type text
    await chatInput.click()
    await chatInput.fill('Test message for submission')
    
    // Verify no submission yet
    expect(submissionDetected).toBe(false)
    
    // Press Enter to submit
    await chatInput.press('Enter')
    
    // Wait for submission or timeout
    await Promise.race([
      requestPromise,
      page.waitForTimeout(2000)
    ])
    
    // Verify submission happened
    expect(submissionDetected).toBe(true)
    
    // Verify input was cleared after submission
    const inputValueAfterSubmit = await chatInput.inputValue()
    expect(inputValueAfterSubmit).toBe('')
  })

  test('should NOT submit when Shift+Enter is pressed', async ({ page }) => {
    // Find the chat input textarea
    const chatInput = page.locator('[data-testid="chat-input"]')
    
    // Set up a listener to detect form submission
    let submissionDetected = false
    page.on('request', request => {
      if (request.url().includes('/api/chat') && request.method() === 'POST') {
        submissionDetected = true
      }
    })
    
    // Type text
    await chatInput.click()
    await chatInput.type('Line 1')
    
    // Press Shift+Enter for new line
    await chatInput.press('Shift+Enter')
    
    // Type more text
    await chatInput.type('Line 2')
    
    // Wait a bit
    await page.waitForTimeout(1000)
    
    // Verify no submission happened
    expect(submissionDetected).toBe(false)
    
    // Verify multi-line text is in the input
    const inputValue = await chatInput.inputValue()
    expect(inputValue).toContain('Line 1')
    expect(inputValue).toContain('Line 2')
  })

  test('should NOT auto-submit when pasting text', async ({ page }) => {
    // Find the chat input textarea
    const chatInput = page.locator('[data-testid="chat-input"]')
    
    // Set up a listener to detect form submission
    let submissionDetected = false
    page.on('request', request => {
      if (request.url().includes('/api/chat') && request.method() === 'POST') {
        submissionDetected = true
      }
    })
    
    // Click on input
    await chatInput.click()
    
    // Paste text using clipboard API
    await page.evaluate(() => {
      const textarea = document.querySelector('[data-testid="chat-input"]') as HTMLTextAreaElement
      if (textarea) {
        textarea.value = 'This is pasted text'
        textarea.dispatchEvent(new Event('input', { bubbles: true }))
      }
    })
    
    // Wait to ensure no auto-submission
    await page.waitForTimeout(2000)
    
    // Verify no submission happened
    expect(submissionDetected).toBe(false)
    
    // Verify text is in the input
    const inputValue = await chatInput.inputValue()
    expect(inputValue).toBe('This is pasted text')
  })

  test('should NOT auto-submit when typing URLs', async ({ page }) => {
    // Find the chat input textarea
    const chatInput = page.locator('[data-testid="chat-input"]')
    
    // Set up a listener to detect form submission
    let submissionDetected = false
    page.on('request', request => {
      if (request.url().includes('/api/chat') && request.method() === 'POST') {
        submissionDetected = true
      }
    })
    
    // Type a URL
    await chatInput.click()
    await chatInput.type('Check out this video: https://www.youtube.com/watch?v=dQw4w9WgXcQ', { delay: 50 })
    
    // Wait to ensure no auto-submission
    await page.waitForTimeout(2000)
    
    // Verify no submission happened
    expect(submissionDetected).toBe(false)
    
    // Verify URL is still in the input
    const inputValue = await chatInput.inputValue()
    expect(inputValue).toContain('https://www.youtube.com/watch?v=dQw4w9WgXcQ')
  })

  test('should handle rapid typing without auto-submission', async ({ page }) => {
    // Find the chat input textarea
    const chatInput = page.locator('[data-testid="chat-input"]')
    
    // Set up a listener to detect form submission
    let submissionDetected = false
    page.on('request', request => {
      if (request.url().includes('/api/chat') && request.method() === 'POST') {
        submissionDetected = true
      }
    })
    
    // Type rapidly
    await chatInput.click()
    await chatInput.type('This is a very long message that I am typing very quickly to test if rapid typing causes any auto-submission issues', { delay: 10 })
    
    // Wait a bit
    await page.waitForTimeout(1000)
    
    // Verify no submission happened
    expect(submissionDetected).toBe(false)
    
    // Verify all text is in the input
    const inputValue = await chatInput.inputValue()
    expect(inputValue.length).toBeGreaterThan(100)
  })

  test('should submit empty message prevention', async ({ page }) => {
    // Find the chat input textarea
    const chatInput = page.locator('[data-testid="chat-input"]')
    
    // Set up a listener to detect form submission
    let submissionDetected = false
    page.on('request', request => {
      if (request.url().includes('/api/chat') && request.method() === 'POST') {
        submissionDetected = true
      }
    })
    
    // Click on empty input and press Enter
    await chatInput.click()
    await chatInput.press('Enter')
    
    // Wait a bit
    await page.waitForTimeout(1000)
    
    // Verify no submission happened for empty input
    expect(submissionDetected).toBe(false)
  })

  test('should handle special characters without auto-submission', async ({ page }) => {
    // Find the chat input textarea
    const chatInput = page.locator('[data-testid="chat-input"]')
    
    // Set up a listener to detect form submission
    let submissionDetected = false
    page.on('request', request => {
      if (request.url().includes('/api/chat') && request.method() === 'POST') {
        submissionDetected = true
      }
    })
    
    // Type special characters
    await chatInput.click()
    await chatInput.type('Test with special chars: !@#$%^&*()_+-=[]{}|;\':",./<>?', { delay: 50 })
    
    // Wait to ensure no auto-submission
    await page.waitForTimeout(1500)
    
    // Verify no submission happened
    expect(submissionDetected).toBe(false)
    
    // Verify text is in the input
    const inputValue = await chatInput.inputValue()
    expect(inputValue).toContain('!@#$%^&*()')
  })
})