/**
 * Permanent image storage utilities
 * Ensures images are stored in a way that won't expire or become inaccessible
 */

import { uploadImageToBlob } from './blob-storage'
import { downloadImageAsDataUrl, isVercelBlobUrl, validateImageUrl } from '../image-url-validator'
import { saveImage, getImageByLocalId } from '../services/chat-persistence'

interface PermanentStorageOptions {
  imageId?: string
  filename?: string
  forceReupload?: boolean
}

/**
 * Ensures an image is permanently stored and returns a reliable URL
 * This function handles various scenarios:
 * 1. Vercel Blob URLs that might expire
 * 2. Replicate URLs that expire after 24 hours
 * 3. Data URLs that need to be uploaded to blob storage
 */
export async function ensurePermanentImageStorage(
  imageUrl: string,
  options: PermanentStorageOptions = {}
): Promise<string> {
  console.log('[PERMANENT STORAGE] Ensuring permanent storage for:', imageUrl.substring(0, 100) + '...')
  
  const { imageId, filename, forceReupload = false } = options
  
  // If it's already a data URL, upload it to blob storage
  if (imageUrl.startsWith('data:')) {
    console.log('[PERMANENT STORAGE] Data URL detected, uploading to blob storage')
    const permanentFilename = filename || `permanent_${Date.now()}_${Math.random().toString(36).substring(7)}.png`
    return uploadImageToBlob(imageUrl, permanentFilename)
  }
  
  // Check if it's a Vercel Blob URL
  if (isVercelBlobUrl(imageUrl)) {
    console.log('[PERMANENT STORAGE] Vercel Blob URL detected')
    
    // If not forcing reupload, check if URL is still valid
    if (!forceReupload) {
      const isValid = await validateImageUrl(imageUrl)
      if (isValid) {
        console.log('[PERMANENT STORAGE] Vercel Blob URL is still valid')
        return imageUrl
      }
    }
    
    console.log('[PERMANENT STORAGE] Vercel Blob URL is invalid or force reupload requested')
    
    // Try to recover from database if we have an imageId
    if (imageId) {
      console.log('[PERMANENT STORAGE] Checking database for image ID:', imageId)
      const storedImage = await getImageByLocalId(imageId)
      
      if (storedImage && storedImage.url && storedImage.url !== imageUrl) {
        console.log('[PERMANENT STORAGE] Found alternative URL in database')
        // Recursively check the database URL
        return ensurePermanentImageStorage(storedImage.url, { ...options, forceReupload: false })
      }
    }
    
    // If we can't recover from database, try to download and re-upload
    try {
      console.log('[PERMANENT STORAGE] Attempting to download and re-upload')
      const dataUrl = await downloadImageAsDataUrl(imageUrl)
      const permanentFilename = filename || `recovered_${Date.now()}_${Math.random().toString(36).substring(7)}.png`
      return uploadImageToBlob(dataUrl, permanentFilename)
    } catch (error) {
      console.error('[PERMANENT STORAGE] Failed to recover Vercel Blob URL:', error)
      throw new Error('Failed to recover expired Vercel Blob URL. The image is no longer accessible.')
    }
  }
  
  // For other URLs (like Replicate), validate and optionally re-upload
  const isValid = await validateImageUrl(imageUrl)
  
  if (!isValid || forceReupload) {
    console.log('[PERMANENT STORAGE] URL is invalid or force reupload requested, downloading and re-uploading')
    try {
      const dataUrl = await downloadImageAsDataUrl(imageUrl)
      const permanentFilename = filename || `permanent_${Date.now()}_${Math.random().toString(36).substring(7)}.png`
      return uploadImageToBlob(dataUrl, permanentFilename)
    } catch (error) {
      console.error('[PERMANENT STORAGE] Failed to download and re-upload:', error)
      throw error
    }
  }
  
  console.log('[PERMANENT STORAGE] URL is valid, returning as-is')
  return imageUrl
}

/**
 * Store image data in database with permanent URL
 */
export async function storeImagePermanently(
  imageData: {
    id: string
    url: string
    prompt: string
    model?: string
    quality?: string
    style?: string
    size?: string
    originalImageId?: string
  }
): Promise<void> {
  try {
    console.log('[PERMANENT STORAGE] Storing image in database:', imageData.id)
    
    // Ensure the URL is permanent before storing
    const permanentUrl = await ensurePermanentImageStorage(imageData.url, {
      imageId: imageData.id,
      filename: `img_${imageData.id}_${Date.now()}.png`
    })
    
    // Store in database with permanent URL
    await saveImage({
      ...imageData,
      url: permanentUrl,
      timestamp: new Date()
    })
    
    console.log('[PERMANENT STORAGE] Image stored successfully with permanent URL')
  } catch (error) {
    console.error('[PERMANENT STORAGE] Failed to store image permanently:', error)
    throw error
  }
}
