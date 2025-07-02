/**
 * TikTok URL detection and processing utilities
 */

export interface TikTokUrlInfo {
  isValid: boolean
  videoId?: string
  url: string
  normalizedUrl?: string
  username?: string
}

export interface TikTokDownloadProgress {
  status: 'downloading' | 'processing' | 'uploading' | 'completed' | 'error'
  progress?: number
  message?: string
  error?: string
}

/**
 * Detects if a string contains a TikTok URL
 */
export function detectTikTokUrl(text: string): TikTokUrlInfo | null {
  // TikTok URL patterns
  const patterns = [
    // Standard TikTok video URLs
    /(?:https?:\/\/)?(?:www\.)?tiktok\.com\/@([a-zA-Z0-9._]+)\/video\/(\d+)/,
    // TikTok short URLs
    /(?:https?:\/\/)?(?:vm\.)?tiktok\.com\/([a-zA-Z0-9]+)/,
    // TikTok mobile URLs
    /(?:https?:\/\/)?(?:m\.)?tiktok\.com\/@([a-zA-Z0-9._]+)\/video\/(\d+)/,
    // TikTok URLs with query parameters
    /(?:https?:\/\/)?(?:www\.)?tiktok\.com\/@([a-zA-Z0-9._]+)\/video\/(\d+)\?.*$/,
    // TikTok vt.tiktok.com URLs
    /(?:https?:\/\/)?vt\.tiktok\.com\/([a-zA-Z0-9]+)/,
  ]

  for (const pattern of patterns) {
    const match = text.match(pattern)
    if (match) {
      // Handle different URL formats
      if (match[0].includes('vm.tiktok.com') || match[0].includes('vt.tiktok.com')) {
        // Short URL format
        return {
          isValid: true,
          url: match[0],
          normalizedUrl: match[0] // Keep short URLs as-is for now
        }
      } else if (match[2]) {
        // Full URL format with username and video ID
        const username = match[1]
        const videoId = match[2]
        return {
          isValid: true,
          videoId,
          username,
          url: match[0],
          normalizedUrl: `https://www.tiktok.com/@${username}/video/${videoId}`
        }
      }
    }
  }

  return null
}

/**
 * Validates if a URL is a valid TikTok URL
 */
export function isValidTikTokUrl(url: string): boolean {
  const detection = detectTikTokUrl(url)
  return detection?.isValid ?? false
}

/**
 * Extracts video ID from a TikTok URL
 */
export function extractVideoId(url: string): string | null {
  const detection = detectTikTokUrl(url)
  return detection?.videoId ?? null
}

/**
 * Normalizes a TikTok URL to the standard format
 */
export function normalizeTikTokUrl(url: string): string | null {
  const detection = detectTikTokUrl(url)
  return detection?.normalizedUrl ?? null
}

/**
 * Checks if the given text contains a TikTok URL
 */
export function containsTikTokUrl(text: string): boolean {
  return detectTikTokUrl(text) !== null
}

/**
 * Extracts all TikTok URLs from a given text
 */
export function extractTikTokUrls(text: string): TikTokUrlInfo[] {
  const urls: TikTokUrlInfo[] = []
  const words = text.split(/\s+/)
  
  for (const word of words) {
    const detection = detectTikTokUrl(word)
    if (detection) {
      urls.push(detection)
    }
  }
  
  return urls
}

/**
 * Downloads a TikTok video and returns progress updates
 */
