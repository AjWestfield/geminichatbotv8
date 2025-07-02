import { test, expect, Page } from '@playwright/test'

test.describe('TTS (Text-to-Speech) Functionality', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to the app
    await page.goto('/')
    
    // Wait for app to load by checking for chat input
    await page.waitForSelector('textarea[placeholder*="Type a message"]', { timeout: 30000 })
    
    // Clear any existing chat
    const newChatButton = page.locator('button:has-text("New Chat")')
    if (await newChatButton.isVisible()) {
      await newChatButton.click()
      await page.waitForTimeout(1000) // Allow time for chat to clear
    }
  })

  test('Basic TTS Generation', async ({ page }) => {
    // Type TTS request
    const input = page.locator('textarea[placeholder*="Type a message"]')
    await input.fill('read this aloud: Hello world, this is a test of the text-to-speech functionality.')
    
    // Submit the message
    await page.keyboard.press('Enter')
    
    // Wait for assistant response
    await page.waitForSelector('.assistant-message', { timeout: 30000 })
    
    // Wait for TTS generation to complete
    await page.waitForTimeout(3000) // Allow time for TTS processing
    
    // Check that audio tab is activated
    const audioTab = page.locator('[role="tab"]:has-text("Audio")')
    await expect(audioTab).toHaveAttribute('data-state', 'active')
    
    // Check that audio gallery is visible
    const audioGallery = page.locator('text="Audio Gallery"')
    await expect(audioGallery).toBeVisible()
    
    // Check that audio player card is present - look for any audio element or player controls
    const audioPlayer = page.locator('audio').or(page.locator('button[aria-label="Play"]').or(page.locator('.rounded-lg.bg-muted')))
    await expect(audioPlayer).toBeVisible({ timeout: 10000 })
    
    // Verify audio controls
    const playButton = page.locator('button[aria-label="Play"]').or(page.locator('button:has-text("Play")'))
    await expect(playButton).toBeVisible()
    
    // Verify download button
    const downloadButton = page.locator('button[aria-label="Download"]').or(page.locator('button:has-text("Download")'))
    await expect(downloadButton).toBeVisible()
  })

  test('Multi-Speaker Dialogue TTS', async ({ page }) => {
    // Type multi-speaker TTS request
    const input = page.locator('textarea[placeholder*="Type a message"]')
    await input.fill(`generate a dialogue TTS:
[S1] Hello! How are you today?
[S2] I'm doing great, thanks for asking!
[S1] That's wonderful to hear!`)
    
    // Submit the message
    await page.keyboard.press('Enter')
    
    // Wait for assistant response
    await page.waitForSelector('.assistant-message', { timeout: 30000 })
    
    // Wait for TTS generation to complete
    await page.waitForTimeout(3000)
    
    // Check that audio tab is activated
    const audioTab = page.locator('[role="tab"]:has-text("Audio")')
    await expect(audioTab).toHaveAttribute('data-state', 'active')
    
    // Check for audio player
    const audioPlayer = page.locator('audio').or(page.locator('button[aria-label="Play"]'))
    await expect(audioPlayer).toBeVisible({ timeout: 10000 })
    
    // Check for speaker tags in transcript area
    const transcriptArea = page.locator('.text-sm.text-muted-foreground').or(page.locator('text="[S1]"').or(page.locator('text="[S2]"')))
    await expect(transcriptArea).toBeVisible({ timeout: 10000 })
  })

  test('TTS Error Handling - Missing API Key', async ({ page }) => {
    // Clear any existing WAVESPEED_API_KEY by reloading without it
    // Note: This test assumes the app can run without the API key for testing
    
    // Type TTS request
    const input = page.locator('textarea[placeholder*="Type a message"]')
    await input.fill('TTS: Generate audio for this text')
    
    // Submit the message
    await page.keyboard.press('Enter')
    
    // Wait for assistant response
    await page.waitForSelector('.assistant-message', { timeout: 30000 })
    
    // Check for error message or instruction about API key
    const assistantMessage = page.locator('.assistant-message').last()
    const messageText = await assistantMessage.textContent()
    
    // Should either show error toast or provide instructions
    const hasErrorToast = await page.locator('.sonner-toast-error').or(page.locator('[data-sonner-toast][data-type="error"]')).isVisible().catch(() => false)
    const hasInstructions = messageText?.toLowerCase().includes('api key') || messageText?.toLowerCase().includes('wavespeed')
    
    expect(hasErrorToast || hasInstructions).toBeTruthy()
  })

  test('Audio Player Controls', async ({ page }) => {
    // Generate audio first
    const input = page.locator('textarea[placeholder*="Type a message"]')
    await input.fill('read this aloud: Testing audio player controls')
    await page.keyboard.press('Enter')
    
    // Wait for audio generation
    await page.waitForSelector('.assistant-message', { timeout: 30000 })
    await page.waitForTimeout(3000)
    
    // Navigate to audio tab if needed
    const audioTab = page.locator('[role="tab"]:has-text("Audio")')
    if (await audioTab.getAttribute('data-state') !== 'active') {
      await audioTab.click()
    }
    
    // Test play/pause functionality
    const playButton = page.locator('button[aria-label="Play"]').or(page.locator('button:has(svg.lucide-play)'))
    await playButton.click()
    
    // After clicking play, it should change to pause
    const pauseButton = page.locator('button[aria-label="Pause"]').or(page.locator('button:has(svg.lucide-pause)'))
    await expect(pauseButton).toBeVisible({ timeout: 5000 })
    
    // Test volume control
    const volumeSlider = page.locator('input[type="range"]')
    await expect(volumeSlider).toBeVisible()
    
    // Test skip controls
    const skipForward = page.locator('button[aria-label="Skip forward 10 seconds"]').or(page.locator('button:has-text("10s")').nth(1))
    await expect(skipForward).toBeVisible()
    
    const skipBackward = page.locator('button[aria-label="Skip backward 10 seconds"]').or(page.locator('button:has-text("10s")').first())
    await expect(skipBackward).toBeVisible()
  })

  test('Word-by-Word Highlighting', async ({ page }) => {
    // Generate audio with specific text
    const input = page.locator('textarea[placeholder*="Type a message"]')
    await input.fill('TTS: The quick brown fox jumps over the lazy dog.')
    await page.keyboard.press('Enter')
    
    // Wait for audio generation
    await page.waitForSelector('.assistant-message', { timeout: 30000 })
    await page.waitForTimeout(3000)
    
    // Navigate to audio tab
    const audioTab = page.locator('[role="tab"]:has-text("Audio")')
    if (await audioTab.getAttribute('data-state') !== 'active') {
      await audioTab.click()
    }
    
    // Start playback
    const playButton = page.locator('button[aria-label="Play"]').or(page.locator('button:has(svg.lucide-play)'))
    await playButton.click()
    
    // Check for word highlighting or active playback state
    await page.waitForTimeout(2000) // Give some time for playback to start
    
    // Verify transcript area is visible
    const transcript = page.locator('.text-sm.text-muted-foreground')
    await expect(transcript).toBeVisible()
    await expect(transcript).toContainText('quick brown fox')
  })

  test('Audio Persistence - IndexedDB Storage', async ({ page }) => {
    // Generate audio
    const input = page.locator('textarea[placeholder*="Type a message"]')
    await input.fill('TTS: This audio should be saved to IndexedDB')
    await page.keyboard.press('Enter')
    
    // Wait for audio generation
    await page.waitForSelector('.assistant-message', { timeout: 30000 })
    await page.waitForTimeout(3000)
    
    // Verify audio is in gallery
    const audioTab = page.locator('[role="tab"]:has-text("Audio")')
    if (await audioTab.getAttribute('data-state') !== 'active') {
      await audioTab.click()
    }
    
    const audioPlayer = page.locator('audio').or(page.locator('button[aria-label="Play"]'))
    await expect(audioPlayer).toBeVisible()
    
    // Get the audio text for verification
    const audioText = await page.locator('.text-sm.text-muted-foreground').textContent()
    
    // Reload the page
    await page.reload()
    
    // Wait for app to load by checking for chat input
    await page.waitForSelector('textarea[placeholder*="Type a message"]', { timeout: 30000 })
    
    // Navigate to audio tab
    const audioTabAfterReload = page.locator('[role="tab"]:has-text("Audio")')
    await audioTabAfterReload.click()
    
    // Verify audio is still present
    const audioPlayerAfterReload = page.locator('audio').or(page.locator('button[aria-label="Play"]'))
    await expect(audioPlayerAfterReload).toBeVisible({ timeout: 10000 })
    
    // Verify it's the same audio
    const audioTextAfterReload = await page.locator('.text-sm.text-muted-foreground').textContent()
    expect(audioTextAfterReload).toContain('This audio should be saved to IndexedDB')
  })

  test('Multiple TTS Requests', async ({ page }) => {
    // Generate first audio
    const input = page.locator('textarea[placeholder*="Type a message"]')
    await input.fill('TTS: First audio message')
    await page.keyboard.press('Enter')
    
    // Wait for first audio
    await page.waitForSelector('.assistant-message', { timeout: 30000 })
    await page.waitForTimeout(3000)
    
    // Generate second audio
    await input.fill('read aloud: Second audio message with different content')
    await page.keyboard.press('Enter')
    
    // Wait for second audio
    await page.waitForSelector('.assistant-message:nth-of-type(2)', { timeout: 30000 })
    await page.waitForTimeout(3000)
    
    // Navigate to audio tab
    const audioTab = page.locator('[role="tab"]:has-text("Audio")')
    if (await audioTab.getAttribute('data-state') !== 'active') {
      await audioTab.click()
    }
    
    // Verify both audios are present - look for audio elements or play buttons
    const audioPlayers = page.locator('audio, button[aria-label="Play"]')
    const audioCount = await audioPlayers.count()
    expect(audioCount).toBeGreaterThanOrEqual(2)
    
    // Verify different content in transcript areas
    const transcriptAreas = page.locator('.text-sm.text-muted-foreground')
    const firstTranscript = transcriptAreas.nth(0)
    const secondTranscript = transcriptAreas.nth(1)
    
    await expect(firstTranscript).toContainText('First audio message')
    await expect(secondTranscript).toContainText('Second audio message')
  })

  test('TTS with Special Characters and Formatting', async ({ page }) => {
    // Test with special characters and formatting
    const input = page.locator('textarea[placeholder*="Type a message"]')
    await input.fill(`TTS: Generate speech for this text with special formatting:
- Bullet point one
- Bullet point two
"Quoted text with emphasis!"
Numbers: 123, 456, 789
Email: test@example.com`)
    
    await page.keyboard.press('Enter')
    
    // Wait for audio generation
    await page.waitForSelector('.assistant-message', { timeout: 30000 })
    await page.waitForTimeout(3000)
    
    // Navigate to audio tab
    const audioTab = page.locator('[role="tab"]:has-text("Audio")')
    if (await audioTab.getAttribute('data-state') !== 'active') {
      await audioTab.click()
    }
    
    // Verify audio was generated
    const audioPlayer = page.locator('audio').or(page.locator('button[aria-label="Play"]'))
    await expect(audioPlayer).toBeVisible({ timeout: 10000 })
    
    // Verify transcript contains the formatted text
    const transcript = page.locator('.text-sm.text-muted-foreground')
    await expect(transcript).toContainText('Bullet point')
    await expect(transcript).toContainText('Quoted text')
    await expect(transcript).toContainText('123')
  })
})

// Helper function to wait for audio generation
async function waitForAudioGeneration(page: Page) {
  // Wait for the audio tab to become active or audio player to appear
  await Promise.race([
    page.waitForSelector('[role="tab"]:has-text("Audio")[data-state="active"]', { timeout: 10000 }),
    page.waitForSelector('[data-testid="audio-player-card"], .audio-player-card', { timeout: 10000 })
  ])
}