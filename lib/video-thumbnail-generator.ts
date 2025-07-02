import { GeneratedVideo } from "./video-generation-types"

export interface ThumbnailOptions {
  quality?: number
  maxWidth?: number
  maxHeight?: number
  timePercent?: number
  format?: 'jpeg' | 'png' | 'webp'
}

export class VideoThumbnailGenerator {
  private static instance: VideoThumbnailGenerator
  private canvas: HTMLCanvasElement
  private ctx: CanvasRenderingContext2D

  private constructor() {
    this.canvas = document.createElement('canvas')
    const ctx = this.canvas.getContext('2d')
    if (!ctx) {
      throw new Error('Failed to get canvas context')
    }
    this.ctx = ctx
  }

  static getInstance(): VideoThumbnailGenerator {
    if (!VideoThumbnailGenerator.instance) {
      VideoThumbnailGenerator.instance = new VideoThumbnailGenerator()
    }
    return VideoThumbnailGenerator.instance
  }

  /**
   * Generate thumbnail from video element with multiple retry strategies
   */
  async generateFromVideo(
    video: HTMLVideoElement,
    options: ThumbnailOptions = {}
  ): Promise<string | null> {
    const {
      quality = 0.8,
      maxWidth = 1280,
      maxHeight = 720,
      format = 'jpeg'
    } = options

    try {
      // Wait for video to be ready
      await this.waitForVideoReady(video)

      // Calculate dimensions
      const { width, height } = this.calculateDimensions(
        video.videoWidth,
        video.videoHeight,
        maxWidth,
        maxHeight
      )

      // Set canvas dimensions
      this.canvas.width = width
      this.canvas.height = height

      // Clear canvas
      this.ctx.clearRect(0, 0, width, height)

      // Draw video frame
      try {
        this.ctx.drawImage(video, 0, 0, width, height)
      } catch (error) {
        // This might fail due to CORS restrictions
        console.warn('[ThumbnailGenerator] Canvas drawing failed (likely CORS):', error)
        throw new Error('CORS restriction - cannot capture cross-origin video')
      }

      // Convert to data URL
      const mimeType = format === 'webp' ? 'image/webp' : 
                      format === 'png' ? 'image/png' : 'image/jpeg'
      
      const dataUrl = this.canvas.toDataURL(mimeType, quality)

      // Validate result
      if (!dataUrl || dataUrl === 'data:,') {
        throw new Error('Generated invalid thumbnail data URL')
      }

      return dataUrl
    } catch (error) {
      console.error('[ThumbnailGenerator] Failed to generate thumbnail:', error)
      return null
    }
  }

  /**
   * Generate thumbnail from video URL with multiple strategies
   */
  async generateFromUrl(
    url: string,
    options: ThumbnailOptions = {}
  ): Promise<string | null> {
    const { timePercent = 0.1 } = options
    
    return new Promise((resolve) => {
      const video = document.createElement('video')
      // Try without CORS first, then with CORS if it fails
      video.muted = true
      video.playsInline = true
      
      let resolved = false
      let corsAttempted = false
      
      const cleanup = () => {
        video.remove()
      }

      const tryGenerateThumbnail = async () => {
        if (resolved) return
        
        try {
          const thumbnail = await this.generateFromVideo(video, options)
          if (thumbnail) {
            resolved = true
            cleanup()
            resolve(thumbnail)
          }
        } catch (error) {
          console.warn('[ThumbnailGenerator] Failed to generate thumbnail:', error)
          
          // Try with CORS if not attempted yet
          if (!corsAttempted) {
            corsAttempted = true
            video.crossOrigin = 'anonymous'
            video.load()
          } else {
            resolved = true
            cleanup()
            resolve(null)
          }
        }
      }

      // Strategy 1: Try at specified time percent
      video.addEventListener('loadedmetadata', () => {
        if (video.duration > 0) {
          video.currentTime = video.duration * timePercent
        }
      })

      // Strategy 2: Try when seeked
      video.addEventListener('seeked', tryGenerateThumbnail)

      // Strategy 3: Try when can play
      video.addEventListener('canplay', tryGenerateThumbnail)

      // Strategy 4: Fallback timeout
      setTimeout(async () => {
        if (!resolved) {
          await tryGenerateThumbnail()
          if (!resolved) {
            resolved = true
            cleanup()
            resolve(null)
          }
        }
      }, 3000)

      video.addEventListener('error', () => {
        if (!corsAttempted) {
          // Try with CORS
          corsAttempted = true
          video.crossOrigin = 'anonymous'
          video.src = url
          video.load()
        } else {
          resolved = true
          cleanup()
          resolve(null)
        }
      })

      video.src = url
      video.load()
    })
  }