export async function downloadTikTokVideo(
  url: string,
  onProgress?: (progress: TikTokDownloadProgress) => void
): Promise<any> {
  try {
    // Validate URL first
    if (!isValidTikTokUrl(url)) {
      throw new Error('Invalid TikTok URL')
    }

    onProgress?.({
      status: 'downloading',
      progress: 0,
      message: 'Starting download...'
    })

    // Use fetch with ReadableStream for SSE
    return new Promise(async (resolve, reject) => {
      try {
        const response = await fetch('/api/tiktok-download-sse', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ 
            url: normalizeTikTokUrl(url) || url
          })
        })

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`)
        }
        
        const reader = response.body?.getReader()
        const decoder = new TextDecoder()
        
        if (!reader) {
          throw new Error('No response body')
        }
        
        let result: any = null
        let buffer = ''
        
        while (true) {
          const { done, value } = await reader.read()
          
          if (done) break
          
          buffer += decoder.decode(value, { stream: true })
          const lines = buffer.split('\n')
          
          // Keep the last line in buffer if it's incomplete
          buffer = lines.pop() || ''
          
          for (const line of lines) {
            if (line.startsWith('data: ')) {
              try {
                const data = JSON.parse(line.slice(6))
                
                if (data.status === 'completed') {
                  result = data.result
                  onProgress?.(data)
                  resolve(result)
                  return
                } else if (data.status === 'error') {
                  onProgress?.(data)
                  reject(new Error(data.error || 'Download failed'))
                  return
                } else {
                  // Progress update
                  onProgress?.(data)
                }
              } catch (e) {
                // Ignore parse errors
                console.error('Parse error:', e, 'Line:', line)
              }
            }
          }
        }
        
        if (!result) {
          reject(new Error('Download completed but no result received'))
        }
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred'
        onProgress?.({
          status: 'error',
          error: errorMessage,
          message: `Download failed: ${errorMessage}`
        })
        reject(error)
      }
    })

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred'
    
    onProgress?.({
      status: 'error',
      error: errorMessage,
      message: `Download failed: ${errorMessage}`
    })

    throw error
  }
}

/**
 * Creates a File object from TikTok download result for compatibility with existing upload system
 */
export function createFileFromTikTokDownload(downloadResult: any, videoTitle: string): File {
  // Create a minimal File-like object that's compatible with the existing system
  const fileName = `${videoTitle.replace(/[^a-zA-Z0-9\s-]/g, '').trim()}.mp4`
  
  // Create a dummy blob with minimal content to satisfy file size requirements
  const dummyContent = new Blob(['placeholder'], { type: downloadResult.file.mimeType || 'video/mp4' })
  
  const mockFile = new File([dummyContent], fileName, {
    type: downloadResult.file.mimeType || 'video/mp4'
  })

  // Add custom properties that match the FileUpload interface
  Object.defineProperty(mockFile, 'geminiFile', {
    value: {
      uri: downloadResult.file.uri,
      mimeType: downloadResult.file.mimeType,
      name: downloadResult.file.name,
      sizeBytes: downloadResult.file.sizeBytes || 0
    },
    writable: false
  })

  // Add a flag to indicate this is a pre-uploaded file
  Object.defineProperty(mockFile, 'isPreUploaded', {
    value: true,
    writable: false
  })
  
  // Add flag to skip validation for freshly downloaded files
  Object.defineProperty(mockFile, 'skipValidation', {
    value: true,
    writable: false
  })

  // Add video thumbnail if available
  if (downloadResult.thumbnail) {
    Object.defineProperty(mockFile, 'videoThumbnail', {
      value: downloadResult.thumbnail,
      writable: false,
      enumerable: true,
      configurable: true
    })
  } else if (downloadResult.file.videoThumbnail) {
    Object.defineProperty(mockFile, 'videoThumbnail', {
      value: downloadResult.file.videoThumbnail,
      writable: false,
      enumerable: true,
      configurable: true
    })
  }

  return mockFile
}

/**
 * Gets a human-readable title from a TikTok URL for display purposes
 */
export function getDisplayTitleFromUrl(url: string): string {
  const detection = detectTikTokUrl(url)
  if (detection?.username && detection?.videoId) {
    return `TikTok Video by @${detection.username}`
  } else if (detection?.videoId) {
    return `TikTok Video (${detection.videoId})`
  }
  return 'TikTok Video'
}

/**
 * Generates a filename for a downloaded TikTok video
 */
export function generateVideoFileName(title: string, videoId?: string): string {
  // Clean the title for use in filename
  const cleanTitle = title
    .replace(/[^a-zA-Z0-9\s-]/g, '') // Remove special characters
    .replace(/\s+/g, '-') // Replace spaces with dashes
    .substring(0, 50) // Limit length
    .trim()

  if (videoId) {
    return `${cleanTitle}-${videoId}.mp4`
  }
  return `${cleanTitle}.mp4`
}