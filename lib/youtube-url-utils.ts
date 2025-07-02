/**
 * YouTube URL detection and processing utilities
 */

export interface YoutubeUrlInfo {
  isValid: boolean
  videoId?: string
  url: string
  normalizedUrl?: string
}

export interface YoutubeDownloadProgress {
  status: 'downloading' | 'processing' | 'uploading' | 'completed' | 'error'
  progress?: number
  message?: string
  error?: string
}

/**
 * Detects if a string contains a YouTube URL
 */
export function detectYouTubeUrl(text: string): YoutubeUrlInfo | null {
  // YouTube URL patterns
  const patterns = [
    // Standard YouTube URLs
    /(?:https?:\/\/)?(?:www\.)?youtube\.com\/watch\?v=([a-zA-Z0-9_-]{11})/,
    // YouTube short URLs
    /(?:https?:\/\/)?youtu\.be\/([a-zA-Z0-9_-]{11})/,
    // YouTube Shorts URLs
    /(?:https?:\/\/)?(?:www\.)?youtube\.com\/shorts\/([a-zA-Z0-9_-]{11})/,
    // YouTube URLs with additional parameters
    /(?:https?:\/\/)?(?:www\.)?youtube\.com\/watch\?.*[&?]v=([a-zA-Z0-9_-]{11})/,
    // YouTube mobile URLs
    /(?:https?:\/\/)?(?:m\.)?youtube\.com\/watch\?v=([a-zA-Z0-9_-]{11})/,
  ]

  for (const pattern of patterns) {
    const match = text.match(pattern)
    if (match) {
      const videoId = match[1]
      return {
        isValid: true,
        videoId,
        url: match[0],
        normalizedUrl: `https://www.youtube.com/watch?v=${videoId}`
      }
    }
  }

  return null
}

/**
 * Validates if a URL is a valid YouTube URL
 */
export function isValidYouTubeUrl(url: string): boolean {
  const detection = detectYouTubeUrl(url)
  return detection?.isValid ?? false
}

/**
 * Extracts video ID from a YouTube URL
 */
export function extractVideoId(url: string): string | null {
  const detection = detectYouTubeUrl(url)
  return detection?.videoId ?? null
}

/**
 * Normalizes a YouTube URL to the standard format
 */
export function normalizeYouTubeUrl(url: string): string | null {
  const detection = detectYouTubeUrl(url)
  return detection?.normalizedUrl ?? null
}

/**
 * Checks if the given text contains a YouTube URL
 */
export function containsYouTubeUrl(text: string): boolean {
  return detectYouTubeUrl(text) !== null
}

/**
 * Extracts all YouTube URLs from a given text
 */
export function extractYouTubeUrls(text: string): YoutubeUrlInfo[] {
  const urls: YoutubeUrlInfo[] = []
  const words = text.split(/\s+/)
  
  for (const word of words) {
    const detection = detectYouTubeUrl(word)
    if (detection) {
      urls.push(detection)
    }
  }
  
  return urls
}

/**
 * Downloads a YouTube video and returns progress updates
 */
export async function downloadYouTubeVideo(
  url: string,
  onProgress?: (progress: YoutubeDownloadProgress) => void,
  quality: string = 'auto'
): Promise<any> {
  try {
    // Validate URL first
    if (!isValidYouTubeUrl(url)) {
      throw new Error('Invalid YouTube URL')
    }

    onProgress?.({
      status: 'downloading',
      progress: 0,
      message: 'Starting download...'
    })

    // Use fetch with ReadableStream for SSE
    return new Promise(async (resolve, reject) => {
      try {
        const response = await fetch('/api/youtube-download-sse', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ 
            url: normalizeYouTubeUrl(url),
            quality: quality 
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
 * Creates a File object from YouTube download result for compatibility with existing upload system
 */
export function createFileFromYouTubeDownload(downloadResult: any, videoTitle: string): File {
  // Create a minimal File-like object that's compatible with the existing system
  // Note: This is a mock File object since we can't create a real File from the server response
  const fileName = `${videoTitle.replace(/[^a-zA-Z0-9\s-]/g, '').trim()}.mp4`
  
  // Create a dummy blob with minimal content to satisfy file size requirements
  // The actual content is stored in Gemini and referenced via the geminiFile property
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
  
  // Add upload timestamp for tracking freshness
  Object.defineProperty(mockFile, 'uploadTimestamp', {
    value: Date.now(),
    writable: false,
    enumerable: true,
    configurable: true
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
 * Gets a human-readable title from a YouTube URL for display purposes
 */
export function getDisplayTitleFromUrl(url: string): string {
  const videoId = extractVideoId(url)
  if (videoId) {
    return `YouTube Video (${videoId})`
  }
  return 'YouTube Video'
}

/**
 * Generates a filename for a downloaded YouTube video
 */
export function generateVideoFileName(title: string, videoId: string): string {
  // Clean the title for use in filename
  const cleanTitle = title
    .replace(/[^a-zA-Z0-9\s-]/g, '') // Remove special characters
    .replace(/\s+/g, '-') // Replace spaces with dashes
    .substring(0, 50) // Limit length
    .trim()

  return `${cleanTitle}-${videoId}.mp4`
}