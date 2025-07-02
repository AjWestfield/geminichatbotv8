/**
 * Image URL validation and handling utilities for expired Replicate URLs
 */

/**
 * Check if an image URL is accessible
 * Uses GET with Range header to avoid downloading entire image
 */
export async function validateImageUrl(url: string): Promise<boolean> {
  try {
    console.log('[validateImageUrl] Checking URL accessibility:', url.substring(0, 100) + '...')
    
    // Use AbortController for timeout
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 5000) // 5 second timeout
    
    try {
      // Use GET with Range header to fetch only first byte
      // This better mimics what Replicate will do
      const response = await fetch(url, { 
        method: 'GET',
        headers: {
          'Range': 'bytes=0-0' // Request only first byte
        },
        signal: controller.signal
      })
      
      clearTimeout(timeoutId)
      
      // Check if we got a successful response or partial content (206)
      const isOk = response.ok || response.status === 206
      
      if (!isOk) {
        console.log(`[validateImageUrl] URL returned status ${response.status}`)
      }
      
      return isOk
    } catch (fetchError: any) {
      clearTimeout(timeoutId)
      
      if (fetchError.name === 'AbortError') {
        console.error('[validateImageUrl] Request timed out after 5 seconds')
      } else {
        console.error('[validateImageUrl] Fetch error:', fetchError.message)
      }
      
      return false
    }
  } catch (error) {
    console.error('[validateImageUrl] Unexpected error:', error)
    return false
  }
}

/**
 * Download image and convert to data URL for use with Replicate
 */
export async function downloadImageAsDataUrl(url: string): Promise<string> {
  try {
    console.log('[downloadImageAsDataUrl] Downloading image from:', url)
    
    const response = await fetch(url)
    if (!response.ok) {
      throw new Error(`Failed to fetch image: ${response.status} ${response.statusText}`)
    }
    
    const blob = await response.blob()
    
    // Convert blob to data URL
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onloadend = () => {
        const result = reader.result as string
        console.log('[downloadImageAsDataUrl] Converted to data URL, size:', Math.round(result.length / 1024), 'KB')
        resolve(result)
      }
      reader.onerror = () => reject(new Error('Failed to read blob as data URL'))
      reader.readAsDataURL(blob)
    })
  } catch (error) {
    console.error('[downloadImageAsDataUrl] Error:', error)
    throw error
  }
}

/**
 * Handle potentially expired Replicate URLs
 * Returns a valid URL that Replicate can access, or throws an error
 */
export async function ensureImageUrlAccessible(url: string): Promise<string> {
  console.log('[ensureImageUrlAccessible] Checking URL:', url.substring(0, 100) + '...')
  
  // Skip validation for data URLs and blob URLs (already accessible)
  if (url.startsWith('data:') || url.startsWith('blob:')) {
    console.log('[ensureImageUrlAccessible] URL is a data/blob URL, skipping validation')
    return url
  }
  
  // Check if URL is accessible
  const isAccessible = await validateImageUrl(url)
  
  if (isAccessible) {
    console.log('[ensureImageUrlAccessible] URL is accessible')
    return url
  }
  
  console.log('[ensureImageUrlAccessible] URL not accessible, attempting recovery...')
  
  // Track which recovery methods we've tried
  const errors: string[] = []
  
  // Method 1: Try direct download and conversion (client-side)
  try {
    console.log('[ensureImageUrlAccessible] Attempting direct download...')
    const dataUrl = await downloadImageAsDataUrl(url)
    console.log('[ensureImageUrlAccessible] Direct download successful')
    return dataUrl
  } catch (error: any) {
    errors.push(`Direct download: ${error.message}`)
    console.error('[ensureImageUrlAccessible] Direct download failed:', error.message)
  }
  
  // Method 2: Try server-side proxy conversion
  try {
    console.log('[ensureImageUrlAccessible] Attempting server-side conversion...')
    
    // Use absolute URL for server-side requests
    const baseUrl = typeof window !== 'undefined' 
      ? window.location.origin 
      : process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'
    
    const response = await fetch(`${baseUrl}/api/image-proxy/convert-to-data-url`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ imageUrl: url })
    })
    
    if (!response.ok) {
      const errorData = await response.json()
      throw new Error(errorData.error || `Server returned ${response.status}`)
    }
    
    const { dataUrl, metadata } = await response.json()
    console.log('[ensureImageUrlAccessible] Server-side conversion successful, size:', metadata?.sizeKB, 'KB')
    return dataUrl
    
  } catch (proxyError: any) {
    errors.push(`Server proxy: ${proxyError.message}`)
    console.error('[ensureImageUrlAccessible] Server-side conversion failed:', proxyError.message)
  }
  
  // All recovery methods failed
  const isReplicateUrl = url.includes('replicate.delivery')
  const isVercelBlob = isVercelBlobUrl(url)
  
  let errorMessage = 'The image URL is no longer accessible. Please check the URL or upload the image file directly.'
  
  if (isReplicateUrl) {
    errorMessage = 'This Replicate image URL has expired (URLs expire after 24 hours). Please upload the image file directly or use a more recent image.'
  } else if (isVercelBlob) {
    errorMessage = 'This Vercel Blob Storage URL is no longer accessible. The image may have been deleted or expired. Please upload the image file directly to continue editing.'
  }
  
  console.error('[ensureImageUrlAccessible] All recovery methods failed:', errors)
  
  throw new Error(errorMessage)
}

/**
 * Check if URL is a Replicate delivery URL that might expire
 */
export function isReplicateDeliveryUrl(url: string): boolean {
  return url.includes('replicate.delivery')
}

/**
 * Check if URL is a Vercel Blob Storage URL
 */
export function isVercelBlobUrl(url: string): boolean {
  return url.includes('blob.vercel-storage.com') || url.includes('public.blob.vercel-storage.com')
}

/**
 * Estimate if a Replicate URL might be expired based on its age
 * This is a heuristic and not 100% accurate
 */
export function isLikelyExpiredReplicateUrl(url: string, imageTimestamp?: Date): boolean {
  if (!isReplicateDeliveryUrl(url)) {
    return false
  }
  
  if (!imageTimestamp) {
    return false
  }
  
  const ageInHours = (Date.now() - imageTimestamp.getTime()) / (1000 * 60 * 60)
  return ageInHours > 24 // Replicate URLs expire after 24 hours
}

/**
 * Check if a Vercel Blob URL might be expired
 * Vercel Blob URLs can be deleted or expire based on configuration
 */
export function isLikelyExpiredVercelBlobUrl(url: string, imageTimestamp?: Date): boolean {
  if (!isVercelBlobUrl(url)) {
    return false
  }
  
  // If we can't determine age, assume it might be expired
  if (!imageTimestamp) {
    return true
  }
  
  // Vercel Blob URLs can have different expiration policies
  // Conservative check: assume they might expire after 30 days
  const ageInDays = (Date.now() - imageTimestamp.getTime()) / (1000 * 60 * 60 * 24)
  return ageInDays > 30
}