/**
 * Generate a thumbnail from a video element
 */
export async function generateVideoThumbnail(videoElement: HTMLVideoElement): Promise<string | null> {
  try {
    // Create canvas
    const canvas = document.createElement('canvas')
    canvas.width = videoElement.videoWidth || 640
    canvas.height = videoElement.videoHeight || 360
    
    // Draw video frame to canvas
    const ctx = canvas.getContext('2d')
    if (!ctx) {
      throw new Error('Failed to get canvas context')
    }
    
    ctx.drawImage(videoElement, 0, 0, canvas.width, canvas.height)
    
    // Convert to data URL
    const thumbnailDataUrl = canvas.toDataURL('image/jpeg', 0.8)
    
    return thumbnailDataUrl
  } catch (error) {
    console.error('[VideoThumbnail] Failed to generate thumbnail:', error)
    return null
  }
}

/**
 * Generate a thumbnail from a video URL
 */
export async function generateThumbnailFromUrl(videoUrl: string): Promise<string | null> {
  return new Promise((resolve) => {
    const video = document.createElement('video')
    video.crossOrigin = 'anonymous'
    video.muted = true
    
    const cleanup = () => {
      video.remove()
    }
    
    video.onloadedmetadata = () => {
      // Seek to 1 second (or 10% of duration for short videos)
      video.currentTime = Math.min(1, video.duration * 0.1)
    }
    
    video.onseeked = async () => {
      const thumbnail = await generateVideoThumbnail(video)
      cleanup()
      resolve(thumbnail)
    }
    
    video.onerror = () => {
      cleanup()
      resolve(null)
    }
    
    // Set video source and load
    video.src = videoUrl
    video.load()
  })
}

/**
 * Upload a thumbnail to Vercel Blob storage
 */
export async function uploadThumbnailToBlob(thumbnailDataUrl: string, filename: string): Promise<string | null> {
  try {
    // Convert data URL to blob
    const response = await fetch(thumbnailDataUrl)
    const blob = await response.blob()
    
    // Upload to Vercel Blob (requires server-side API route)
    const uploadResponse = await fetch('/api/upload-thumbnail', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        thumbnail: thumbnailDataUrl,
        filename: filename
      })
    })
    
    if (!uploadResponse.ok) {
      throw new Error('Failed to upload thumbnail')
    }
    
    const { url } = await uploadResponse.json()
    return url
  } catch (error) {
    console.error('[VideoThumbnail] Failed to upload thumbnail:', error)
    return null
  }
}
