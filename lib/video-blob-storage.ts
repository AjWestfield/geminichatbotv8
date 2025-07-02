/**
 * Temporary storage for video blobs to enable playback
 * In production, you'd use a proper storage solution
 */

class VideoBlobStorage {
  private static instance: VideoBlobStorage;
  private videoBlobs: Map<string, string> = new Map();
  
  private constructor() {}
  
  static getInstance(): VideoBlobStorage {
    if (!VideoBlobStorage.instance) {
      VideoBlobStorage.instance = new VideoBlobStorage();
    }
    return VideoBlobStorage.instance;
  }
  
  async storeVideoBlob(videoId: string, blob: Blob): Promise<string> {
    // Create object URL for the blob
    const url = URL.createObjectURL(blob);
    
    // Store with the video ID
    this.videoBlobs.set(videoId, url);
    
    // Clean up old URLs to prevent memory leaks
    this.cleanupOldUrls();
    
    return url;
  }
  
  getVideoUrl(videoId: string): string | null {
    return this.videoBlobs.get(videoId) || null;
  }
  
  private cleanupOldUrls() {
    // Keep only the last 10 videos in memory
    if (this.videoBlobs.size > 10) {
      const entries = Array.from(this.videoBlobs.entries());
      const toRemove = entries.slice(0, entries.length - 10);
      
      toRemove.forEach(([id, url]) => {
        URL.revokeObjectURL(url);
        this.videoBlobs.delete(id);
      });
    }
  }
  
  clearAll() {
    this.videoBlobs.forEach(url => URL.revokeObjectURL(url));
    this.videoBlobs.clear();
  }
}

export const videoBlobStorage = VideoBlobStorage.getInstance();
