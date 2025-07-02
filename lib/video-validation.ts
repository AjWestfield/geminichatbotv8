import { GeneratedVideo } from "./video-generation-types"

/**
 * Check if a video has a valid permanent URL
 */
export function hasValidPermanentUrl(video: GeneratedVideo): boolean {
  if (!video.url) return false
  
  // Blob URLs are temporary and expire
  if (video.url.startsWith('blob:')) return false
  
  // Data URLs are embedded but very large
  if (video.url.startsWith('data:')) return false
  
  // Must be http(s) URL
  try {
    const url = new URL(video.url)
    return url.protocol === 'http:' || url.protocol === 'https:'
  } catch {
    return false
  }
}

/**
 * Check if a Replicate URL is likely expired
 * Replicate URLs typically expire after 24 hours
 */
export function isReplicateUrlExpired(url: string, createdAt?: Date): boolean {
  if (!url.includes('replicate.delivery')) return false
  
  // If no creation date, assume it's expired to be safe
  if (!createdAt) return true
  
  // Check if older than 24 hours
  const now = new Date()
  const created = new Date(createdAt)
  const hoursOld = (now.getTime() - created.getTime()) / (1000 * 60 * 60)
  
  return hoursOld > 24
}

/**
 * Filter videos to only include those with valid URLs or non-completed status
 */
export function filterValidVideos(videos: GeneratedVideo[]): GeneratedVideo[] {
  return videos.filter(video => {
    // Keep videos that are still generating or failed
    if (video.status !== 'completed') return true
    
    // Check if Replicate URL is expired
    if (isReplicateUrlExpired(video.url, video.createdAt)) {
      console.warn(`[VideoValidation] Filtering out video ${video.id} with expired Replicate URL`)
      return false
    }
    
    // Only keep completed videos with valid permanent URLs
    return hasValidPermanentUrl(video)
  })
}

/**
 * Validate and clean video data before saving
 */
export function prepareVideoForStorage(video: GeneratedVideo): GeneratedVideo | null {
  // Don't save videos without IDs
  if (!video.id) {
    console.warn('[VideoValidation] Skipping video without ID')
    return null
  }
  
  // Don't save completed videos without valid URLs
  if (video.status === 'completed' && !hasValidPermanentUrl(video)) {
    console.warn(`[VideoValidation] Skipping completed video ${video.id} with invalid URL:`, video.url)
    return null
  }
  
  // Clean up video data
  const cleaned: GeneratedVideo = {
    id: video.id,
    prompt: video.prompt || '',
    url: video.url || '',
    status: video.status || 'failed',
    createdAt: video.createdAt || new Date(),
  }
  
  // Add optional fields if present
  if (video.thumbnailUrl) cleaned.thumbnailUrl = video.thumbnailUrl
  if (video.duration) cleaned.duration = video.duration
  if (video.aspectRatio) cleaned.aspectRatio = video.aspectRatio
  if (video.model) cleaned.model = video.model
  if (video.sourceImage) cleaned.sourceImage = video.sourceImage
  if (video.completedAt) cleaned.completedAt = video.completedAt
  if (video.error) cleaned.error = video.error
  
  return cleaned
}

/**
 * Log video validation details
 */
export function logVideoValidation(video: GeneratedVideo, context: string) {
  console.log(`[VideoValidation] ${context}:`, {
    id: video.id,
    url: video.url?.substring(0, 50) + '...',
    status: video.status,
    hasValidUrl: hasValidPermanentUrl(video),
    isExpired: video.url ? isReplicateUrlExpired(video.url, video.createdAt) : false,
    createdAt: video.createdAt
  })
}
