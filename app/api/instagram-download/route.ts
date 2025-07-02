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

// Instagram GraphQL endpoint
const INSTAGRAM_GRAPHQL_URL = 'https://www.instagram.com/api/graphql'

// User agent to mimic browser request
const USER_AGENT = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'

// Instagram App ID (may need updates)
const X_IG_APP_ID = '936619743392459'

interface InstagramMediaInfo {
  videoUrl?: string
  imageUrl?: string
  thumbnailUrl?: string
  caption?: string
  mediaType?: 'video' | 'image' | 'carousel'
  duration?: number
}

/**
 * Extract shortcode/media ID from Instagram URL
 */
function extractShortcode(url: string): string | null {
  const patterns = [
    /instagram\.com\/(?:reel|reels|p|tv)\/([A-Za-z0-9_-]+)/,
    /instagram\.com\/stories\/[^\/]+\/([A-Za-z0-9_-]+)/
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
      if (domain.includes('instagram.com')) {
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
 * Try to download using Instagram's GraphQL API
 */
async function tryGraphQLDownload(shortcode: string, cookies?: string): Promise<InstagramMediaInfo | null> {
  try {
    console.log(`[Instagram Download] Trying GraphQL method for shortcode: ${shortcode}`)

    const variables = {
      shortcode: shortcode,
      child_comment_count: 0,
      fetch_comment_count: 0,
      parent_comment_count: 0,
      has_threaded_comments: false
    }

    const cookieHeaders = parseCookiesToHeaders(cookies)

    const response = await fetch(INSTAGRAM_GRAPHQL_URL, {
      method: 'POST',
      headers: {
        'User-Agent': USER_AGENT,
        'X-IG-App-ID': X_IG_APP_ID,
        'Content-Type': 'application/x-www-form-urlencoded',
        'Accept': '*/*',
        'Accept-Language': 'en-US,en;q=0.9',
        'Origin': 'https://www.instagram.com',
        'Referer': `https://www.instagram.com/p/${shortcode}/`,
        'Sec-Fetch-Site': 'same-origin',
        'Sec-Fetch-Mode': 'cors',
        'Sec-Fetch-Dest': 'empty',
        ...cookieHeaders // Add cookies if provided
      },
      body: new URLSearchParams({
        'variables': JSON.stringify(variables),
        'doc_id': '8845758582119845' // This may need updates
      })
    })

    if (!response.ok) {
      console.error(`[Instagram Download] GraphQL request failed with status: ${response.status}`)
      
      // Check for authentication errors
      if (response.status === 401 || response.status === 403) {
        throw new Error('AUTHENTICATION_REQUIRED')
      }
      
      return null
    }

    const data = await response.json()
    
    // Check for login required in response
    if (data?.data?.xdt_shortcode_media === null && data?.errors) {
      const loginError = data.errors.find((e: any) => 
        e.message?.toLowerCase().includes('login') || 
        e.message?.toLowerCase().includes('authentication')
      )
      if (loginError) {
        throw new Error('AUTHENTICATION_REQUIRED')
      }
    }
    
    const media = data?.data?.xdt_shortcode_media

    if (!media) {
      console.error('[Instagram Download] No media data in GraphQL response')
      // If we have a valid response but no media, it's likely private content
      if (response.ok && !cookies) {
        throw new Error('AUTHENTICATION_REQUIRED')
      }
      return null
    }

    const result: InstagramMediaInfo = {
      caption: media.edge_media_to_caption?.edges?.[0]?.node?.text,
      thumbnailUrl: media.display_url,
      mediaType: media.is_video ? 'video' : 'image'
    }

    if (media.is_video && media.video_url) {
      result.videoUrl = media.video_url
      result.duration = media.video_duration
    } else if (!media.is_video && media.display_url) {
      result.imageUrl = media.display_url
    }

    console.log(`[Instagram Download] GraphQL success - Type: ${result.mediaType}`)
    return result
  } catch (error: any) {
    console.error('[Instagram Download] GraphQL method failed:', error)
    if (error.message === 'AUTHENTICATION_REQUIRED') {
      throw error // Re-throw authentication errors
    }
    return null
  }
}

/**
 * Try to download using yt-dlp as fallback
 */
async function tryYtDlpDownload(url: string, cookies?: string): Promise<{ filePath: string; mimeType: string } | null> {
  const tempDir = os.tmpdir()
  const downloadDir = path.join(tempDir, `instagram_download_${Date.now()}`)

  try {
    console.log(`[Instagram Download] Trying yt-dlp method for URL: ${url}`)
    await fs.mkdir(downloadDir, { recursive: true })

    const outputTemplate = path.join(downloadDir, '%(title)s.%(ext)s')
    let downloadCmd = `yt-dlp -o "${outputTemplate}" --no-playlist`

    // Add cookies if provided
    if (cookies) {
      const cookieFile = path.join(downloadDir, 'cookies.txt')
      await fs.writeFile(cookieFile, cookies)
      downloadCmd += ` --cookies "${cookieFile}"`
    }

    // Add user agent and other options
    downloadCmd += ` --user-agent "${USER_AGENT}"`
    downloadCmd += ` --add-header "X-IG-App-ID:${X_IG_APP_ID}"`
    downloadCmd += ` "${url}"`

    console.log(`[Instagram Download] Executing yt-dlp command`)
    const output = execSync(downloadCmd, {
      encoding: 'utf8',
      cwd: downloadDir,
      timeout: 60000 // 1 minute timeout
    })

    // Check for authentication errors in yt-dlp output
    if (output.includes('login required') || 
        output.includes('Login Required') ||
        output.includes('private') ||
        output.includes('This account is private')) {
      throw new Error('AUTHENTICATION_REQUIRED')
    }

    // Find downloaded file
    const files = await fs.readdir(downloadDir)
    const mediaFile = files.find(file => {
      const ext = path.extname(file).toLowerCase()
      return ['.mp4', '.webm', '.jpg', '.jpeg', '.png'].includes(ext)
    })

    if (!mediaFile) {
      console.error('[Instagram Download] No media file found after yt-dlp download')
      // If yt-dlp succeeded but no file, likely authentication issue
      if (!cookies) {
        throw new Error('AUTHENTICATION_REQUIRED')
      }
      return null
    }

    const filePath = path.join(downloadDir, mediaFile)
    const ext = path.extname(mediaFile).toLowerCase()
    const mimeType = ext.startsWith('.mp') || ext === '.webm' ? 'video/mp4' :
                    ext === '.jpg' || ext === '.jpeg' ? 'image/jpeg' : 'image/png'

    console.log(`[Instagram Download] yt-dlp success - File: ${mediaFile}`)
    return { filePath, mimeType }
  } catch (error: any) {
    console.error('[Instagram Download] yt-dlp method failed:', error)
    
    // Check for authentication errors
    if (error.message === 'AUTHENTICATION_REQUIRED' ||
        error.message?.includes('login') ||
        error.message?.includes('private') ||
        error.message?.includes('HTTP Error 401')) {
      throw new Error('AUTHENTICATION_REQUIRED')
    }
    
    // Clean up on error
    try {
      await fs.rmdir(downloadDir, { recursive: true })
    } catch (cleanupError) {
      console.error('[Instagram Download] Cleanup error:', cleanupError)
    }
    return null
  }
}

/**
 * Download media file from URL
 */
async function downloadMediaFromUrl(url: string, downloadDir: string, filename: string, cookies?: string): Promise<string> {
  const cookieHeaders = parseCookiesToHeaders(cookies)
  
  const response = await fetch(url, {
    headers: {
      'User-Agent': USER_AGENT,
      'Referer': 'https://www.instagram.com/',
      ...cookieHeaders
    }
  })

  if (!response.ok) {
    if (response.status === 401 || response.status === 403) {
      throw new Error('AUTHENTICATION_REQUIRED')
    }
    throw new Error(`Failed to download media: ${response.status}`)
  }

  const buffer = await response.arrayBuffer()
  const filePath = path.join(downloadDir, filename)
  await fs.writeFile(filePath, Buffer.from(buffer))

  return filePath
}

export async function POST(req: NextRequest) {
  try {
    console.log("[Instagram Download API] Starting request processing")

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

    console.log(`[Instagram Download API] Processing URL: ${url}`)

    // Extract shortcode
    const shortcode = extractShortcode(url)
    if (!shortcode) {
      return NextResponse.json(
        { error: "Invalid Instagram URL format. Please provide a valid Instagram post, reel, or story URL." },
        { status: 400 }
      )
    }

    // Validate shortcode format
    if (!/^[A-Za-z0-9_-]+$/.test(shortcode) || shortcode.length < 5 || shortcode.length > 50) {
      return NextResponse.json(
        { error: "Invalid Instagram media ID format" },
        { status: 400 }
      )
    }

    // Create temporary directory
    const tempDir = os.tmpdir()
    const downloadDir = path.join(tempDir, `instagram_download_${Date.now()}`)
    await fs.mkdir(downloadDir, { recursive: true })

    let filePath: string | null = null
    let mimeType: string = 'video/mp4'
    let displayName: string = `Instagram_${shortcode}`
    let thumbnailDataUrl: string | null = null

    try {
      // Try GraphQL method first (works for public content)
      const mediaInfo = await tryGraphQLDownload(shortcode, cookies)

      if (mediaInfo && (mediaInfo.videoUrl || mediaInfo.imageUrl)) {
        const mediaUrl = mediaInfo.videoUrl || mediaInfo.imageUrl!
        const isVideo = !!mediaInfo.videoUrl
        const extension = isVideo ? 'mp4' : 'jpg'
        const filename = `instagram_${shortcode}.${extension}`

        console.log(`[Instagram Download API] Downloading media from URL`)
        filePath = await downloadMediaFromUrl(mediaUrl, downloadDir, filename, cookies)
        mimeType = isVideo ? 'video/mp4' : 'image/jpeg'
        displayName = mediaInfo.caption ?
          mediaInfo.caption.substring(0, 50).replace(/[^a-zA-Z0-9\s-]/g, '') :
          displayName

        // Download thumbnail for videos
        if (isVideo && mediaInfo.thumbnailUrl) {
          try {
            console.log(`[Instagram Download API] Downloading thumbnail`)
            const thumbnailResponse = await fetch(mediaInfo.thumbnailUrl, {
              headers: {
                'User-Agent': USER_AGENT,
                'Referer': 'https://www.instagram.com/',
                ...parseCookiesToHeaders(cookies)
              }
            })

            if (thumbnailResponse.ok) {
              const thumbnailBuffer = await thumbnailResponse.arrayBuffer()
              const base64Data = Buffer.from(thumbnailBuffer).toString('base64')
              thumbnailDataUrl = `data:image/jpeg;base64,${base64Data}`
              console.log(`[Instagram Download API] Thumbnail downloaded successfully`, {
                bufferSize: thumbnailBuffer.byteLength,
                base64Length: base64Data.length,
                dataUrlLength: thumbnailDataUrl.length,
                dataUrlPreview: thumbnailDataUrl.substring(0, 100)
              })
              
              // Validate the data URL
              if (!thumbnailDataUrl.startsWith('data:image/') || base64Data.length < 100) {
                console.error('[Instagram Download API] Invalid thumbnail data:', {
                  isValidDataUrl: thumbnailDataUrl.startsWith('data:image/'),
                  base64Length: base64Data.length
                });
                thumbnailDataUrl = null;
              }
            }
          } catch (e) {
            console.warn(`[Instagram Download API] Failed to download thumbnail:`, e)
          }
        }
      } else {
        // Fallback to yt-dlp
        console.log(`[Instagram Download API] GraphQL failed, trying yt-dlp`)
        const ytdlpResult = await tryYtDlpDownload(url, cookies)

        if (ytdlpResult) {
          filePath = ytdlpResult.filePath
          mimeType = ytdlpResult.mimeType
        } else {
          throw new Error("All download methods failed. Content may be private or unavailable.")
        }
      }

      if (!filePath) {
        throw new Error("Failed to download media")
      }

      // Check file size
      const stats = await fs.stat(filePath)
      if (!GeminiLimitUtils.isFileSizeValid(stats.size)) {
        throw new Error(GeminiLimitUtils.getFileSizeError(stats.size))
      }

      console.log(`[Instagram Download API] Uploading to Gemini: ${path.basename(filePath)} (${(stats.size / 1024 / 1024).toFixed(1)} MB)`)

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
      await fs.rmdir(downloadDir, { recursive: true })

      console.log(`[Instagram Download API] Success - URI: ${fileInfo.uri}`)

      // Log thumbnail status before returning
      console.log(`[Instagram Download API] Response summary:`, {
        hasFile: true,
        fileUri: fileInfo.uri,
        mimeType: fileInfo.mimeType,
        hasThumbnail: !!thumbnailDataUrl,
        thumbnailLength: thumbnailDataUrl?.length || 0,
        isVideo: mimeType.startsWith('video/')
      });

      // Create a fallback thumbnail for videos without one
      if (!thumbnailDataUrl && mimeType.startsWith('video/')) {
        console.log('[Instagram Download API] No thumbnail available, creating placeholder');
        // Create a simple colored placeholder
        const placeholderSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="400" height="400">
          <defs>
            <linearGradient id="instagram" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" style="stop-color:#833AB4;stop-opacity:1" />
              <stop offset="50%" style="stop-color:#FD1D1D;stop-opacity:1" />
              <stop offset="100%" style="stop-color:#FCB045;stop-opacity:1" />
            </linearGradient>
          </defs>
          <rect width="400" height="400" fill="url(#instagram)"/>
          <text x="200" y="210" font-family="Arial" font-size="100" fill="white" text-anchor="middle">▶</text>
        </svg>`;
        
        const svgBuffer = Buffer.from(placeholderSvg);
        thumbnailDataUrl = `data:image/svg+xml;base64,${svgBuffer.toString('base64')}`;
        console.log('[Instagram Download API] Created placeholder thumbnail');
      }

      // For videos, try to provide a playable URL
      let videoUrl = null;
      if (mimeType.startsWith('video/') && mediaInfo?.videoUrl) {
        videoUrl = mediaInfo.videoUrl;
        console.log('[Instagram Download API] Including video URL for playback');
      }

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
        videoUrl: videoUrl, // Include video URL for playback
        // Also include media type for better handling
        mediaType: mimeType.startsWith('video/') ? 'video' : 'image'
      })

    } catch (error: any) {
      // Clean up on error
      try {
        await fs.rmdir(downloadDir, { recursive: true })
      } catch (cleanupError) {
        console.error('[Instagram Download API] Cleanup error:', cleanupError)
      }

      throw error
    }

  } catch (error: any) {
    console.error("[Instagram Download API] Error:", error)

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

    let errorMessage = "Failed to download Instagram media"
    let errorDetails = error.message || "Unknown error occurred"
    let statusCode = 500

    // Enhanced error messages
    if (error.message?.includes("rate") || error.message?.includes("429")) {
      errorMessage = "Rate limited"
      errorDetails = "Instagram has temporarily blocked requests. Please try again later."
      statusCode = 429
    } else if (error.message?.includes("File too large")) {
      errorMessage = "File too large"
      errorDetails = error.message
      statusCode = 413
    } else if (error.message?.includes("not found") || error.message?.includes("404")) {
      errorMessage = "Content not found"
      errorDetails = "The Instagram post, reel, or story could not be found. It may have been deleted or the URL is incorrect."
      statusCode = 404
    } else if (error.message?.includes("timeout") || error.message?.includes("ETIMEDOUT")) {
      errorMessage = "Download timeout"
      errorDetails = "The download took too long to complete. Please try again."
      statusCode = 408
    } else if (error.message?.includes("network") || error.message?.includes("ENOTFOUND")) {
      errorMessage = "Network error"
      errorDetails = "Unable to connect to Instagram. Please check your internet connection and try again."
      statusCode = 503
    } else if (error.message?.includes("unsupported") || error.message?.includes("format")) {
      errorMessage = "Unsupported format"
      errorDetails = "This type of Instagram content is not supported for download."
      statusCode = 415
    } else if (error.message?.includes("ENOSPC")) {
      errorMessage = "Storage error"
      errorDetails = "Insufficient storage space to download the media."
      statusCode = 507
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