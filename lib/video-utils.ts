// Video utility functions to prevent duplicates and ensure data integrity

import { GeneratedVideo } from './video-generation-types'

/**
 * Deduplicate videos array by ID, keeping the most recent version of each video
 */
export function deduplicateVideos(videos: GeneratedVideo[]): GeneratedVideo[] {
  const videoMap = new Map<string, GeneratedVideo>()

  // Iterate in reverse to keep the latest version of each video
  for (let i = videos.length - 1; i >= 0; i--) {
    const video = videos[i]
    if (video && video.id && !videoMap.has(video.id)) {
      videoMap.set(video.id, video)
    }
  }

  // Convert back to array in original order
  return Array.from(videoMap.values()).reverse()
}

/**
 * Merge new videos with existing ones, preventing duplicates
 */
export function mergeVideos(existingVideos: GeneratedVideo[], newVideos: GeneratedVideo[]): GeneratedVideo[] {
  const videoMap = new Map<string, GeneratedVideo>()

  // Add existing videos first
  existingVideos.forEach(video => {
    if (video && video.id) {
      videoMap.set(video.id, video)
    }
  })

  // Add or update with new videos
  newVideos.forEach(video => {
    if (video && video.id) {
      videoMap.set(video.id, video)
    }
  })

  return Array.from(videoMap.values())
}

/**
 * Update a specific video in the array
 */
export function updateVideo(videos: GeneratedVideo[], videoId: string, updates: Partial<GeneratedVideo>): GeneratedVideo[] {
  return videos.map(video =>
    video.id === videoId ? { ...video, ...updates } : video
  )
}

/**
 * Remove a video from the array
 */
export function removeVideo(videos: GeneratedVideo[], videoId: string): GeneratedVideo[] {
  return videos.filter(video => video.id !== videoId)
}

/**
 * Generate a thumbnail for a video (placeholder implementation)
 */
export function generateVideoThumbnail(videoUrl: string): Promise<string> {
  // This is a placeholder implementation
  // In a real implementation, you would extract a frame from the video
  return Promise.resolve('')
}

/**
 * Get video duration using yt-dlp for server-side detection
 * NOTE: This function is only available on the server side
 */
export async function getVideoDuration(videoPath: string): Promise<number> {
  // Only run on server side
  if (typeof window !== 'undefined') {
    console.warn('[VideoUtils] getVideoDuration called on client side, returning 0')
    return 0
  }
  
  try {
    // Import yt-dlp-wrap dynamically for server-side usage
    const YTDlpWrap = (await import('yt-dlp-wrap')).default
    const ytdlp = new YTDlpWrap()

    // Extract video metadata to get duration (follows same pattern as YouTube download)
    const metadataOutput = await (ytdlp.exec([
      videoPath,
      '--print', '%(duration)s',
      '--no-download',
      '--no-warnings'
    ]) as unknown as string)

    const duration = parseFloat(metadataOutput.trim())
    
    // Return duration in seconds, or 0 if invalid
    return isNaN(duration) ? 0 : duration
  } catch (error) {
    console.warn(`[VideoUtils] Failed to get video duration for ${videoPath}:`, error)
    return 0
  }
}

/**
 * Get video duration for client-side usage (HTML5 video element)
 */
export function getVideoDurationFromElement(videoElement: HTMLVideoElement): number {
  return videoElement.duration || 0
}

/**
 * Format video duration in human-readable format
 */
