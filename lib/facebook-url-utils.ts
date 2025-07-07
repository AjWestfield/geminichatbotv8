/**
 * Facebook URL detection and processing utilities
 */

export interface FacebookUrlInfo {
  isValid: boolean
  videoId?: string
  url: string
  normalizedUrl?: string
  type?: 'video' | 'reel' | 'watch' | 'post'
}

export interface FacebookDownloadProgress {
  status: 'downloading' | 'processing' | 'uploading' | 'completed' | 'error'
  progress?: number
  message?: string
  error?: string
}

/**
 * Detects if a string contains a Facebook URL
 */
export function detectFacebookUrl(text: string): FacebookUrlInfo | null {
  // Facebook URL patterns
  const patterns = [
    // Facebook Watch URLs (main video platform)
    {
      pattern: /(?:https?:\/\/)?(?:www\.)?facebook\.com\/watch\/?\?v=(\d+)/,
      type: 'watch' as const,
      extractId: (match: RegExpMatchArray) => match[1]
    },
    // Facebook Reels URLs
    {
      pattern: /(?:https?:\/\/)?(?:www\.)?facebook\.com\/reel\/(\d+)/,
      type: 'reel' as const,
      extractId: (match: RegExpMatchArray) => match[1]
    },
    // Facebook short URLs (fb.watch)
    {
      pattern: /(?:https?:\/\/)?fb\.watch\/([a-zA-Z0-9_-]+)/,
      type: 'watch' as const,
      extractId: (match: RegExpMatchArray) => match[1]
    },
    // Facebook videos in posts
    {
      pattern: /(?:https?:\/\/)?(?:www\.)?facebook\.com\/[^\/]+\/videos\/(\d+)/,
      type: 'video' as const,
      extractId: (match: RegExpMatchArray) => match[1]
    },
    // Facebook mobile URLs
    {
      pattern: /(?:https?:\/\/)?(?:m\.)?facebook\.com\/watch\/?\?v=(\d+)/,
      type: 'watch' as const,
      extractId: (match: RegExpMatchArray) => match[1]
    },
    // Facebook story videos
    {
      pattern: /(?:https?:\/\/)?(?:www\.)?facebook\.com\/stories\/\d+\/([a-zA-Z0-9]+)/,
      type: 'video' as const,
      extractId: (match: RegExpMatchArray) => match[1]
    },
    // Facebook video posts with different URL structure
    {
      pattern: /(?:https?:\/\/)?(?:www\.)?facebook\.com\/.*\/posts\/.*[?&]v=(\d+)/,
      type: 'post' as const,
      extractId: (match: RegExpMatchArray) => match[1]
    }
  ]

  for (const { pattern, type, extractId } of patterns) {
    const match = text.match(pattern)
    if (match) {
      const videoId = extractId(match)
      return {
        isValid: true,
        videoId,
        url: match[0],
        normalizedUrl: match[0].startsWith('http') ? match[0] : `https://${match[0]}`,
        type
      }
    }
  }

  return null
}

/**
 * Validates if a URL is a valid Facebook URL
 */
export function isValidFacebookUrl(url: string): boolean {
  const detection = detectFacebookUrl(url)
  return detection?.isValid ?? false
}

/**
 * Extracts video ID from a Facebook URL
 */
export function extractVideoId(url: string): string | null {
  const detection = detectFacebookUrl(url)
  return detection?.videoId ?? null
}

/**
 * Normalizes a Facebook URL to ensure it has https://
 */
export function normalizeFacebookUrl(url: string): string | null {
  const detection = detectFacebookUrl(url)
  return detection?.normalizedUrl ?? null
}

/**
 * Checks if the given text contains a Facebook URL
 */
export function containsFacebookUrl(text: string): boolean {
  return detectFacebookUrl(text) !== null
}

/**
 * Extracts all Facebook URLs from a given text
 */
export function extractFacebookUrls(text: string): FacebookUrlInfo[] {
  const urls: FacebookUrlInfo[] = []
  const words = text.split(/\s+/)
  
  for (const word of words) {
    const detection = detectFacebookUrl(word)
    if (detection) {
      urls.push(detection)
    }
  }
  
  return urls
}

/**
 * Downloads a Facebook video/reel and returns progress updates
 */
