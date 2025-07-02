import { GoogleAIFileManager } from "@google/generative-ai/server"
import type { NextRequest } from "next/server"
import path from "node:path"
import fs from "node:fs/promises"
import os from "node:os"
import { execSync, spawn } from "node:child_process"
import YTDlpWrap from "yt-dlp-wrap"
import { GEMINI_LIMITS, GeminiLimitUtils } from "@/lib/gemini-limits"

// Dependency checking functions (reuse from original)
async function checkYtDlpAvailability(): Promise<{available: boolean, path?: string, version?: string, error?: string}> {
  try {
    // First try common locations
    const commonPaths = [
      'yt-dlp',
      '/opt/homebrew/bin/yt-dlp',
      '/usr/local/bin/yt-dlp',
      '/usr/bin/yt-dlp',
      path.join(process.cwd(), 'bin', process.platform === 'win32' ? 'yt-dlp.exe' : 'yt-dlp')
    ]
    
    for (const ytdlpPath of commonPaths) {
      try {
        const version = execSync(`"${ytdlpPath}" --version`, { 
          encoding: 'utf8', 
          timeout: 5000,
          stdio: ['pipe', 'pipe', 'pipe'] 
        }).trim()
        console.log(`[YouTube Download SSE] Found yt-dlp at: ${ytdlpPath}, version: ${version}`)
        return { available: true, path: ytdlpPath, version }
      } catch (e) {
        // Continue to next path
      }
    }
    
    return { 
      available: false, 
      error: `yt-dlp not found in any common location. PATH: ${process.env.PATH}` 
    }
  } catch (error) {
    return { available: false, error: `Failed to check yt-dlp: ${error.message}` }
  }
}

async function checkGeminiApiKey(): Promise<{valid: boolean, error?: string}> {
  const apiKey = process.env.GEMINI_API_KEY
  if (!apiKey) {
    return { valid: false, error: "GEMINI_API_KEY environment variable is not set" }
  }
  
  if (apiKey.length < 10) {
    return { valid: false, error: "GEMINI_API_KEY appears to be too short" }
  }
  
  if (!apiKey.startsWith('AIza')) {
    return { valid: false, error: "GEMINI_API_KEY does not appear to be in the correct format" }
  }
  
  return { valid: true }
}

function isValidYouTubeUrl(url: string): boolean {
  try {
    const urlObj = new URL(url)
    const validDomains = ['youtube.com', 'www.youtube.com', 'youtu.be', 'm.youtube.com']
    return validDomains.includes(urlObj.hostname)
  } catch {
    return false
  }
}

// Create SSE response helper
function createSSEResponse(encoder: TextEncoder) {
  let streamClosed = false
  
  const sendEvent = (data: any) => {
    if (streamClosed) return
    const message = `data: ${JSON.stringify(data)}\n\n`
    return encoder.encode(message)
  }
  
  const close = () => {
    streamClosed = true
  }
  
  return { sendEvent, close }
}

