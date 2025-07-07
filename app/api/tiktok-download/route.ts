import { NextRequest, NextResponse } from 'next/server'
import { exec } from 'child_process'
import { promisify } from 'util'
import fs from 'fs/promises'
import path from 'path'
import { GoogleAIFileManager } from '@google/generative-ai/server'
import { generateVideoThumbnail } from '@/lib/video-utils'

const execAsync = promisify(exec)

// Initialize Gemini File Manager
const apiKey = process.env.GEMINI_API_KEY
const fileManager = apiKey ? new GoogleAIFileManager(apiKey) : null

export async function POST(request: NextRequest) {
  let tempVideoPath: string | null = null
  let tempThumbnailPath: string | null = null

  try {
    const { url } = await request.json()

    if (!url) {
      return NextResponse.json({ error: 'URL is required' }, { status: 400 })
    }

    // Create a temporary directory for downloads
    const tempDir = path.join(process.cwd(), 'temp')
    await fs.mkdir(tempDir, { recursive: true })

    // Generate a unique filename
    const timestamp = Date.now()
    const randomId = Math.random().toString(36).substring(7)
    tempVideoPath = path.join(tempDir, `tiktok-${timestamp}-${randomId}.mp4`)

    console.log('[TikTok Download] Starting download for URL:', url)

    // Use yt-dlp to download TikTok video
    // Add proxy support if environment variable is set
    const proxyOption = process.env.HTTP_PROXY || process.env.HTTPS_PROXY 
      ? `--proxy "${process.env.HTTP_PROXY || process.env.HTTPS_PROXY}"` 
      : '';
    
    // Update yt-dlp before downloading to ensure we have the latest TikTok fixes
    const updateCommand = 'yt-dlp -U || true' // Try to update but don't fail if it can't
    try {
      console.log('[TikTok Download] Updating yt-dlp...')
      await execAsync(updateCommand, { timeout: 30000 })
    } catch (error) {
      console.log('[TikTok Download] Could not update yt-dlp:', error)
    }
    
    const command = `yt-dlp -f "best[ext=mp4]/best" -o "${tempVideoPath}" --no-playlist --quiet --no-warnings ${proxyOption} "${url}"`
    
    console.log('[TikTok Download] Executing command:', command.replace(/--proxy "[^"]*"/, '--proxy "***"')) // Hide proxy in logs
    
    try {
      await execAsync(command, { 
        timeout: 120000, // 2 minute timeout
        maxBuffer: 50 * 1024 * 1024 // 50MB buffer
      })
    } catch (error: any) {
      console.error('[TikTok Download] yt-dlp error:', error)
      
      // Check for specific error types
      if (error.stderr?.includes('Your IP address is blocked')) {
        throw new Error('TikTok has blocked downloads from this server. This is a common issue with cloud servers. Try using the browser extension or ask the administrator to configure a proxy.')
      }
      
      if (error.message?.includes('private') || error.message?.includes('login required')) {
        throw new Error('This TikTok video is private or requires authentication')
      }
      
      if (error.stderr?.includes('Unable to extract')) {
        throw new Error('Unable to extract video. TikTok may have changed their format. Please try updating yt-dlp or report this issue.')
      }
      
      throw new Error(`Failed to download video: ${error.stderr || error.message || 'Unknown error'}`)
    }

    // Verify the file was created and has content
    let videoStats: any
    try {
      videoStats = await fs.stat(tempVideoPath)
      if (videoStats.size === 0) {
        throw new Error('Downloaded file is empty')
      }
      console.log('[TikTok Download] Downloaded file size:', videoStats.size)
    } catch (error) {
      console.error('[TikTok Download] File verification error:', error)
      throw new Error('Failed to download video file')
    }

    // Read the video file
    const videoBuffer = await fs.readFile(tempVideoPath)
    const videoBlob = new Blob([videoBuffer], { type: 'video/mp4' })

    // Get video metadata
    let metadata: any = {}
    try {
      const metadataCommand = `yt-dlp --dump-json --no-warnings "${url}"`
      const { stdout } = await execAsync(metadataCommand, {
        timeout: 30000,
        maxBuffer: 10 * 1024 * 1024
      })
      metadata = JSON.parse(stdout)
      console.log('[TikTok Download] Video metadata:', {
        title: metadata.title,
        duration: metadata.duration,
        uploader: metadata.uploader,
        description: metadata.description?.substring(0, 100)
      })
    } catch (error) {
      console.error('[TikTok Download] Metadata extraction error:', error)
      // Continue without metadata
    }

    // Generate thumbnail
    let thumbnailBase64: string | undefined
    try {
      tempThumbnailPath = await generateVideoThumbnail(tempVideoPath)
      if (tempThumbnailPath) {
        const thumbnailBuffer = await fs.readFile(tempThumbnailPath)
        thumbnailBase64 = `data:image/jpeg;base64,${thumbnailBuffer.toString('base64')}`
        console.log('[TikTok Download] Thumbnail generated successfully')
      }
    } catch (error) {
      console.error('[TikTok Download] Thumbnail generation error:', error)
      // Continue without thumbnail
    }

    // Check if file manager is available
    if (!fileManager) {
      throw new Error('Gemini API key is not configured')
    }

    // Upload to Gemini
    console.log('[TikTok Download] Uploading to Gemini...')
    const uploadResponse = await fileManager.uploadFile(tempVideoPath, {
      mimeType: 'video/mp4',
      displayName: metadata.title || `TikTok Video ${timestamp}`
    })

    // Wait for file to be processed
    let fileInfo = await fileManager.getFile(uploadResponse.file.name)
    console.log('[TikTok Download] File upload - Initial state:', fileInfo.state)

    const maxWaitTime = 120000 // 2 minutes
    const startTime = Date.now()
    
    while (fileInfo.state === "PROCESSING") {
      if (Date.now() - startTime > maxWaitTime) {
        throw new Error("File processing timeout - took longer than 2 minutes")
      }
      
      await new Promise(resolve => setTimeout(resolve, 2000)) // Check every 2 seconds
      fileInfo = await fileManager.getFile(uploadResponse.file.name)
    }

    if (fileInfo.state === "FAILED") {
      throw new Error('File processing failed')
    }

    console.log('[TikTok Download] Upload successful:', fileInfo.uri)

    // Clean up temporary files
    try {
      await fs.unlink(tempVideoPath)
      if (tempThumbnailPath) {
        await fs.unlink(tempThumbnailPath)
      }
    } catch (error) {
      console.error('[TikTok Download] Cleanup error:', error)
    }

    // Return the result
    const response = {
      success: true,
      file: {
        uri: fileInfo.uri,
        mimeType: fileInfo.mimeType,
        name: fileInfo.displayName || fileInfo.name,
        sizeBytes: fileInfo.sizeBytes || videoStats.size,
        videoThumbnail: thumbnailBase64,
        metadata: {
          title: metadata.title || 'TikTok Video',
          duration: metadata.duration,
          uploader: metadata.uploader,
          description: metadata.description,
          thumbnail: metadata.thumbnail,
          viewCount: metadata.view_count,
          likeCount: metadata.like_count,
          commentCount: metadata.comment_count
        }
      }
    }

    return NextResponse.json(response)

  } catch (error) {
    console.error('[TikTok Download] Error:', error)
    
    // Clean up any temporary files
    if (tempVideoPath) {
      try {
        await fs.unlink(tempVideoPath)
      } catch (cleanupError) {
        console.error('[TikTok Download] Cleanup error:', cleanupError)
      }
    }
    if (tempThumbnailPath) {
      try {
        await fs.unlink(tempThumbnailPath)
      } catch (cleanupError) {
        console.error('[TikTok Download] Cleanup error:', cleanupError)
      }
    }

    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred'
    
    return NextResponse.json(
      { 
        error: 'Failed to download TikTok video',
        details: errorMessage
      },
      { status: 500 }
    )
  }
}