export async function downloadFacebookMedia(
  url: string,
  onProgress?: (progress: FacebookDownloadProgress) => void,
  options?: { cookies?: string }
): Promise<any> {
  try {
    // Validate URL first
    if (!isValidFacebookUrl(url)) {
      throw new Error('Invalid Facebook URL')
    }

    onProgress?.({
      status: 'downloading',
      progress: 0,
      message: 'Starting download...'
    })

    // Use fetch with ReadableStream for SSE
    return new Promise(async (resolve, reject) => {
      try {
        const response = await fetch('/api/facebook-download-sse', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            url: normalizeFacebookUrl(url),
            cookies: options?.cookies
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
                  // Check if it's an authentication error
                  if (data.error === 'AUTHENTICATION_REQUIRED' || data.requiresAuth) {
                    const authError = new Error('AUTHENTICATION_REQUIRED')
                    ;(authError as any).response = { status: 401 }
                    ;(authError as any).requiresAuth = true
                    onProgress?.(data)
                    reject(authError)
                    return
                  }
                  
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
 * Creates a File object from Facebook download result for compatibility with existing upload system
 */
export function createFileFromFacebookDownload(downloadResult: any, mediaTitle: string): File {
  console.log('[createFileFromFacebookDownload] Input:', {
    hasFile: !!downloadResult.file,
    hasThumbnail: !!downloadResult.thumbnail,
    thumbnailLength: downloadResult.thumbnail?.length || 0,
    fileUri: downloadResult.file?.uri,
    fileMimeType: downloadResult.file?.mimeType,
    fileSizeBytes: downloadResult.file?.sizeBytes,
    mediaTitle
  })

  // Create a minimal File-like object that's compatible with the existing system
  // Add timestamp to ensure unique filenames to prevent caching issues
  const timestamp = Date.now()
  const fileName = `${mediaTitle.replace(/[^a-zA-Z0-9\s-]/g, '').trim()}-${timestamp}.mp4`

  // Create a dummy blob with minimal content to satisfy file size requirements
  const dummyContent = new Blob(['placeholder'], { type: downloadResult.file.mimeType || 'video/mp4' })

  // Create the base file
  const mockFile = new File([dummyContent], fileName, {
    type: downloadResult.file.mimeType || 'video/mp4'
  }) as File & {
    geminiFile?: any;
    isPreUploaded?: boolean;
    videoThumbnail?: string;
    _isFacebookVideo?: boolean;
    videoUrl?: string;
  }

  // Add custom properties using Object.defineProperty for better compatibility
  Object.defineProperty(mockFile, 'geminiFile', {
    value: {
      uri: downloadResult.file.uri,
      mimeType: downloadResult.file.mimeType,
      name: downloadResult.file.name,
      sizeBytes: downloadResult.file.sizeBytes || 0,
      displayName: downloadResult.file.displayName
    },
    writable: true,
    enumerable: true,
    configurable: true
  })

  // Add a flag to indicate this is a pre-uploaded file
  Object.defineProperty(mockFile, 'isPreUploaded', {
    value: true,
    writable: false,
    enumerable: true,
    configurable: true
  })
  
  // Add upload timestamp for tracking freshness
  Object.defineProperty(mockFile, 'uploadTimestamp', {
    value: Date.now(),
    writable: false,
    enumerable: true,
    configurable: true
  })

  // Add flag to prevent auto-analysis
  Object.defineProperty(mockFile, 'skipAutoAnalysis', {
    value: true,
    writable: false,
    enumerable: true,
    configurable: true
  })
  
  // Add flag to skip validation for freshly downloaded files
  Object.defineProperty(mockFile, 'skipValidation', {
    value: true,
    writable: false,
    enumerable: true,
    configurable: true
  })

  // Add video thumbnail if available
  if (downloadResult.thumbnail) {
    // Ensure the thumbnail is a valid data URL
    if (downloadResult.thumbnail.startsWith('data:image/')) {
      // Use regular property assignment for better compatibility
      mockFile.videoThumbnail = downloadResult.thumbnail;
      
      // Also use defineProperty as backup
      Object.defineProperty(mockFile, 'videoThumbnail', {
        value: downloadResult.thumbnail,
        writable: true,
        enumerable: true,
        configurable: true
      });
      
      console.log('[createFileFromFacebookDownload] Added videoThumbnail:', {
        length: downloadResult.thumbnail.length,
        preview: downloadResult.thumbnail.substring(0, 100) + '...',
        isDataUrl: downloadResult.thumbnail.startsWith('data:image/'),
        propertyExists: 'videoThumbnail' in mockFile,
        propertyValue: !!mockFile.videoThumbnail
      });
    } else {
      console.warn('[createFileFromFacebookDownload] Thumbnail is not a valid data URL:', downloadResult.thumbnail.substring(0, 100));
    }
  } else {
    console.log('[createFileFromFacebookDownload] No thumbnail available in downloadResult');
  }
  
  // Add a flag to help debug the flow
  mockFile._isFacebookVideo = true;

  console.log('[createFileFromFacebookDownload] Created file:', {
    name: mockFile.name,
    type: mockFile.type,
    size: mockFile.size,
    hasGeminiFile: !!mockFile.geminiFile,
    geminiUri: mockFile.geminiFile?.uri,
    hasVideoThumbnail: !!mockFile.videoThumbnail,
    videoThumbnailExists: 'videoThumbnail' in mockFile,
    isPreUploaded: mockFile.isPreUploaded,
    _isFacebookVideo: mockFile._isFacebookVideo
  })

  // Store the original video URL if available for playback
  if (downloadResult.file?.mimeType?.startsWith('video/') && downloadResult.videoUrl) {
    mockFile.videoUrl = downloadResult.videoUrl;
    console.log('[createFileFromFacebookDownload] Added video URL for playback');
  }

  return mockFile
}

/**
 * Gets a human-readable title from a Facebook URL for display purposes
 */
export function getDisplayTitleFromUrl(url: string): string {
  const videoId = extractVideoId(url)
  const urlInfo = detectFacebookUrl(url)

  if (videoId && urlInfo) {
    const typeLabel = urlInfo.type === 'reel' ? 'Reel' :
                     urlInfo.type === 'watch' ? 'Watch Video' :
                     urlInfo.type === 'post' ? 'Post Video' : 'Video'
    return `Facebook ${typeLabel} (${videoId})`
  }
  return 'Facebook Video'
}

/**
 * Generates a filename for a downloaded Facebook media
 */
export function generateMediaFileName(title: string, videoId: string, extension: string = 'mp4'): string {
  // Clean the title for use in filename
  const cleanTitle = title
    .replace(/[^a-zA-Z0-9\s-]/g, '') // Remove special characters
    .replace(/\s+/g, '-') // Replace spaces with dashes
    .substring(0, 50) // Limit length
    .trim()

  return `${cleanTitle}-${videoId}.${extension}`
}