export async function POST(req: NextRequest) {
  // Set up SSE headers
  const headers = new Headers({
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive',
    'X-Accel-Buffering': 'no', // Disable nginx buffering
  })

  const encoder = new TextEncoder()
  const { sendEvent } = createSSEResponse(encoder)
  
  // Store yt-dlp path for later use
  let ytDlpPath = 'yt-dlp'

  const stream = new ReadableStream({
    async start(controller) {
      try {
        // Send initial progress
        controller.enqueue(sendEvent({
          status: 'initializing',
          progress: 0,
          message: 'Starting YouTube download...'
        }))

        // Check dependencies
        const apiKeyCheck = await checkGeminiApiKey()
        if (!apiKeyCheck.valid) {
          controller.enqueue(sendEvent({
            status: 'error',
            error: apiKeyCheck.error,
            message: 'API configuration error'
          }))
          controller.close()
          return
        }

        controller.enqueue(sendEvent({
          status: 'checking',
          progress: 5,
          message: 'Checking yt-dlp availability...'
        }))

        const ytDlpCheck = await checkYtDlpAvailability()
        if (!ytDlpCheck.available) {
          controller.enqueue(sendEvent({
            status: 'error',
            error: ytDlpCheck.error,
            message: 'yt-dlp not available'
          }))
          controller.close()
          return
        }
        
        // Use the found yt-dlp path
        ytDlpPath = ytDlpCheck.path || 'yt-dlp'

        controller.enqueue(sendEvent({
          status: 'validated',
          progress: 10,
          message: 'Dependencies validated'
        }))

        const apiKey = process.env.GEMINI_API_KEY!
        const fileManager = new GoogleAIFileManager(apiKey)

        const { url, quality = 'auto' } = await req.json()

        if (!url || !isValidYouTubeUrl(url)) {
          controller.enqueue(sendEvent({
            status: 'error',
            error: 'Invalid YouTube URL',
            message: 'Please provide a valid YouTube URL'
          }))
          controller.close()
          return
        }

        controller.enqueue(sendEvent({
          status: 'preparing',
          progress: 15,
          message: 'Preparing download...'
        }))

        // Create temporary directory with sanitized name
        const tempDir = os.tmpdir()
        const timestamp = Date.now()
        const downloadDir = path.join(tempDir, `yt_dl_${timestamp}`)
        
        // Ensure directory exists and is writable
        await fs.mkdir(downloadDir, { recursive: true, mode: 0o755 })
        
        // Verify directory was created
        try {
          await fs.access(downloadDir, fs.constants.W_OK)
        } catch (e) {
          throw new Error(`Cannot write to download directory: ${downloadDir}`)
        }

        try {
          // Use a sanitized output template to avoid issues with special characters
          // Using video ID as fallback for problematic titles
          const outputTemplate = path.join(downloadDir, '%(title).100s-%(id)s.%(ext)s')
          
          // Build yt-dlp command
          const args = [
            url,
            '-o', outputTemplate,
            '--no-playlist',
            // Temporarily disable thumbnail download to avoid fragment issues
            // '--write-thumbnail',
            '--progress',
            '--newline',
            '--no-warnings',
            '--restrict-filenames',  // Restricts filenames to ASCII characters
            '--windows-filenames',   // Even more restrictive for safety
            '--trim-filenames', '150', // Limit filename length
            '--no-part',  // Don't use .part files
            '-N', '1',  // Use single connection to avoid fragment issues
            '--http-chunk-size', '10M',  // Larger chunks to reduce fragments
            '--no-cache-dir'  // Don't use cache directory
          ]

          // Add quality-specific arguments
          if (quality !== 'auto') {
            switch(quality) {
              case 'audio':
                args.push('-f', 'bestaudio[ext=m4a]/bestaudio[ext=webm]/bestaudio')
                break
              case '1080p':
                args.push('-f', 'best[height<=1080][ext=mp4]/best[height<=1080]')
                break
              case '720p':
                args.push('-f', 'best[height<=720][ext=mp4]/best[height<=720]')
                break
              case '480p':
                args.push('-f', 'best[height<=480][ext=mp4]/best[height<=480]')
                break
            }
          } else {
            // Use a safer format selection that prefers non-fragmented formats
            args.push('-f', 'best[ext=mp4]/best[ext=webm]/best')
          }

          controller.enqueue(sendEvent({
            status: 'downloading',
            progress: 20,
            message: 'Starting download...'
          }))

          // Spawn yt-dlp process
          console.log(`[YouTube Download SSE] Using yt-dlp at: ${ytDlpPath}`)
          console.log(`[YouTube Download SSE] Download directory: ${downloadDir}`)
          console.log(`[YouTube Download SSE] Command: ${ytDlpPath} ${args.join(' ')}`)
          const ytdlpProcess = spawn(ytDlpPath, args)
          
          let lastProgress = 20
          let title = ''
          let stderrBuffer = ''
          
          // Parse yt-dlp output for progress
          ytdlpProcess.stdout.on('data', (data) => {
            const output = data.toString()
            
            // Extract title from output
            const titleMatch = output.match(/\[download\] Destination: (.+)/)
            if (titleMatch) {
              title = path.basename(titleMatch[1], path.extname(titleMatch[1]))
            }
            
            // Also capture merger output for merged files
            const mergerMatch = output.match(/\[Merger\] Merging formats into "(.+)"/)
            if (mergerMatch) {
              title = path.basename(mergerMatch[1], path.extname(mergerMatch[1]))
            }
            
            // Extract download progress
            const progressMatch = output.match(/\[download\]\s+(\d+\.?\d*)%/)
            if (progressMatch) {
              const downloadPercent = parseFloat(progressMatch[1])
              // Map download progress (0-100%) to overall progress (20-80%)
              const overallProgress = 20 + (downloadPercent * 0.6)
              
              if (overallProgress > lastProgress) {
                lastProgress = overallProgress
                controller.enqueue(sendEvent({
                  status: 'downloading',
                  progress: Math.round(overallProgress),
                  message: `Downloading: ${Math.round(downloadPercent)}%`
                }))
              }
            }
            
            // Check if download is complete
            if (output.includes('[download] 100%')) {
              controller.enqueue(sendEvent({
                status: 'processing',
                progress: 80,
                message: 'Download complete, processing file...'
              }))
            }
          })

          ytdlpProcess.stderr.on('data', (data) => {
            const stderr = data.toString()
            stderrBuffer += stderr
            console.error(`[YouTube Download SSE] yt-dlp stderr: ${stderr}`)
          })
          
          // Handle spawn errors (e.g., yt-dlp not found)
          ytdlpProcess.on('error', (error) => {
            console.error('[YouTube Download SSE] Spawn error:', error)
            throw new Error(`Failed to start yt-dlp: ${error.message}`)
          })

          // Wait for download to complete
          await new Promise((resolve, reject) => {
            ytdlpProcess.on('close', (code) => {
              if (code === 0) {
                resolve(undefined)
              } else {
                // Sanitize stderr to remove filesystem paths before including in error
                let sanitizedStderr = stderrBuffer
                if (sanitizedStderr) {
                  // Remove filesystem paths
                  sanitizedStderr = sanitizedStderr.replace(/\/[^\s]+\/(yt_dl_\d+|youtube_download_\d+)\/[^\s]+/g, '[file]')
                  sanitizedStderr = sanitizedStderr.replace(/\/var\/folders\/[^\s]+/g, '[temp]')
                  sanitizedStderr = sanitizedStderr.replace(/\/tmp\/[^\s]+/g, '[temp]')
                }
                const errorDetails = sanitizedStderr ? `\nError details: ${sanitizedStderr}` : ''
                reject(new Error(`yt-dlp exited with code ${code}${errorDetails}`))
              }
            })
          })

          controller.enqueue(sendEvent({
            status: 'uploading',
            progress: 85,
            message: 'Uploading to Gemini...'
          }))

          // Find downloaded file
          const files = await fs.readdir(downloadDir)
          console.log(`[YouTube Download SSE] Files in download directory: ${files.join(', ')}`)
          
          const videoFile = files.find(file => 
            !file.endsWith('.jpg') && 
            !file.endsWith('.webp') && 
            !file.endsWith('.png') &&
            !file.endsWith('.json') &&
            !file.endsWith('.part') &&  // Exclude partial files
            !file.includes('.part-Frag')  // Exclude fragment files
          )

          if (!videoFile) {
            console.error(`[YouTube Download SSE] No video file found. Files: ${files.join(', ')}`)
            throw new Error('No video file found after download')
          }

          const videoPath = path.join(downloadDir, videoFile)
          const stats = await fs.stat(videoPath)
          
          // Check file size
          const fileSizeMB = stats.size / 1024 / 1024
          if (fileSizeMB > 2048) {
            throw new Error(`File too large: ${fileSizeMB.toFixed(1)}MB (max 2048MB)`)
          }

          controller.enqueue(sendEvent({
            status: 'uploading',
            progress: 90,
            message: `Uploading ${fileSizeMB.toFixed(1)}MB file to Gemini...`
          }))

          // Upload to Gemini
          const uploadResponse = await fileManager.uploadFile(videoPath, {
            mimeType: quality === 'audio' ? 'audio/mpeg' : 'video/mp4',
            displayName: title || videoFile
          })

          controller.enqueue(sendEvent({
            status: 'finalizing',
            progress: 95,
            message: 'Processing video...'
          }))

          // Try to get thumbnail URL from metadata instead of downloading file
          let thumbnailBase64 = null
          try {
            // Get video metadata including thumbnail URL
            const metadataResult = execSync(
              `${ytDlpPath} --dump-json --no-warnings "${url}"`,
              { encoding: 'utf8', maxBuffer: 10 * 1024 * 1024 }
            )
            
            const metadata = JSON.parse(metadataResult)
            if (metadata.thumbnail) {
              console.log('[YouTube Download SSE] Found thumbnail URL in metadata')
              
              // Download thumbnail from URL using fetch
              try {
                const thumbnailResponse = await fetch(metadata.thumbnail)
                if (thumbnailResponse.ok) {
                  const thumbnailBuffer = await thumbnailResponse.arrayBuffer()
                  const thumbnailBase64Data = Buffer.from(thumbnailBuffer).toString('base64')
                  const mimeType = thumbnailResponse.headers.get('content-type') || 'image/jpeg'
                  thumbnailBase64 = `data:${mimeType};base64,${thumbnailBase64Data}`
                  console.log('[YouTube Download SSE] Thumbnail downloaded from URL')
                }
              } catch (fetchError) {
                console.error('[YouTube Download SSE] Failed to fetch thumbnail:', fetchError.message)
              }
            }
          } catch (metadataError) {
            console.error('[YouTube Download SSE] Failed to get video metadata:', metadataError.message)
          }

          // Clean up
          try {
            await fs.rm(downloadDir, { recursive: true, force: true })
            console.log(`[YouTube Download SSE] Cleaned up download directory: ${downloadDir}`)
          } catch (cleanupError) {
            console.error(`[YouTube Download SSE] Failed to clean up directory: ${cleanupError.message}`)
          }

          // Ensure we only send safe data to client
          const safeResult = {
            success: true,
            file: {
              uri: uploadResponse.file.uri,
              mimeType: uploadResponse.file.mimeType,
              name: uploadResponse.file.name,
              displayName: uploadResponse.file.displayName || title,
              sizeBytes: stats.size
            },
            thumbnail: thumbnailBase64 // This should be base64 or null
          }
          
          // Debug log to ensure no paths are included
          console.log('[YouTube Download SSE] Sending result:', {
            ...safeResult,
            thumbnail: safeResult.thumbnail ? 'base64 data present' : 'no thumbnail'
          })
          
          controller.enqueue(sendEvent({
            status: 'completed',
            progress: 100,
            message: 'Download completed!',
            result: safeResult
          }))

        } catch (error) {
          console.error('[YouTube Download SSE] Download error:', error)
          
          // Clean up on error
          try {
            await fs.rm(downloadDir, { recursive: true, force: true })
            console.log(`[YouTube Download SSE] Cleaned up after error`)
          } catch (cleanupError) {
            console.error(`[YouTube Download SSE] Cleanup failed: ${cleanupError.message}`)
          }

          // Sanitize error message to remove any filesystem paths
          let errorMessage = error.message || 'Unknown error occurred'
          // Remove any filesystem paths from error message
          errorMessage = errorMessage.replace(/\/[^\s]+\/(yt_dl_\d+|youtube_download_\d+)\/[^\s]+/g, '[file]')
          errorMessage = errorMessage.replace(/\/var\/folders\/[^\s]+/g, '[temp]')
          errorMessage = errorMessage.replace(/\/tmp\/[^\s]+/g, '[temp]')
          
          controller.enqueue(sendEvent({
            status: 'error',
            error: errorMessage,
            message: `Download failed: ${errorMessage}`
          }))
        }

        controller.close()
      } catch (error) {
        console.error('[YouTube Download SSE] Error:', error)
        controller.enqueue(sendEvent({
          status: 'error',
          error: error.message,
          message: 'An unexpected error occurred'
        }))
        controller.close()
      }
    }
  })

  return new Response(stream, { headers })
}