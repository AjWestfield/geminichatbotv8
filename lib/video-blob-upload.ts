import { put } from '@vercel/blob'

/**
 * Upload a video from a temporary URL to permanent Vercel Blob storage
 */
export async function uploadVideoToBlob(tempUrl: string, filename: string): Promise<string> {
  try {
    console.log('[VideoBlobUpload] Starting upload for:', filename)
    
    // Fetch the video from the temporary URL
    const response = await fetch(tempUrl)
    if (!response.ok) {
      throw new Error(`Failed to fetch video: ${response.status} ${response.statusText}`)
    }
    
    // Get the video data
    const videoBlob = await response.blob()
    console.log('[VideoBlobUpload] Video size:', (videoBlob.size / 1024 / 1024).toFixed(2), 'MB')
    
    // Upload to Vercel Blob
    const { url } = await put(`videos/${filename}`, videoBlob, {
      access: 'public',
      contentType: 'video/mp4'
    })
    
    console.log('[VideoBlobUpload] Upload complete:', url)
    return url
    
  } catch (error) {
    console.error('[VideoBlobUpload] Upload failed:', error)
    throw error
  }
}

/**
 * Generate a unique filename for a video
 */
export function generateVideoFilename(videoId: string, prompt: string): string {
  // Clean prompt for filename
  const cleanPrompt = prompt
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .substring(0, 50)
  
  // Include timestamp to ensure uniqueness
  const timestamp = Date.now()
  
  return `${videoId}-${cleanPrompt}-${timestamp}.mp4`
}

/**
 * Check if a URL is a Vercel Blob URL (permanent)
 */
export function isVercelBlobUrl(url: string): boolean {
  return url.includes('.blob.vercel-storage.com') || url.includes('.public.blob.vercel-storage.com')
}

/**
 * Check if a video needs to be uploaded to permanent storage
 */
export function needsPermanentStorage(video: { url: string, status: string }): boolean {
  // Only completed videos with temporary URLs need upload
  if (video.status !== 'completed') return false
  if (!video.url) return false
  if (isVercelBlobUrl(video.url)) return false // Already permanent
  if (video.url.startsWith('blob:')) return false // Local blob
  if (video.url.includes('replicate.delivery')) return true // Temporary Replicate URL
  
  return false
}
