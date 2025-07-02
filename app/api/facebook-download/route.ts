import { GoogleAIFileManager } from "@google/generative-ai/server"
import type { NextRequest } from "next/server"
import { NextResponse } from "next/server"
import path from "node:path"
import fs from "node:fs/promises"
import os from "node:os"
import { execSync } from "node:child_process"
import { GEMINI_LIMITS, GeminiLimitUtils } from "@/lib/gemini-limits"

// Initialize the File Manager
const apiKey = process.env.GEMINI_API_KEY
const fileManager = apiKey ? new GoogleAIFileManager(apiKey) : null

/**
 * Extract video ID from Facebook URL
 */
function extractVideoId(url: string): string | null {
  const patterns = [
    /facebook\.com\/watch\/?\?v=(\d+)/,
    /facebook\.com\/reel\/(\d+)/,
    /fb\.watch\/([a-zA-Z0-9_-]+)/,
    /facebook\.com\/[^\/]+\/videos\/(\d+)/,
    /facebook\.com\/stories\/\d+\/([a-zA-Z0-9]+)/,
  ]

  for (const pattern of patterns) {
    const match = url.match(pattern)
    if (match) {
      return match[1]
    }
  }
  return null
}

/**
 * Parse cookies string to headers format
 */
function parseCookiesToHeaders(cookiesText?: string): Record<string, string> {
  if (!cookiesText) return {}
  
  const headers: Record<string, string> = {}
  const cookieValues: string[] = []
  
  // Parse Netscape cookie format
  const lines = cookiesText.split('\n').filter(line => line.trim() && !line.startsWith('#'))
  
  for (const line of lines) {
    const parts = line.split('\t')
    if (parts.length >= 7) {
      const [domain, , , , , name, value] = parts
      if (domain.includes('facebook.com')) {
        cookieValues.push(`${name}=${value}`)
      }
    }
  }
  
  if (cookieValues.length > 0) {
    headers['Cookie'] = cookieValues.join('; ')
  }
  
  return headers
}

/**
 * Check yt-dlp availability
 */
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
        console.log(`[Facebook Download] Found yt-dlp at: ${ytdlpPath}, version: ${version}`)
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

/**
 * Download Facebook video using yt-dlp
 */
async function downloadWithYtDlp(url: string, cookies?: string): Promise<{ filePath: string; mimeType: string; title?: string; thumbnail?: string } | null> {
  const tempDir = os.tmpdir()
  const downloadDir = path.join(tempDir, `facebook_download_${Date.now()}`)

  try {
    console.log(`[Facebook Download] Trying yt-dlp method for URL: ${url}`)
    
    // Check yt-dlp availability
    const ytDlpCheck = await checkYtDlpAvailability()
    if (!ytDlpCheck.available) {
      throw new Error(ytDlpCheck.error || 'yt-dlp not available')
    }
    
    const ytdlpPath = ytDlpCheck.path!
    
    await fs.mkdir(downloadDir, { recursive: true, mode: 0o755 })
    
    // Verify directory was created
    try {
      await fs.access(downloadDir, fs.constants.W_OK)
    } catch (e) {
      throw new Error(`Cannot write to download directory: ${downloadDir}`)
    }

    const outputTemplate = path.join(downloadDir, '%(title).100s-%(id)s.%(ext)s')
    let downloadCmd = `"${ytdlpPath}" "${url}" -o "${outputTemplate}" --no-playlist`

    // Add cookies if provided
    if (cookies) {
      const cookieFile = path.join(downloadDir, 'cookies.txt')
      await fs.writeFile(cookieFile, cookies)
      downloadCmd += ` --cookies "${cookieFile}"`
    }

    // Add other options for better compatibility
    downloadCmd += ` --user-agent "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"`
    downloadCmd += ` --restrict-filenames --windows-filenames --trim-filenames 150`
    downloadCmd += ` --no-warnings --no-part --no-cache-dir`
    downloadCmd += ` -f "best[ext=mp4]/best"`
    downloadCmd += ` --write-info-json` // Get metadata including title and thumbnail

    console.log(`[Facebook Download] Executing yt-dlp command`)
    const output = execSync(downloadCmd, {
      encoding: 'utf8',
      cwd: downloadDir,
      timeout: 60000, // 1 minute timeout
      maxBuffer: 10 * 1024 * 1024 // 10MB buffer
    })

    // Check for authentication errors in yt-dlp output
    if (output.includes('login required') || 
        output.includes('Login Required') ||
        output.includes('private') ||
        output.includes('This content isn\'t available')) {
      throw new Error('AUTHENTICATION_REQUIRED')
    }

    // Find downloaded file
    const files = await fs.readdir(downloadDir)
    console.log(`[Facebook Download] Files in download directory: ${files.join(', ')}`)
    
    const videoFile = files.find(file => {
      const ext = path.extname(file).toLowerCase()
      return ['.mp4', '.webm', '.mkv', '.mov'].includes(ext) &&
             !file.endsWith('.part') &&
             !file.includes('.part-Frag')
    })

    if (!videoFile) {
      console.error('[Facebook Download] No video file found after yt-dlp download')
      if (!cookies) {
        throw new Error('AUTHENTICATION_REQUIRED')
      }
      return null
    }

    const filePath = path.join(downloadDir, videoFile)
    const ext = path.extname(videoFile).toLowerCase()
    const mimeType = ext === '.mp4' ? 'video/mp4' :
                    ext === '.webm' ? 'video/webm' :
                    ext === '.mkv' ? 'video/x-matroska' : 'video/mp4'

    // Try to get metadata from info JSON file
    let title = videoFile
    let thumbnail: string | undefined
    
    const infoFile = files.find(file => file.endsWith('.info.json'))
    if (infoFile) {
      try {
        const infoPath = path.join(downloadDir, infoFile)
        const infoData = JSON.parse(await fs.readFile(infoPath, 'utf-8'))
        
        title = infoData.title || infoData.fulltitle || title
        
        // Get thumbnail URL from metadata
        if (infoData.thumbnail) {
          console.log('[Facebook Download] Found thumbnail URL in metadata')
          try {
            const thumbnailResponse = await fetch(infoData.thumbnail)
            if (thumbnailResponse.ok) {
              const thumbnailBuffer = await thumbnailResponse.arrayBuffer()
              const thumbnailBase64Data = Buffer.from(thumbnailBuffer).toString('base64')
              const mimeType = thumbnailResponse.headers.get('content-type') || 'image/jpeg'
              thumbnail = `data:${mimeType};base64,${thumbnailBase64Data}`
              console.log('[Facebook Download] Thumbnail downloaded from URL')
            }
          } catch (fetchError: any) {
            console.error('[Facebook Download] Failed to fetch thumbnail:', fetchError.message)
          }
        }
      } catch (e: any) {
        console.error('[Facebook Download] Failed to parse info JSON:', e.message)
      }
    }

    console.log(`[Facebook Download] yt-dlp success - File: ${videoFile}`)
    return { filePath, mimeType, title, thumbnail }
  } catch (error: any) {
    console.error('[Facebook Download] yt-dlp method failed:', error)
    
    // Check for authentication errors
    if (error.message === 'AUTHENTICATION_REQUIRED' ||
        error.message?.includes('login') ||
        error.message?.includes('private') ||
        error.message?.includes('HTTP Error 401')) {
      throw new Error('AUTHENTICATION_REQUIRED')
    }
    
    // Clean up on error
    try {
      await fs.rm(downloadDir, { recursive: true, force: true })
    } catch (cleanupError: any) {
      console.error('[Facebook Download] Cleanup error:', cleanupError.message)
    }
    return null
  }
}