  /**
   * Generate multiple thumbnails at different timestamps
   */
  async generateMultipleThumbnails(
    url: string,
    count: number = 3,
    options: ThumbnailOptions = {}
  ): Promise<string[]> {
    const thumbnails: string[] = []
    
    return new Promise((resolve) => {
      const video = document.createElement('video')
      video.crossOrigin = 'anonymous'
      video.muted = true
      video.playsInline = true
      
      let currentIndex = 0
      
      const cleanup = () => {
        video.remove()
      }

      const captureNextThumbnail = async () => {
        const thumbnail = await this.generateFromVideo(video, options)
        if (thumbnail) {
          thumbnails.push(thumbnail)
        }

        currentIndex++
        if (currentIndex < count && video.duration > 0) {
          // Seek to next position
          video.currentTime = (video.duration / count) * currentIndex
        } else {
          cleanup()
          resolve(thumbnails)
        }
      }

      video.addEventListener('loadedmetadata', () => {
        if (video.duration > 0) {
          video.currentTime = 0
        }
      })

      video.addEventListener('seeked', captureNextThumbnail)

      video.addEventListener('error', () => {
        cleanup()
        resolve(thumbnails)
      })

      video.src = url
      video.load()
    })
  }

  private async waitForVideoReady(video: HTMLVideoElement): Promise<void> {
    if (video.readyState >= 2 && video.videoWidth > 0 && video.videoHeight > 0) {
      return
    }

    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error('Video ready timeout'))
      }, 5000)

      const checkReady = () => {
        if (video.readyState >= 2 && video.videoWidth > 0 && video.videoHeight > 0) {
          clearTimeout(timeout)
          resolve()
        }
      }

      video.addEventListener('loadeddata', checkReady)
      video.addEventListener('canplay', checkReady)
      
      // Check immediately in case already ready
      checkReady()
    })
  }

  private calculateDimensions(
    srcWidth: number,
    srcHeight: number,
    maxWidth: number,
    maxHeight: number
  ): { width: number; height: number } {
    const aspectRatio = srcWidth / srcHeight

    let width = srcWidth
    let height = srcHeight

    if (width > maxWidth) {
      width = maxWidth
      height = width / aspectRatio
    }

    if (height > maxHeight) {
      height = maxHeight
      width = height * aspectRatio
    }

    return {
      width: Math.round(width),
      height: Math.round(height)
    }
  }
}

// Helper functions for easy access
export async function generateVideoThumbnail(
  video: HTMLVideoElement,
  options?: ThumbnailOptions
): Promise<string | null> {
  const generator = VideoThumbnailGenerator.getInstance()
  return generator.generateFromVideo(video, options)
}

export async function generateThumbnailFromUrl(
  url: string,
  options?: ThumbnailOptions
): Promise<string | null> {
  const generator = VideoThumbnailGenerator.getInstance()
  return generator.generateFromUrl(url, options)
}

export async function generateMultipleThumbnails(
  url: string,
  count?: number,
  options?: ThumbnailOptions
): Promise<string[]> {
  const generator = VideoThumbnailGenerator.getInstance()
  return generator.generateMultipleThumbnails(url, count, options)
}