/**
 * Official Gemini API File Upload and Processing Limits
 * Based on Google AI Gemini API documentation (2024)
 * 
 * @see https://ai.google.dev/gemini-api/docs/files
 * @see https://ai.google.dev/gemini-api/docs/video-understanding
 */

// File Size Limits
export const GEMINI_LIMITS = {
  /** Maximum file size per upload using File API (2GB) */
  MAX_FILE_SIZE_BYTES: 2 * 1024 * 1024 * 1024, // 2GB
  
  /** Maximum file size in MB for easier calculations */
  MAX_FILE_SIZE_MB: 2048, // 2GB in MB
  
  /** Maximum total storage per project (20GB) */
  MAX_PROJECT_STORAGE_GB: 20,
  
  /** File retention period in hours */
  FILE_RETENTION_HOURS: 48,
  
  // Video Duration Limits (based on context window)
  /** Maximum video duration for 2M token context (default resolution) in seconds */
  MAX_VIDEO_DURATION_2M_DEFAULT: 2 * 60 * 60, // 2 hours
  
  /** Maximum video duration for 1M token context (default resolution) in seconds */
  MAX_VIDEO_DURATION_1M_DEFAULT: 1 * 60 * 60, // 1 hour
  
  /** Maximum video duration for 2M token context (low resolution) in seconds */
  MAX_VIDEO_DURATION_2M_LOW: 6 * 60 * 60, // 6 hours
  
  /** Maximum video duration for 1M token context (low resolution) in seconds */
  MAX_VIDEO_DURATION_1M_LOW: 3 * 60 * 60, // 3 hours
  
  // Default limits to use (assuming 2M context with default resolution)
  /** Default maximum video duration to enforce (2 hours) */
  DEFAULT_MAX_VIDEO_DURATION: 2 * 60 * 60, // 2 hours in seconds
  
  // Media Processing Details
  /** Video sampling rate (frames per second) */
  VIDEO_SAMPLING_FPS: 1,
  
  /** Audio processing rate */
  AUDIO_PROCESSING_RATE: '1Kbps single channel',
  
  /** Maximum number of video files per prompt request */
  MAX_VIDEO_FILES_PER_REQUEST: 10,
  
  /** Maximum number of files per request */
  MAX_FILES_PER_REQUEST: 10,
  
  // Inline Upload Limits (for direct embedding in prompts)
  /** Maximum request size for inline uploads (20MB) */
  MAX_INLINE_REQUEST_SIZE_BYTES: 20 * 1024 * 1024, // 20MB
  
  /** Maximum request size for inline uploads in MB */
  MAX_INLINE_REQUEST_SIZE_MB: 20,
} as const

// Helper Functions
export const GeminiLimitUtils = {
  /**
   * Convert bytes to human-readable format
   */
  formatFileSize: (bytes: number): string => {
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    if (bytes === 0) return '0 Bytes'
    const i = Math.floor(Math.log(bytes) / Math.log(1024))
    return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i]
  },
  
  /**
   * Convert seconds to human-readable duration
   */
  formatDuration: (seconds: number): string => {
    const hours = Math.floor(seconds / 3600)
    const minutes = Math.floor((seconds % 3600) / 60)
    const secs = seconds % 60
    
    if (hours > 0) {
      return `${hours}h ${minutes}m ${secs}s`
    } else if (minutes > 0) {
      return `${minutes}m ${secs}s`
    } else {
      return `${secs}s`
    }
  },
  
  /**
   * Check if file size is within Gemini limits
   */
  isFileSizeValid: (sizeBytes: number): boolean => {
    return sizeBytes <= GEMINI_LIMITS.MAX_FILE_SIZE_BYTES
  },
  
  /**
   * Check if video duration is within Gemini limits
   */
  isVideoDurationValid: (durationSeconds: number): boolean => {
    return durationSeconds <= GEMINI_LIMITS.DEFAULT_MAX_VIDEO_DURATION
  },
  
  /**
   * Get file size validation error message
   */
  getFileSizeError: (sizeBytes: number): string | null => {
    if (sizeBytes > GEMINI_LIMITS.MAX_FILE_SIZE_BYTES) {
      return `File size (${GeminiLimitUtils.formatFileSize(sizeBytes)}) exceeds Gemini API limit of ${GeminiLimitUtils.formatFileSize(GEMINI_LIMITS.MAX_FILE_SIZE_BYTES)}`
    }
    return null
  },
  
  /**
   * Get video duration validation error message
   */
  getVideoDurationError: (durationSeconds: number): string | null => {
    if (durationSeconds > GEMINI_LIMITS.DEFAULT_MAX_VIDEO_DURATION) {
      return `Video duration (${GeminiLimitUtils.formatDuration(durationSeconds)}) exceeds Gemini API limit of ${GeminiLimitUtils.formatDuration(GEMINI_LIMITS.DEFAULT_MAX_VIDEO_DURATION)}`
    }
    return null
  },
  
  /**
   * Get comprehensive validation result for a file
   */
  validateFile: (file: { size: number; type: string; duration?: number }) => {
    const errors: string[] = []
    
    // Check file size
    const sizeError = GeminiLimitUtils.getFileSizeError(file.size)
    if (sizeError) errors.push(sizeError)
    
    // Check video duration if applicable
    if (file.type.startsWith('video/') && file.duration !== undefined) {
      const durationError = GeminiLimitUtils.getVideoDurationError(file.duration)
      if (durationError) errors.push(durationError)
    }
    
    return {
      isValid: errors.length === 0,
      errors,
      warnings: [] as string[]
    }
  }
}

// Export individual constants for convenience
export const {
  MAX_FILE_SIZE_BYTES,
  MAX_FILE_SIZE_MB,
  DEFAULT_MAX_VIDEO_DURATION,
  MAX_VIDEO_FILES_PER_REQUEST,
  MAX_FILES_PER_REQUEST,
} = GEMINI_LIMITS

// Type definitions for better TypeScript support
export interface GeminiFileValidation {
  isValid: boolean
  errors: string[]
  warnings: string[]
}

export interface GeminiFileLimits {
  maxFileSizeBytes: number
  maxFileSizeMB: number
  maxVideoDurationSeconds: number
  maxFilesPerRequest: number
}

// Default limits object for easy use in components
export const DEFAULT_GEMINI_LIMITS: GeminiFileLimits = {
  maxFileSizeBytes: GEMINI_LIMITS.MAX_FILE_SIZE_BYTES,
  maxFileSizeMB: GEMINI_LIMITS.MAX_FILE_SIZE_MB,
  maxVideoDurationSeconds: GEMINI_LIMITS.DEFAULT_MAX_VIDEO_DURATION,
  maxFilesPerRequest: GEMINI_LIMITS.MAX_FILES_PER_REQUEST,
}