export async function POST(req: NextRequest) {
  try {
    console.log("[Facebook Download API] Starting request processing")

    // Check API key
    if (!apiKey || !fileManager) {
      return NextResponse.json(
        {
          error: "Server configuration error",
          details: "Gemini API key is not configured"
        },
        { status: 500 }
      )
    }

    const { url, cookies } = await req.json()

    if (!url) {
      return NextResponse.json(
        { error: "No URL provided" },
        { status: 400 }
      )
    }

    // Validate URL format
    if (typeof url !== 'string' || url.trim().length === 0) {
      return NextResponse.json(
        { error: "Invalid URL format" },
        { status: 400 }
      )
    }

    // Check URL length to prevent abuse
    if (url.length > 2000) {
      return NextResponse.json(
        { error: "URL too long" },
        { status: 400 }
      )
    }

    console.log(`[Facebook Download API] Processing URL: ${url}`)

    // Extract video ID (optional - for logging)
    const videoId = extractVideoId(url)
    console.log(`[Facebook Download API] Video ID: ${videoId}`)

    // Create temporary directory
    const tempDir = os.tmpdir()
    const downloadDir = path.join(tempDir, `facebook_download_${Date.now()}`)
    await fs.mkdir(downloadDir, { recursive: true })

    let filePath: string | null = null
    let mimeType: string = 'video/mp4'
    let displayName: string = `Facebook_Video_${Date.now()}`
    let thumbnailDataUrl: string | null = null

    try {
      // Use yt-dlp as the primary method
      const ytdlpResult = await downloadWithYtDlp(url, cookies)

      if (ytdlpResult) {
        filePath = ytdlpResult.filePath
        mimeType = ytdlpResult.mimeType
        displayName = ytdlpResult.title || displayName
        thumbnailDataUrl = ytdlpResult.thumbnail || null
      } else {
        throw new Error("Download failed. Content may be private or unavailable.")
      }

      if (!filePath) {
        throw new Error("Failed to download media")
      }

      // Check file size
      const stats = await fs.stat(filePath)
      if (!GeminiLimitUtils.isFileSizeValid(stats.size)) {
        throw new Error(GeminiLimitUtils.getFileSizeError(stats.size))
      }

      console.log(`[Facebook Download API] Uploading to Gemini: ${path.basename(filePath)} (${(stats.size / 1024 / 1024).toFixed(1)} MB)`)

      // Upload to Gemini
      const uploadResponse = await fileManager.uploadFile(filePath, {
        mimeType: mimeType,
        displayName: displayName,
      })

      // Wait for processing
      let fileInfo = await fileManager.getFile(uploadResponse.file.name)
      const maxWaitTime = 60000 // 1 minute
      const startTime = Date.now()

      while (fileInfo.state === "PROCESSING") {
        if (Date.now() - startTime > maxWaitTime) {
          throw new Error("File processing timeout")
        }
        await new Promise(resolve => setTimeout(resolve, 2000))
        fileInfo = await fileManager.getFile(uploadResponse.file.name)
      }

      if (fileInfo.state === "FAILED") {
        throw new Error("File processing failed")
      }

      // Clean up
      await fs.unlink(filePath)
      await fs.rm(downloadDir, { recursive: true, force: true })

      console.log(`[Facebook Download API] Success - URI: ${fileInfo.uri}`)

      // Create a fallback thumbnail for videos without one
      if (!thumbnailDataUrl && mimeType.startsWith('video/')) {
        console.log('[Facebook Download API] No thumbnail available, creating placeholder');
        // Create a Facebook-themed placeholder
        const placeholderSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="400" height="400">
          <rect width="400" height="400" fill="#1877F2"/>
          <text x="200" y="210" font-family="Arial" font-size="100" fill="white" text-anchor="middle">f</text>
          <text x="200" y="280" font-family="Arial" font-size="60" fill="white" text-anchor="middle">▶</text>
        </svg>`;
        
        const svgBuffer = Buffer.from(placeholderSvg);
        thumbnailDataUrl = `data:image/svg+xml;base64,${svgBuffer.toString('base64')}`;
        console.log('[Facebook Download API] Created placeholder thumbnail');
      }

      // Log response summary
      console.log(`[Facebook Download API] Response summary:`, {
        hasFile: true,
        fileUri: fileInfo.uri,
        mimeType: fileInfo.mimeType,
        hasThumbnail: !!thumbnailDataUrl,
        thumbnailLength: thumbnailDataUrl?.length || 0,
        isVideo: mimeType.startsWith('video/')
      });

      return NextResponse.json({
        success: true,
        file: {
          uri: fileInfo.uri,
          mimeType: fileInfo.mimeType,
          displayName: fileInfo.displayName,
          name: fileInfo.name,
          sizeBytes: fileInfo.sizeBytes
        },
        thumbnail: thumbnailDataUrl, // Include thumbnail if available
        // Include media type for better handling
        mediaType: mimeType.startsWith('video/') ? 'video' : 'image'
      })

    } catch (error: any) {
      // Clean up on error
      try {
        await fs.rm(downloadDir, { recursive: true, force: true })
      } catch (cleanupError: any) {
        console.error('[Facebook Download API] Cleanup error:', cleanupError.message)
      }

      throw error
    }

  } catch (error: any) {
    console.error("[Facebook Download API] Error:", error)

    // Handle authentication errors specifically
    if (error.message === 'AUTHENTICATION_REQUIRED') {
      return NextResponse.json(
        {
          error: "Authentication required",
          details: "This content is private or requires authentication. Try providing cookies from a logged-in session.",
          requiresAuth: true
        },
        { status: 401 } // Return 401 for authentication required
      )
    }

    let errorMessage = "Failed to download Facebook media"
    let errorDetails = error.message || "Unknown error occurred"
    let statusCode = 500

    // Enhanced error messages
    if (error.message?.includes("rate") || error.message?.includes("429")) {
      errorMessage = "Rate limited"
      errorDetails = "Facebook has temporarily blocked requests. Please try again later."
      statusCode = 429
    } else if (error.message?.includes("File too large")) {
      errorMessage = "File too large"
      errorDetails = error.message
      statusCode = 413
    } else if (error.message?.includes("not found") || error.message?.includes("404")) {
      errorMessage = "Content not found"
      errorDetails = "The Facebook video or reel could not be found. It may have been deleted or the URL is incorrect."
      statusCode = 404
    } else if (error.message?.includes("timeout") || error.message?.includes("ETIMEDOUT")) {
      errorMessage = "Download timeout"
      errorDetails = "The download took too long to complete. Please try again."
      statusCode = 408
    } else if (error.message?.includes("network") || error.message?.includes("ENOTFOUND")) {
      errorMessage = "Network error"
      errorDetails = "Unable to connect to Facebook. Please check your internet connection and try again."
      statusCode = 503
    } else if (error.message?.includes("unsupported") || error.message?.includes("format")) {
      errorMessage = "Unsupported format"
      errorDetails = "This type of Facebook content is not supported for download."
      statusCode = 415
    } else if (error.message?.includes("ENOSPC")) {
      errorMessage = "Storage error"
      errorDetails = "Insufficient storage space to download the media."
      statusCode = 507
    } else if (error.message?.includes("yt-dlp not")) {
      errorMessage = "Server configuration error"
      errorDetails = "The download service is not properly configured. Please contact support."
      statusCode = 503
    }

    return NextResponse.json(
      {
        error: errorMessage,
        details: errorDetails,
        timestamp: new Date().toISOString()
      },
      { status: statusCode }
    )
  }
}

// Runtime configuration
export const runtime = 'nodejs'
export const maxDuration = 60 // 60 seconds timeout