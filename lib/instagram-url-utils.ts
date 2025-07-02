/**
 * Instagram URL detection and processing utilities
 */

export interface InstagramUrlInfo {
  isValid: boolean
  mediaId?: string
  url: string
  normalizedUrl?: string
  type?: 'reel' | 'post' | 'story'
}

export interface InstagramDownloadProgress {
  status: 'downloading' | 'processing' | 'uploading' | 'completed' | 'error'
  progress?: number
  message?: string
  error?: string
}

/**
 * Detects if a string contains an Instagram URL
 */
export function detectInstagramUrl(text: string): InstagramUrlInfo | null {
  // Instagram URL patterns
  const patterns = [
    // Instagram Reels URLs
    {
      pattern: /(?:https?:\/\/)?(?:www\.)?instagram\.com\/(?:reel|reels)\/([A-Za-z0-9_-]+)/,
      type: 'reel' as const
    },
    // Instagram Post URLs (can also be reels)
    {
      pattern: /(?:https?:\/\/)?(?:www\.)?instagram\.com\/p\/([A-Za-z0-9_-]+)/,
      type: 'post' as const
    },
    // Instagram TV URLs
    {
      pattern: /(?:https?:\/\/)?(?:www\.)?instagram\.com\/tv\/([A-Za-z0-9_-]+)/,
      type: 'post' as const
    },
    // Instagram Stories URLs
    {
      pattern: /(?:https?:\/\/)?(?:www\.)?instagram\.com\/stories\/[^\/]+\/([A-Za-z0-9_-]+)/,
      type: 'story' as const
    }
  ]

  for (const { pattern, type } of patterns) {
    const match = text.match(pattern)
    if (match) {
      const mediaId = match[1]
      const baseUrl = match[0].replace(/^https?:\/\//, '').replace(/^www\./, '')
      return {
        isValid: true,
        mediaId,
        url: match[0],
        normalizedUrl: `https://www.instagram.com/${type === 'reel' ? 'reel' : 'p'}/${mediaId}/`,
        type
      }
    }
  }

  return null
}

/**
 * Validates if a URL is a valid Instagram URL
 */
export function isValidInstagramUrl(url: string): boolean {
  const detection = detectInstagramUrl(url)
  return detection?.isValid ?? false
}

/**
 * Extracts media ID from an Instagram URL
 */
export function extractMediaId(url: string): string | null {
  const detection = detectInstagramUrl(url)
  return detection?.mediaId ?? null
}

/**
 * Normalizes an Instagram URL to the standard format
 */
export function normalizeInstagramUrl(url: string): string | null {
  const detection = detectInstagramUrl(url)
  return detection?.normalizedUrl ?? null
}

/**
 * Checks if the given text contains an Instagram URL
 */
export function containsInstagramUrl(text: string): boolean {
  return detectInstagramUrl(text) !== null
}

/**
 * Extracts all Instagram URLs from a given text
 */
export function extractInstagramUrls(text: string): InstagramUrlInfo[] {
  const urls: InstagramUrlInfo[] = []
  const words = text.split(/\s+/)

  for (const word of words) {
    const detection = detectInstagramUrl(word)
    if (detection) {
      urls.push(detection)
    }
  }

  return urls
}

/**
 * Downloads an Instagram reel/post and returns progress updates
 */
export async function downloadInstagramMedia(
  url: string,
  onProgress?: (progress: InstagramDownloadProgress) => void,
  options?: { cookies?: string }
): Promise<any> {
  try {
    // Validate URL first
    if (!isValidInstagramUrl(url)) {
      throw new Error('Invalid Instagram URL')
    }

    onProgress?.({
      status: 'downloading',
      progress: 0,
      message: 'Starting download...'
    })

    // Use fetch with ReadableStream for SSE
    return new Promise(async (resolve, reject) => {
      try {
        const response = await fetch('/api/instagram-download-sse', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            url: normalizeInstagramUrl(url),
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
 * Creates a File object from Instagram download result for compatibility with existing upload system
 */
export function createFileFromInstagramDownload(downloadResult: any, mediaTitle: string): File {
  console.log('[createFileFromInstagramDownload] Input:', {
    hasFile: !!downloadResult.file,
    hasThumbnail: !!downloadResult.thumbnail,
    thumbnailLength: downloadResult.thumbnail?.length || 0,
    fileUri: downloadResult.file?.uri,
    fileMimeType: downloadResult.file?.mimeType,
    fileSizeBytes: downloadResult.file?.sizeBytes,
    mediaTitle
  })

  // Create a minimal File-like object that's compatible with the existing system
  const fileName = `${mediaTitle.replace(/[^a-zA-Z0-9\s-]/g, '').trim()}.mp4`

  // Create a dummy blob with minimal content to satisfy file size requirements
  // The actual content is stored in Gemini and referenced via the geminiFile property
  const dummyContent = new Blob(['placeholder'], { type: downloadResult.file.mimeType || 'video/mp4' })

  // Create the base file
  const mockFile = new File([dummyContent], fileName, {
    type: downloadResult.file.mimeType || 'video/mp4'
  }) as File & {
    geminiFile?: any;
    isPreUploaded?: boolean;
    videoThumbnail?: string;
    _isInstagramVideo?: boolean;
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
  
  // Add flag to skip validation for freshly downloaded files
  Object.defineProperty(mockFile, 'skipValidation', {
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

  // Add video thumbnail if available - CRITICAL FIX
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
      
      console.log('[createFileFromInstagramDownload] Added videoThumbnail:', {
        length: downloadResult.thumbnail.length,
        preview: downloadResult.thumbnail.substring(0, 100) + '...',
        isDataUrl: downloadResult.thumbnail.startsWith('data:image/'),
        propertyExists: 'videoThumbnail' in mockFile,
        propertyValue: !!mockFile.videoThumbnail
      });
    } else {
      console.warn('[createFileFromInstagramDownload] Thumbnail is not a valid data URL:', downloadResult.thumbnail.substring(0, 100));
    }
  } else {
    console.log('[createFileFromInstagramDownload] No thumbnail available in downloadResult');
  }
  
  // Add a flag to help debug the flow
  mockFile._isInstagramVideo = true;

  console.log('[createFileFromInstagramDownload] Created file:', {
    name: mockFile.name,
    type: mockFile.type,
    size: mockFile.size,
    hasGeminiFile: !!mockFile.geminiFile,
    geminiUri: mockFile.geminiFile?.uri,
    hasVideoThumbnail: !!mockFile.videoThumbnail,
    videoThumbnailExists: 'videoThumbnail' in mockFile,
    isPreUploaded: mockFile.isPreUploaded,
    _isInstagramVideo: mockFile._isInstagramVideo
  })

  // CRITICAL: Store the original video blob URL if available
  if (downloadResult.file?.mimeType?.startsWith('video/') && downloadResult.videoUrl) {
    mockFile.videoUrl = downloadResult.videoUrl;
    console.log('[createFileFromInstagramDownload] Added video URL for playback');
  }

  return mockFile
}

/**
 * Gets a human-readable title from an Instagram URL for display purposes
 */
export function getDisplayTitleFromUrl(url: string): string {
  const mediaId = extractMediaId(url)
  const urlInfo = detectInstagramUrl(url)

  if (mediaId && urlInfo) {
    const typeLabel = urlInfo.type === 'reel' ? 'Reel' :
                     urlInfo.type === 'story' ? 'Story' : 'Post'
    return `Instagram ${typeLabel} (${mediaId})`
  }
  return 'Instagram Media'
}

/**
 * Generates a filename for a downloaded Instagram media
 */
export function generateMediaFileName(title: string, mediaId: string, extension: string = 'mp4'): string {
  // Clean the title for use in filename
  const cleanTitle = title
    .replace(/[^a-zA-Z0-9\s-]/g, '') // Remove special characters
    .replace(/\s+/g, '-') // Replace spaces with dashes
    .substring(0, 50) // Limit length
    .trim()

  return `${cleanTitle}-${mediaId}.${extension}`
}
