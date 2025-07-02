/**
 * Utility functions for handling video thumbnails
 */

/**
 * Validates if a thumbnail data URL is valid
 */
export function isValidThumbnailDataUrl(dataUrl: string | undefined): boolean {
  if (!dataUrl) return false;
  
  // Check if it's a valid data URL
  if (!dataUrl.startsWith('data:')) return false;
  
  // Check if it has actual content (not just the header)
  const [header, data] = dataUrl.split(',');
  if (!header || !data || data.length < 100) return false;
  
  // Check if it's an image type
  if (!header.includes('image/')) return false;
  
  return true;
}

/**
 * Extracts thumbnail from video file metadata if available
 */
export async function extractThumbnailFromVideoMetadata(file: File): Promise<string | null> {
  try {
    // For Instagram videos that have thumbnails in metadata
    if ((file as any).videoThumbnail && isValidThumbnailDataUrl((file as any).videoThumbnail)) {
      console.log('[extractThumbnailFromVideoMetadata] Found valid thumbnail in file metadata');
      return (file as any).videoThumbnail;
    }
    
    // For Instagram API responses that include thumbnail
    if ((file as any).thumbnail && isValidThumbnailDataUrl((file as any).thumbnail)) {
      console.log('[extractThumbnailFromVideoMetadata] Found valid thumbnail in file.thumbnail');
      return (file as any).thumbnail;
    }
    
    return null;
  } catch (error) {
    console.error('[extractThumbnailFromVideoMetadata] Error:', error);
    return null;
  }
}

/**
 * Ensures video file has a valid thumbnail
 */
export function ensureVideoThumbnail(file: File & { videoThumbnail?: string }): void {
  if (file.type.startsWith('video/') && !isValidThumbnailDataUrl(file.videoThumbnail)) {
    console.warn('[ensureVideoThumbnail] Video file missing valid thumbnail:', {
      fileName: file.name,
      hasVideoThumbnail: !!file.videoThumbnail,
      thumbnailLength: file.videoThumbnail?.length || 0
    });
    
    // Check alternative locations for thumbnail
    const alternativeThumbnail = (file as any).thumbnail || (file as any).preview;
    if (isValidThumbnailDataUrl(alternativeThumbnail)) {
      file.videoThumbnail = alternativeThumbnail;
      console.log('[ensureVideoThumbnail] Found thumbnail in alternative location');
    }
  }
}
