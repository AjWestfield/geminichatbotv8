import { GoogleAIFileManager } from "@google/generative-ai/server"
import type { NextRequest } from "next/server"
import { NextResponse } from "next/server"
import path from "node:path"
import fs from "node:fs/promises"
import os from "node:os"
import { execSync } from "node:child_process"
import YTDlpWrap from "yt-dlp-wrap"
import { GEMINI_LIMITS, GeminiLimitUtils } from "@/lib/gemini-limits"

// Dependency checking functions
async function checkYtDlpAvailability(): Promise<{available: boolean, path?: string, version?: string, error?: string}> {
  try {
    // First check if yt-dlp is available system-wide
    try {
      const version = execSync('yt-dlp --version', { encoding: 'utf8', timeout: 5000 }).trim()
      return { available: true, path: 'system', version }
    } catch (systemError) {
      // Check for local binary
      const localBinPath = path.join(process.cwd(), 'bin', process.platform === 'win32' ? 'yt-dlp.exe' : 'yt-dlp')
      try {
        await fs.access(localBinPath, fs.constants.F_OK)
        const version = execSync(`"${localBinPath}" --version`, { encoding: 'utf8', timeout: 5000 }).trim()
        return { available: true, path: localBinPath, version }
      } catch (localError) {
        return { 
          available: false, 
          error: `yt-dlp not found. System: ${systemError.message}. Local: ${localError.message}` 
        }
      }
    }
  } catch (error) {
    return { available: false, error: `Failed to check yt-dlp: ${error.message}` }
  }
}

async function checkGeminiApiKey(): Promise<{valid: boolean, error?: string}> {
  if (!apiKey) {
    return { valid: false, error: "GEMINI_API_KEY environment variable is not set" }
  }
  
  if (apiKey.length < 10) {
    return { valid: false, error: "GEMINI_API_KEY appears to be too short" }
  }
  
  // Basic format validation
  if (!apiKey.startsWith('AIza')) {
    return { valid: false, error: "GEMINI_API_KEY does not appear to be in the correct format" }
  }
  
  return { valid: true }
}

// Retry mechanism
async function retryOperation<T>(operation: () => Promise<T>, maxRetries: number = 3, delay: number = 1000): Promise<T> {
  let lastError: Error
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await operation()
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error))
      
      if (attempt === maxRetries) {
        throw lastError
      }
      
      console.log(`[YouTube Download] Attempt ${attempt} failed, retrying in ${delay}ms...`, lastError.message)
      await new Promise(resolve => setTimeout(resolve, delay))
      delay *= 2 // Exponential backoff
    }
  }
  
  throw lastError!
}

// Initialize the File Manager with better error handling
const apiKey = process.env.GEMINI_API_KEY
const fileManager = apiKey ? new GoogleAIFileManager(apiKey) : null

// Initialize yt-dlp wrapper
const ytdlp = new YTDlpWrap()