export function formatVideoDuration(seconds: number): string {
  if (seconds < 60) {
    return `${Math.round(seconds)}s`
  }

  const minutes = Math.floor(seconds / 60)
  const remainingSeconds = Math.round(seconds % 60)

  if (minutes < 60) {
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`
  }

  const hours = Math.floor(minutes / 60)
  const remainingMinutes = minutes % 60

  return `${hours}:${remainingMinutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`
}
/**
 * Generate a thumbnail for a given File object containing a video.
 * This utility works in the browser only.
 * @param file Video File selected by the user.
 * @param seekTime Time in seconds in the video to capture the frame, defaults to 2 seconds.
 * @returns Promise resolving to a data URL string or null if generation fails.
 */
export async function generateVideoThumbnailFromFile(file: File, seekTime = 2): Promise<string | null> {
  return new Promise((resolve) => {
    if (typeof window === 'undefined') {
      // Not running in browser – cannot generate thumbnail
      resolve(null)
      return
    }

    const url = URL.createObjectURL(file)
    const video = document.createElement('video')
    video.preload = 'metadata'
    video.muted = true
    video.src = url
    video.crossOrigin = 'anonymous'

    const cleanup = () => {
      URL.revokeObjectURL(url)
      video.remove()
    }

    video.onloadedmetadata = () => {
      // Clamp seek time to 10% of duration for very short clips
      const targetTime = Math.min(seekTime, video.duration * 0.1)
      video.currentTime = targetTime
    }

    video.onseeked = () => {
      try {
        const canvas = document.createElement('canvas')
        canvas.width = video.videoWidth
        canvas.height = video.videoHeight
        const ctx = canvas.getContext('2d')
        if (!ctx) throw new Error('Failed to get 2D context')
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height)
        const dataUrl = canvas.toDataURL('image/jpeg', 0.8)
        cleanup()
        resolve(dataUrl)
      } catch (err) {
        console.warn('[VideoUtils] Failed to draw thumbnail:', err)
        cleanup()
        resolve(null)
      }
    }

    video.onerror = () => {
      console.warn('[VideoUtils] Error loading video for thumbnail generation')
      cleanup()
      resolve(null)
    }
  })
}

/**
 * Get video duration for a given File object in the browser.
 * Falls back to 0 on error.
 * @param file Video File selected by the user.
 */
export async function getVideoDurationFromFile(file: File): Promise<number> {
  return new Promise((resolve) => {
    if (typeof window === 'undefined') {
      resolve(0)
      return
    }
    const url = URL.createObjectURL(file)
    const video = document.createElement('video')
    video.preload = 'metadata'
    video.src = url

    const cleanup = () => {
      URL.revokeObjectURL(url)
      video.remove()
    }

    video.onloadedmetadata = () => {
      const duration = video.duration || 0
      cleanup()
      resolve(duration)
    }

    video.onerror = () => {
      console.warn('[VideoUtils] Error loading video for duration detection')
      cleanup()
      resolve(0)
    }
  })
}

// Utility to check if a URL is valid and accessible
export function isValidVideoUrl(url: string): boolean {
  if (!url) return false;

  // Blob URLs are only valid in the current session
  if (url.startsWith('blob:')) {
    return false;
  }

  // Check if it's a valid HTTP(S) URL
  try {
    const urlObj = new URL(url);
    return urlObj.protocol === 'http:' || urlObj.protocol === 'https:';
  } catch {
    return false;
  }
}

// Check if a video can be displayed
export function canDisplayVideo(video: GeneratedVideo): boolean {
  if (video.status !== 'completed') return true; // Non-completed videos don't need valid URLs
  return isValidVideoUrl(video.url);
}

// Get display message for invalid video
export function getInvalidVideoMessage(video: GeneratedVideo): string {
  // Handle null/undefined video objects
  if (!video) {
    return 'Video data is missing or corrupted.';
  }

  // Handle missing URL
  if (!video.url) {
    return 'Video URL is missing. The video may still be processing.';
  }

  // Handle different URL types
  try {
    if (video.url.startsWith('blob:')) {
      return 'Video URL expired. This video was generated in a previous session and needs to be regenerated.';
    }
    if (video.url.startsWith('data:')) {
      return 'Video is stored as data URL which is not supported for playback.';
    }
    return 'Invalid video URL format';
  } catch (error) {
    console.error('[VideoUtils] Error processing video URL:', error, video);
    return 'Error processing video data.';
  }
}

/**
 * Convert a data URL to a blob for thumbnail processing
 */
export function dataURLtoBlob(dataURL: string): Blob {
  const arr = dataURL.split(',')
  const mime = arr[0].match(/:(.*?);/)?.[1] || 'image/jpeg'
  const bstr = atob(arr[1])
  let n = bstr.length
  const u8arr = new Uint8Array(n)
  
  while (n--) {
    u8arr[n] = bstr.charCodeAt(n)
  }
  
  return new Blob([u8arr], { type: mime })
}

/**
 * Extract YouTube thumbnail URL from video ID
 */
export function getYouTubeThumbnailUrl(videoId: string, quality: 'default' | 'hq' | 'mq' | 'sd' | 'maxres' = 'maxres'): string {
  return `https://img.youtube.com/vi/${videoId}/${quality}default.jpg`
}
