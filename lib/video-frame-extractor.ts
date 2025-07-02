/**
 * Utility to extract frames from video files for thumbnail generation
 */

/**
 * Extract a frame from a video blob URL at a specific time
 */
export async function extractVideoFrame(
  videoBlobUrl: string,
  timeInSeconds: number = 0
): Promise<string | null> {
  return new Promise((resolve) => {
    const video = document.createElement('video');
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    
    if (!ctx) {
      console.error('[extractVideoFrame] Failed to get canvas context');
      resolve(null);
      return;
    }

    video.crossOrigin = 'anonymous';
    video.muted = true;
    video.playsInline = true;
    
    const cleanup = () => {
      video.remove();
      canvas.remove();
    };

    video.addEventListener('loadedmetadata', () => {
      // Set the time to extract frame
      video.currentTime = Math.min(timeInSeconds, video.duration);
    });

    video.addEventListener('seeked', () => {
      try {
        // Set canvas size to video dimensions
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        
        // Draw the video frame to canvas
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        
        // Convert to data URL
        const dataUrl = canvas.toDataURL('image/jpeg', 0.8);
        
        cleanup();
        resolve(dataUrl);
      } catch (error) {
        console.error('[extractVideoFrame] Error extracting frame:', error);
        cleanup();
        resolve(null);
      }
    });

    video.addEventListener('error', () => {
      console.error('[extractVideoFrame] Video loading error');
      cleanup();
      resolve(null);
    });

    // Set a timeout
    setTimeout(() => {
      cleanup();
      resolve(null);
    }, 5000);

    video.src = videoBlobUrl;
    video.load();
  });
}

/**
 * Extract a frame from a video file
 */
export async function extractVideoFrameFromFile(
  file: File,
  timeInSeconds: number = 0
): Promise<string | null> {
  try {
    // Create object URL from file
    const blobUrl = URL.createObjectURL(file);
    
    // Extract frame
    const frame = await extractVideoFrame(blobUrl, timeInSeconds);
    
    // Clean up object URL
    URL.revokeObjectURL(blobUrl);
    
    return frame;
  } catch (error) {
    console.error('[extractVideoFrameFromFile] Error:', error);
    return null;
  }
}

/**
 * Try to extract thumbnail from Instagram video that failed to get one from API
 */
export async function extractInstagramVideoThumbnail(file: File): Promise<string | null> {
  // Only process video files
  if (!file.type.startsWith('video/')) {
    return null;
  }
  
  console.log('[extractInstagramVideoThumbnail] Attempting to extract thumbnail from:', file.name);
  
  // Try to extract frame at 1 second
  let thumbnail = await extractVideoFrameFromFile(file, 1.0);
  
  // If that fails, try at 0 seconds
  if (!thumbnail) {
    thumbnail = await extractVideoFrameFromFile(file, 0);
  }
  
  if (thumbnail) {
    console.log('[extractInstagramVideoThumbnail] Successfully extracted thumbnail');
  } else {
    console.error('[extractInstagramVideoThumbnail] Failed to extract thumbnail');
  }
  
  return thumbnail;
}
