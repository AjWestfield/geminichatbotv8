import { test, expect } from '@playwright/test'

test.describe('YouTube SSE Progress Test', () => {
  test.setTimeout(90000)

  test('YouTube download with real-time progress', async ({ page }) => {
    // Capture console logs
    const consoleLogs: string[] = []
    page.on('console', msg => {
      const text = msg.text()
      consoleLogs.push(`[${msg.type()}] ${text}`)
      if (msg.type() === 'error') {
        console.log(`❌ Console Error: ${text}`)
      }
    })
    
    // Navigate to app
    await page.goto('http://localhost:3000')
    await page.waitForLoadState('networkidle')
    
    const chatInput = await page.getByPlaceholder('What can I do for you?')
    
    console.log('Testing YouTube download with real yt-dlp progress...')
    
    const progressUpdates: number[] = []
    const progressMessages: string[] = []
    let sseResponseReceived = false
    let downloadCompleted = false
    
    // Monitor SSE response
    page.on('response', async response => {
      if (response.url().includes('youtube-download-sse')) {
        sseResponseReceived = true
        console.log('✅ YouTube SSE endpoint called')
        console.log(`  Status: ${response.status()}`)
        console.log(`  Content-Type: ${response.headers()['content-type']}`)
      }
    })
    
    // Start monitoring progress before paste
    const monitoringPromise = (async () => {
      for (let i = 0; i < 300; i++) { // 60 seconds
        try {
          // Check progress bar
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
              
              if (progress === 100) {
                downloadCompleted = true
              }
            }
          }
          
          // Check for file appearance
          const fileItem = page.locator('div[data-file-name*=".mp4"]').first()
          if (await fileItem.isVisible({ timeout: 100 })) {
            const fileName = await fileItem.getAttribute('data-file-name')
            console.log(`✅ File appeared: ${fileName}`)
            break
          }
        } catch (e) {
          // Element not visible
        }
        await page.waitForTimeout(200)
      }
    })()
    
    // Paste YouTube URL
    await chatInput.fill('https://www.youtube.com/watch?v=dQw4w9WgXcQ')
    console.log('Pasted YouTube URL')
    
    // Wait for monitoring to complete
    await monitoringPromise
    
    // Final checks
    console.log('\n📊 Results:')
    console.log(`- SSE endpoint called: ${sseResponseReceived ? '✅' : '❌'}`)
    console.log(`- Progress updates: ${progressUpdates.length}`)
    console.log(`- Progress values: ${progressUpdates.join(', ')}`)
    console.log(`- Download completed: ${downloadCompleted ? '✅' : '❌'}`)
    console.log(`- Messages: ${progressMessages.join(' -> ')}`)
    
    // Check if progress was from actual yt-dlp
    const hasYtDlpProgress = progressMessages.some(m => 
      m.includes('Downloading:') || m.includes('download') || m.includes('[download]')
    )
    console.log(`- Real yt-dlp progress: ${hasYtDlpProgress ? '✅' : '❌'}`)
    
    // Check final state
    const inputValue = await chatInput.inputValue()
    const fileVisible = await page.locator('div[data-file-name*=".mp4"]').isVisible()
    const hasVideoOptions = await page.locator('text="Analyze video"').or(page.locator('text="Reverse engineer"')).isVisible()
    
    console.log(`- Input cleared: ${inputValue === '' ? '✅' : '❌'} (value: "${inputValue}")`)
    console.log(`- File in list: ${fileVisible ? '✅' : '❌'}`)
    console.log(`- Video options shown: ${hasVideoOptions ? '✅' : '❌'}`)
    
    // Print any errors
    if (consoleLogs.some(log => log.includes('error'))) {
      console.log('\n❌ Errors found:')
      consoleLogs.filter(log => log.includes('error') || log.includes('Error')).forEach(log => console.log(log))
    }
    
    // Assertions
    expect(sseResponseReceived).toBe(true)
    expect(progressUpdates.length).toBeGreaterThan(3)
    
    // Take screenshot
    await page.screenshot({ path: 'youtube-sse-test.png', fullPage: true })
    console.log('\nScreenshot saved as youtube-sse-test.png')
  })

  test('Test YouTube API directly', async ({ page }) => {
    console.log('Testing YouTube SSE API endpoint...')
    
    const response = await page.request.post('http://localhost:3000/api/youtube-download-sse', {
      data: {
        url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
        quality: 'auto'
      },
      headers: {
        'Content-Type': 'application/json'
      }
    })
    
    console.log(`API Status: ${response.status()}`)
    console.log(`Content-Type: ${response.headers()['content-type']}`)
    
    if (response.status() === 200) {
      console.log('✅ YouTube SSE endpoint is working')
      
      // Try to read first few events
      const body = await response.text()
      const lines = body.split('\n').slice(0, 10)
      console.log('\nFirst few SSE events:')
      lines.forEach(line => {
        if (line.startsWith('data: ')) {
          try {
            const data = JSON.parse(line.slice(6))
            console.log(`  ${data.status}: ${data.progress}% - ${data.message}`)
          } catch (e) {
            // Ignore parse errors
          }
        }
      })
    } else {
      const error = await response.text()
      console.log(`❌ Error: ${error}`)
    }
  })
})