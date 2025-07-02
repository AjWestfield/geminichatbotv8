import { GoogleAIFileManager } from "@google/generative-ai/server"
import type { NextRequest } from "next/server"
import path from "node:path"
import fs from "node:fs/promises"
import os from "node:os"
import { execSync, spawn } from "node:child_process"
import { GEMINI_LIMITS, GeminiLimitUtils } from "@/lib/gemini-limits"

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

// Dependency checking functions
async function checkYtDlpAvailability(): Promise<{available: boolean, path?: string, version?: string, error?: string}> {
  try {
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
        console.log(`[Facebook Download SSE] Found yt-dlp at: ${ytdlpPath}, version: ${version}`)
        return { available: true, path: ytdlpPath, version }
      } catch (e) {
        // Continue to next path
      }
    }
    
    return { 
      available: false, 
      error: `yt-dlp not found in any common location. PATH: ${process.env.PATH}` 
    }
  } catch (error: any) {
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

function isValidFacebookUrl(url: string): boolean {
  try {
    const urlObj = new URL(url)
    const validDomains = ['facebook.com', 'www.facebook.com', 'fb.watch', 'm.facebook.com']
    return validDomains.includes(urlObj.hostname)
  } catch {
    return false
  }
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
          message: 'Starting Facebook download...'
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

        const { url, cookies } = await req.json()

        if (!url || !isValidFacebookUrl(url)) {
          controller.enqueue(sendEvent({
            status: 'error',
            error: 'Invalid Facebook URL',
            message: 'Please provide a valid Facebook video or reel URL'
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
        const downloadDir = path.join(tempDir, `fb_dl_${timestamp}`)
        
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
          const outputTemplate = path.join(downloadDir, '%(title).100s-%(id)s.%(ext)s')
          
          // Build yt-dlp command
          const args = [
            url,
            '-o', outputTemplate,
            '--no-playlist',
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

          // Add cookies if provided
          if (cookies) {
            const cookieFile = path.join(downloadDir, 'cookies.txt')
            await fs.writeFile(cookieFile, cookies)
            args.push('--cookies', cookieFile)
          }

          // Use the best available format
          args.push('-f', 'best[ext=mp4]/best[ext=webm]/best')

          controller.enqueue(sendEvent({
            status: 'downloading',
            progress: 20,
            message: 'Starting download...'
          }))

          // Spawn yt-dlp process
          console.log(`[Facebook Download SSE] Using yt-dlp at: ${ytDlpPath}`)
          console.log(`[Facebook Download SSE] Download directory: ${downloadDir}`)
          console.log(`[Facebook Download SSE] Command: ${ytDlpPath} ${args.join(' ')}`)
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
            console.error(`[Facebook Download SSE] yt-dlp stderr: ${stderr}`)
            
            // Check for authentication errors
            if (stderr.includes('login required') || 
                stderr.includes('Login Required') ||
                stderr.includes('private') ||
                stderr.includes('This content isn\'t available')) {
              ytdlpProcess.kill()
              throw new Error('AUTHENTICATION_REQUIRED')
            }
          })
          
          // Handle spawn errors (e.g., yt-dlp not found)
          ytdlpProcess.on('error', (error) => {
            console.error('[Facebook Download SSE] Spawn error:', error)
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
                  sanitizedStderr = sanitizedStderr.replace(/\/[^\s]+\/(fb_dl_\d+|facebook_download_\d+)\/[^\s]+/g, '[file]')
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
          console.log(`[Facebook Download SSE] Files in download directory: ${files.join(', ')}`)
          
          const videoFile = files.find(file => {
            const ext = path.extname(file).toLowerCase()
            return ['.mp4', '.webm', '.mkv', '.mov'].includes(ext) &&
                   !file.endsWith('.part') &&
                   !file.includes('.part-Frag')
          })

          if (!videoFile) {
            console.error(`[Facebook Download SSE] No video file found. Files: ${files.join(', ')}`)
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
            mimeType: 'video/mp4',
            displayName: title || videoFile
          })

          controller.enqueue(sendEvent({
            status: 'finalizing',
            progress: 95,
            message: 'Processing video...'
          }))

          // Try to get thumbnail URL from metadata
          let thumbnailBase64 = null
          try {
            // Get video metadata including thumbnail URL
            const metadataResult = execSync(
              `${ytDlpPath} --dump-json --no-warnings "${url}"`,
              { encoding: 'utf8', maxBuffer: 10 * 1024 * 1024 }
            )
            
            const metadata = JSON.parse(metadataResult)
            if (metadata.thumbnail) {
              console.log('[Facebook Download SSE] Found thumbnail URL in metadata')
              
              // Download thumbnail from URL using fetch
              try {
                const thumbnailResponse = await fetch(metadata.thumbnail)
                if (thumbnailResponse.ok) {
                  const thumbnailBuffer = await thumbnailResponse.arrayBuffer()
                  const thumbnailBase64Data = Buffer.from(thumbnailBuffer).toString('base64')
                  const mimeType = thumbnailResponse.headers.get('content-type') || 'image/jpeg'
                  thumbnailBase64 = `data:${mimeType};base64,${thumbnailBase64Data}`
                  console.log('[Facebook Download SSE] Thumbnail downloaded from URL')
                }
              } catch (fetchError: any) {
                console.error('[Facebook Download SSE] Failed to fetch thumbnail:', fetchError.message)
              }
            }
          } catch (metadataError: any) {
            console.error('[Facebook Download SSE] Failed to get video metadata:', metadataError.message)
          }

          // If no thumbnail, create a Facebook-themed placeholder
          if (!thumbnailBase64) {
            console.log('[Facebook Download SSE] Creating placeholder thumbnail')
            const placeholderSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="400" height="400">
              <rect width="400" height="400" fill="#1877F2"/>
              <text x="200" y="210" font-family="Arial" font-size="100" fill="white" text-anchor="middle">f</text>
              <text x="200" y="280" font-family="Arial" font-size="60" fill="white" text-anchor="middle">▶</text>
            </svg>`
            
            const svgBuffer = Buffer.from(placeholderSvg)
            thumbnailBase64 = `data:image/svg+xml;base64,${svgBuffer.toString('base64')}`
          }

          // Clean up
          try {
            await fs.rm(downloadDir, { recursive: true, force: true })
            console.log(`[Facebook Download SSE] Cleaned up download directory: ${downloadDir}`)
          } catch (cleanupError: any) {
            console.error(`[Facebook Download SSE] Failed to clean up directory: ${cleanupError.message}`)
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
          console.log('[Facebook Download SSE] Sending result:', {
            ...safeResult,
            thumbnail: safeResult.thumbnail ? 'base64 data present' : 'no thumbnail'
          })
          
          controller.enqueue(sendEvent({
            status: 'completed',
            progress: 100,
            message: 'Download completed!',
            result: safeResult
          }))

        } catch (error: any) {
          console.error('[Facebook Download SSE] Download error:', error)
          
          // Clean up on error
          try {
            await fs.rm(downloadDir, { recursive: true, force: true })
            console.log(`[Facebook Download SSE] Cleaned up after error`)
          } catch (cleanupError: any) {
            console.error(`[Facebook Download SSE] Cleanup failed: ${cleanupError.message}`)
          }

          // Sanitize error message to remove any filesystem paths
          let errorMessage = error.message || 'Unknown error occurred'
          // Remove any filesystem paths from error message
          errorMessage = errorMessage.replace(/\/[^\s]+\/(fb_dl_\d+|facebook_download_\d+)\/[^\s]+/g, '[file]')
          errorMessage = errorMessage.replace(/\/var\/folders\/[^\s]+/g, '[temp]')
          errorMessage = errorMessage.replace(/\/tmp\/[^\s]+/g, '[temp]')
          
          // Check for authentication errors
          if (error.message === 'AUTHENTICATION_REQUIRED') {
            controller.enqueue(sendEvent({
              status: 'error',
              error: 'AUTHENTICATION_REQUIRED',
              requiresAuth: true,
              message: 'This content requires Facebook login'
            }))
          } else {
            controller.enqueue(sendEvent({
              status: 'error',
              error: errorMessage,
              message: `Download failed: ${errorMessage}`
            }))
          }
        }

        controller.close()
      } catch (error: any) {
        console.error('[Facebook Download SSE] Error:', error)
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