export async function POST(req: NextRequest) {
  try {
    console.log("[YouTube Download API] Starting dependency checks...")
    
    // Check Gemini API key
    const apiKeyCheck = await checkGeminiApiKey()
    if (!apiKeyCheck.valid) {
      console.error("[YouTube Download API] API key validation failed:", apiKeyCheck.error)
      return NextResponse.json(
        {
          error: "API configuration error",
          details: apiKeyCheck.error,
          troubleshooting: [
            "1. Set the GEMINI_API_KEY environment variable",
            "2. Ensure the API key is valid and starts with 'AIza'", 
            "3. Check that the API key has the necessary permissions",
            "4. Restart the server after setting the environment variable"
          ]
        },
        { status: 500 }
      )
    }
    
    // Check yt-dlp availability
    const ytDlpCheck = await checkYtDlpAvailability()
    if (!ytDlpCheck.available) {
      console.error("[YouTube Download API] yt-dlp not available:", ytDlpCheck.error)
      return NextResponse.json(
        {
          error: "yt-dlp not available",
          details: ytDlpCheck.error,
          troubleshooting: [
            "1. Install yt-dlp: pip install yt-dlp",
            "2. Or download from: https://github.com/yt-dlp/yt-dlp/releases",
            "3. Run 'npm run postinstall' to download yt-dlp locally",
            "4. Ensure yt-dlp is in your system PATH"
          ]
        },
        { status: 500 }
      )
    }
    
    console.log(`[YouTube Download API] Dependencies OK - yt-dlp ${ytDlpCheck.version} at ${ytDlpCheck.path}`)
    
    if (!fileManager) {
      throw new Error("File manager not initialized due to missing API key")
    }

    const { url, quality = 'auto' } = await req.json()

    if (!url) {
      console.error("[YouTube Download API] No URL provided in request")
      return NextResponse.json(
        { error: "No URL provided" },
        { status: 400 }
      )
    }

    console.log(`[YouTube Download API] Processing URL: ${url}`)

    // Validate YouTube URL
    if (!isValidYouTubeUrl(url)) {
      return NextResponse.json(
        { error: "Invalid YouTube URL" },
        { status: 400 }
      )
    }

    // Create temporary directory for download
    const tempDir = os.tmpdir()
    const downloadDir = path.join(tempDir, `youtube_download_${Date.now()}`)
    await fs.mkdir(downloadDir, { recursive: true })

    try {
      // First, check available formats for debugging
      console.log(`[YouTube Download API] Checking available formats for: ${url}`)
      
      let availableFormats: string = ""
      try {
        availableFormats = await ytdlp.exec([url, '--list-formats', '--no-warnings'])
        console.log(`[YouTube Download API] Available formats:\n${availableFormats}`)
      } catch (formatError) {
        console.warn(`[YouTube Download API] Could not list formats:`, formatError)
      }

      // Download video using simple yt-dlp command
      console.log(`[YouTube Download API] Starting download to: ${downloadDir}`)
      
      const outputTemplate = path.join(downloadDir, '%(title)s.%(ext)s')
      
      try {
        console.log(`[YouTube Download API] Using simple yt-dlp command`)
        
        // Build simple command based on quality
        let downloadCmd = `yt-dlp -o "${outputTemplate}" --no-playlist --write-thumbnail`
        
        if (quality !== 'auto') {
          switch(quality) {
            case 'audio':
              downloadCmd += ' -f bestaudio'
              break
            case '1080p':
              downloadCmd += ' -f "best[height<=1080]"'
              break
            case '720p':
              downloadCmd += ' -f "best[height<=720]"'
              break
            case '480p':
              downloadCmd += ' -f "best[height<=480]"'
              break
          }
        }
        
        downloadCmd += ` "${url}"`
        
        console.log(`[YouTube Download API] Executing: ${downloadCmd}`)
        
        // Execute download
        execSync(downloadCmd, {
          encoding: 'utf8',
          cwd: downloadDir,
          stdio: ['ignore', 'pipe', 'pipe'], // Capture stdout and stderr
          timeout: 120000 // 2 minute timeout
        })
        
        console.log(`[YouTube Download API] Download completed successfully`)
        
      } catch (downloadError: any) {
        console.error(`[YouTube Download API] Download failed:`, downloadError.message)
        
        // If specific quality failed, try with default
        if (quality !== 'auto') {
          try {
            console.log(`[YouTube Download API] Retrying with default quality`)
            const fallbackCmd = `yt-dlp -o "${outputTemplate}" --no-playlist "${url}"`
            execSync(fallbackCmd, {
              encoding: 'utf8',
              cwd: downloadDir,
              timeout: 120000
            })
            console.log(`[YouTube Download API] Fallback download succeeded`)
          } catch (fallbackError) {
            console.error(`[YouTube Download API] Fallback also failed`)
            throw downloadError
          }
        } else {
          throw downloadError
        }
      }

      // Find the downloaded file with comprehensive extension checking
      const files = await fs.readdir(downloadDir)
      console.log(`[YouTube Download API] Files in download directory:`, files)

      // Common video file extensions
      const videoExtensions = [
        '.mp4', '.webm', '.mkv', '.avi', '.mov', '.flv', 
        '.m4v', '.3gp', '.wmv', '.mpg', '.mpeg', '.m2v',
        '.ts', '.f4v', '.asf', '.rm', '.rmvb'
      ]

      const videoFile = files.find(file => {
        const ext = path.extname(file).toLowerCase()
        return videoExtensions.includes(ext)
      })

      if (!videoFile) {
        console.error(`[YouTube Download API] No video file found. Directory contents:`, files)
        console.error(`[YouTube Download API] Looking for extensions:`, videoExtensions)
        throw new Error(`No video file found after download. Found files: ${files.join(', ')}`)
      }

      const videoPath = path.join(downloadDir, videoFile)
      const videoStats = await fs.stat(videoPath)
      
      console.log(`[YouTube Download API] Downloaded: ${videoFile}, Size: ${videoStats.size} bytes`)

      // Look for thumbnail file
      let thumbnailDataUrl: string | null = null
      const thumbnailExtensions = ['.jpg', '.jpeg', '.png', '.webp']
      const baseVideoName = path.basename(videoFile, path.extname(videoFile))
      
      for (const thumbExt of thumbnailExtensions) {
        const thumbnailPath = path.join(downloadDir, `${baseVideoName}${thumbExt}`)
        try {
          await fs.access(thumbnailPath)
          console.log(`[YouTube Download API] Found thumbnail: ${thumbnailPath}`)
          
          // Read thumbnail and convert to base64 data URL
          const thumbnailBuffer = await fs.readFile(thumbnailPath)
          const thumbnailMimeType = thumbExt === '.jpg' || thumbExt === '.jpeg' ? 'image/jpeg' : 
                                   thumbExt === '.png' ? 'image/png' : 
                                   'image/webp'
          thumbnailDataUrl = `data:${thumbnailMimeType};base64,${thumbnailBuffer.toString('base64')}`
          
          // Clean up thumbnail file
          await fs.unlink(thumbnailPath)
          break
        } catch (e) {
          // Thumbnail with this extension doesn't exist, try next
          continue
        }
      }
      
      if (thumbnailDataUrl) {
        console.log(`[YouTube Download API] Successfully extracted thumbnail`)
      } else {
        console.log(`[YouTube Download API] No thumbnail found`)
      }

      // Read video file
      const videoBuffer = await fs.readFile(videoPath)

      // Determine MIME type based on file extension
      const ext = path.extname(videoFile).toLowerCase()
      const mimeType = getMimeTypeFromExtension(ext)

      // Upload to Gemini File Manager with retry
      const uploadWithRetry = async () => {
        return await retryOperation(async () => {
          console.log(`[YouTube Download API] Uploading ${videoFile} to Gemini (${(videoStats.size / 1024 / 1024).toFixed(1)} MB)`)
          
          const uploadResponse = await fileManager!.uploadFile(videoPath, {
            mimeType: mimeType,
            displayName: path.basename(videoFile, ext),
          })

          // Wait for file to be processed with timeout
          let fileInfo = await fileManager!.getFile(uploadResponse.file.name)
          console.log(`File upload - Initial state: ${fileInfo.state}, Type: ${mimeType}, Size: ${videoStats.size} bytes`)

          const maxWaitTime = 120000 // 2 minutes
          const startTime = Date.now()
          
          while (fileInfo.state === "PROCESSING") {
            if (Date.now() - startTime > maxWaitTime) {
              throw new Error("File processing timeout - took longer than 2 minutes")
            }
            
            await new Promise(resolve => setTimeout(resolve, 2000)) // Check every 2 seconds
            fileInfo = await fileManager!.getFile(uploadResponse.file.name)
          }

          if (fileInfo.state === "FAILED") {
            throw new Error(`File processing failed for ${videoFile}`)
          }

          console.log(`File upload successful - URI: ${fileInfo.uri}, State: ${fileInfo.state}`)
          return fileInfo
        }, 3, 3000) // 3 retries with 3 second delay
      }

      const fileInfo = await uploadWithRetry()

      // Clean up temporary files
      await fs.unlink(videoPath)
      await fs.rmdir(downloadDir)

      // Return file info in the same format as the upload API
      return NextResponse.json({
        success: true,
        file: {
          uri: fileInfo.uri,
          mimeType: fileInfo.mimeType,
          displayName: fileInfo.displayName,
          name: fileInfo.name,
          sizeBytes: fileInfo.sizeBytes,
          videoThumbnail: thumbnailDataUrl // Include thumbnail if available
        }
      })

    } catch (downloadError: any) {
      // Clean up temporary directory on error
      try {
        await fs.rmdir(downloadDir, { recursive: true })
      } catch (cleanupError) {
        console.error("[YouTube Download API] Cleanup error:", cleanupError)
      }

      console.error("[YouTube Download API] Download error:", downloadError)
      
      let errorMessage = "Failed to download video"
      let errorDetails = downloadError.message || "Unknown error occurred"

      // Enhanced error detection with more specific messages
      if (downloadError.message?.includes("Video unavailable") || 
          downloadError.message?.includes("This video is unavailable")) {
        errorMessage = "Video unavailable"
        errorDetails = "The requested video is not available for download. It may have been deleted, made private, or is region-restricted."
      } else if (downloadError.message?.includes("Private video") || 
                 downloadError.message?.includes("This is a private video")) {
        errorMessage = "Private video"
        errorDetails = "This video is private and cannot be downloaded"
      } else if (downloadError.message?.includes("Sign in to confirm") ||
                 downloadError.message?.includes("age-restricted")) {
        errorMessage = "Age-restricted video"
        errorDetails = "This video is age-restricted and cannot be downloaded without authentication"
      } else if (downloadError.message?.includes("File is larger than max-filesize") ||
                 downloadError.message?.includes("File is too large")) {
        errorMessage = "File too large"
        errorDetails = `The video file exceeds the maximum size limit of ${GeminiLimitUtils.formatFileSize(GEMINI_LIMITS.MAX_FILE_SIZE_BYTES)}. Try downloading a shorter video or one with lower quality.`
      } else if (downloadError.message?.includes("No video file found after download")) {
        errorMessage = "Download format issue"
        errorDetails = "The video was processed but no supported video file was created. This may be due to format restrictions or the video containing only audio."
      } else if (downloadError.message?.includes("All download strategies failed")) {
        errorMessage = "Format compatibility issue"
        errorDetails = "Unable to download this video in any supported format. The video may have unusual encoding or be incompatible with the download system."
      } else if (downloadError.message?.includes("Requested format is not available")) {
        errorMessage = "Format not available"
        errorDetails = "The requested video format is not available. This video may only be available in formats not supported by the system."
      } else if (downloadError.message?.includes("HTTP Error 403") ||
                 downloadError.message?.includes("Forbidden")) {
        errorMessage = "Access denied"
        errorDetails = "Access to this video was denied. It may be region-restricted or require special permissions."
      } else if (downloadError.message?.includes("HTTP Error 404") ||
                 downloadError.message?.includes("Not Found")) {
        errorMessage = "Video not found"
        errorDetails = "The video could not be found. Please check the URL and try again."
      } else if (downloadError.message?.includes("network") ||
                 downloadError.message?.includes("timeout")) {
        errorMessage = "Network error"
        errorDetails = "A network error occurred while downloading. Please check your connection and try again."
      }

      return NextResponse.json(
        {
          error: errorMessage,
          details: errorDetails,
          timestamp: new Date().toISOString()
        },
        { status: 500 }
      )
    }

  } catch (error: any) {
    console.error("[YouTube Download API] General error:", error)
    
    return NextResponse.json(
      {
        error: "Failed to process YouTube download request",
        details: error.message || "An unexpected error occurred",
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    )
  }
}

function isValidYouTubeUrl(url: string): boolean {
  const youtubeRegex = /^(https?:\/\/)?(www\.)?(youtube\.com|youtu\.be)\/.+/
  return youtubeRegex.test(url)
}

function getMimeTypeFromExtension(ext: string): string {
  const mimeTypes: Record<string, string> = {
    '.mp4': 'video/mp4',
    '.webm': 'video/webm',
    '.mkv': 'video/x-matroska',
    '.avi': 'video/x-msvideo',
    '.mov': 'video/quicktime',
    '.flv': 'video/x-flv',
    '.m4v': 'video/x-m4v',
    '.3gp': 'video/3gpp',
    '.wmv': 'video/x-ms-wmv',
    '.mpg': 'video/mpeg',
    '.mpeg': 'video/mpeg',
    '.m2v': 'video/mpeg',
    '.ts': 'video/mp2t',
    '.f4v': 'video/x-f4v',
    '.asf': 'video/x-ms-asf',
    '.rm': 'application/vnd.rn-realmedia',
    '.rmvb': 'application/vnd.rn-realmedia-vbr'
  }
  
  return mimeTypes[ext] || 'video/mp4'
}

// Runtime configuration for Vercel
export const runtime = 'nodejs'
export const maxDuration = 60 // 60 seconds timeout