import { put, del, list } from '@vercel/blob'
import { validateImageUrl } from '../image-url-validator'

// Check if blob storage is configured
const isBlobConfigured = () => {
  return !!process.env.BLOB_READ_WRITE_TOKEN
}

// Helper to upload image to blob storage
export async function uploadImageToBlob(
  imageUrl: string,
  filename: string
): Promise<string> {
  if (!isBlobConfigured()) {
    console.log('Blob storage not configured - returning original URL')
    return imageUrl
  }

  try {
    console.log('[BLOB] Starting upload for:', filename)
    console.log('[BLOB] URL type:', imageUrl.startsWith('data:') ? 'data URL' : 'external URL')
    
    // If it's already a blob URL, check if it's still valid
    if (imageUrl.startsWith('https://') && imageUrl.includes('.blob.vercel-storage.com')) {
      console.log('[BLOB] Existing blob URL detected, checking validity...')
      const isValid = await validateImageUrl(imageUrl)
      if (isValid) {
        console.log('[BLOB] Existing blob URL is still valid, returning as-is')
        return imageUrl
      }
      console.log('[BLOB] Existing blob URL is invalid, will re-upload')
    }

    // Handle data URLs
    if (imageUrl.startsWith('data:')) {
      console.log('[BLOB] Processing data URL')
      
      // Extract MIME type from data URL
      const mimeMatch = imageUrl.match(/^data:([^;]+);/)
      const contentType = mimeMatch ? mimeMatch[1] : 'image/png'
      console.log('[BLOB] Detected content type:', contentType)
      
      const base64Data = imageUrl.split(',')[1]
      const buffer = Buffer.from(base64Data, 'base64')
      console.log('[BLOB] Buffer size:', buffer.length)
      
      const blob = await put(`images/${filename}`, buffer, {
        access: 'public',
        contentType: contentType,
      })
      
      console.log('[BLOB] Upload successful:', blob.url)
      return blob.url
    }

    // Handle external URLs - download and re-upload
    console.log('[BLOB] Fetching external URL')
    const response = await fetch(imageUrl)
    
    // Check if the response is valid
    if (!response.ok) {
      throw new Error(`Failed to fetch image: ${response.status} ${response.statusText}`)
    }
    
    const buffer = await response.arrayBuffer()
    console.log('[BLOB] Downloaded buffer size:', buffer.byteLength)
    
    // Validate the response content
    const contentType = response.headers.get('content-type') || ''
    
    // Check for error responses
    if (buffer.byteLength < 100) {
      // Small response, might be an error
      const text = new TextDecoder().decode(buffer)
      console.error('[BLOB] Suspiciously small response:', text)
      
      // Check if it's a JSON error
      if (text.includes('"detail"') || text.includes('"error"')) {
        throw new Error(`Image generation failed: ${text}`)
      }
    }
    
    // Validate content type - handle binary/octet-stream from WaveSpeed
    if (!contentType.startsWith('image/') && contentType !== 'binary/octet-stream') {
      const text = new TextDecoder().decode(buffer.slice(0, 200))
      console.error('[BLOB] Invalid content type:', contentType)
      console.error('[BLOB] Response preview:', text)
      throw new Error(`Invalid image response: expected image, got ${contentType}`)
    }
    
    // If it's binary/octet-stream, try to detect the actual image type
    let finalContentType = contentType
    if (contentType === 'binary/octet-stream') {
      // Check for JPEG signature
      if (buffer[0] === 0xFF && buffer[1] === 0xD8 && buffer[2] === 0xFF) {
        finalContentType = 'image/jpeg'
        console.log('[BLOB] Detected JPEG image from binary/octet-stream')
      }
      // Check for PNG signature
      else if (buffer[0] === 0x89 && buffer[1] === 0x50 && buffer[2] === 0x4E && buffer[3] === 0x47) {
        finalContentType = 'image/png'
        console.log('[BLOB] Detected PNG image from binary/octet-stream')
      }
      // Default to JPEG if we can't detect
      else {
        finalContentType = 'image/jpeg'
        console.log('[BLOB] Defaulting to JPEG for binary/octet-stream')
      }
    }
    
    const blob = await put(`images/${filename}`, buffer, {
      access: 'public',
      contentType: finalContentType || 'image/png',
    })
    
    console.log('[BLOB] Upload successful:', blob.url)
    return blob.url
  } catch (error) {
    console.error('[BLOB] Error uploading to blob storage:', error)
    console.error('[BLOB] Error details:', {
      message: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    })
    // Return original URL as fallback
    return imageUrl
  }
}

// Helper to delete image from blob storage
export async function deleteImageFromBlob(url: string): Promise<boolean> {
  if (!isBlobConfigured()) {
    console.log('[BLOB DELETE] Blob storage not configured - skipping deletion')
    return false
  }

  try {
    // Skip if not a blob URL
    if (!url.includes('.blob.vercel-storage.com')) {
      console.log('[BLOB DELETE] Not a blob URL, skipping deletion:', url)
      return false
    }

    console.log('[BLOB DELETE] Attempting to delete blob:', url)

    // Extract the pathname from the blob URL
    // Example: https://xyz123.public.blob.vercel-storage.com/images/filename-abc123.png
    const urlObj = new URL(url)
    const pathname = urlObj.pathname.substring(1) // Remove leading slash

    if (!pathname) {
      console.error('[BLOB DELETE] Could not extract pathname from URL:', url)
      return false
    }

    await del(pathname)
    console.log('[BLOB DELETE] Successfully deleted blob:', pathname)
    return true
  } catch (error) {
    console.error('[BLOB DELETE] Error deleting from blob storage:', error)
    return false
  }
}

// List all images in blob storage
export async function listImagesInBlob() {
  if (!isBlobConfigured()) {
    return []
  }

  try {
    const { blobs } = await list({
      prefix: 'images/',
    })
    return blobs
  } catch (error) {
    console.error('Error listing blob storage:', error)
    return []
  }
}

// Alias for generic blob deletion
export const deleteBlob = deleteImageFromBlob