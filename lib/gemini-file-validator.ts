import { GoogleAIFileManager } from "@google/generative-ai/server"

/**
 * Validates and ensures Gemini files are in ACTIVE state
 * Handles expired files by providing appropriate error handling
 */
export class GeminiFileValidator {
  private fileManager: GoogleAIFileManager
  
  constructor(apiKey: string) {
    this.fileManager = new GoogleAIFileManager(apiKey)
  }
  
  /**
   * Extracts file ID from Gemini URI
   */
  private extractFileId(uri: string): string | null {
    // Gemini URIs are in format: https://generativelanguage.googleapis.com/v1beta/files/FILE_ID
    const match = uri.match(/files\/([^\/]+)$/)
    return match ? match[1] : null
  }
  
  /**
   * Validates if a file is in ACTIVE state
   */
  async validateFile(fileUri: string): Promise<{
    isValid: boolean
    state?: string
    error?: string
    fileInfo?: any
  }> {
    try {
      const fileId = this.extractFileId(fileUri)
      if (!fileId) {
        return {
          isValid: false,
          error: 'Invalid file URI format'
        }
      }
      
      console.log(`[GeminiFileValidator] Checking file state for: ${fileId}`)
      
      // Get file info from Gemini
      const fileInfo = await this.fileManager.getFile(`files/${fileId}`)
      
      console.log(`[GeminiFileValidator] File state: ${fileInfo.state}`)
      
      if (fileInfo.state === 'ACTIVE') {
        return {
          isValid: true,
          state: fileInfo.state,
          fileInfo
        }
      } else if (fileInfo.state === 'PROCESSING') {
        // Wait for processing to complete (up to 10 seconds)
        let attempts = 0
        while (fileInfo.state === 'PROCESSING' && attempts < 10) {
          await new Promise(resolve => setTimeout(resolve, 1000))
          const updatedInfo = await this.fileManager.getFile(`files/${fileId}`)
          if (updatedInfo.state !== 'PROCESSING') {
            return {
              isValid: updatedInfo.state === 'ACTIVE',
              state: updatedInfo.state,
              fileInfo: updatedInfo,
              error: updatedInfo.state !== 'ACTIVE' ? `File is in ${updatedInfo.state} state` : undefined
            }
          }
          attempts++
        }
        return {
          isValid: false,
          state: 'PROCESSING',
          error: 'File is still processing after timeout'
        }
      } else {
        return {
          isValid: false,
          state: fileInfo.state,
          error: `File is in ${fileInfo.state} state and cannot be used. Files expire after 48 hours.`,
          fileInfo
        }
      }
    } catch (error) {
      console.error('[GeminiFileValidator] Error validating file:', error)
      return {
        isValid: false,
        error: error instanceof Error ? error.message : 'Failed to validate file'
      }
    }
  }
  
  /**
   * Validates multiple files and returns validation results
   */
  async validateFiles(files: Array<{uri: string, mimeType: string, name?: string}>): Promise<{
    validFiles: Array<{uri: string, mimeType: string, name?: string}>
    invalidFiles: Array<{uri: string, mimeType: string, name?: string, error: string}>
  }> {
    const validFiles: Array<{uri: string, mimeType: string, name?: string}> = []
    const invalidFiles: Array<{uri: string, mimeType: string, name?: string, error: string}> = []
    
    for (const file of files) {
      const validation = await this.validateFile(file.uri)
      if (validation.isValid) {
        validFiles.push(file)
      } else {
        invalidFiles.push({
          ...file,
          error: validation.error || 'File validation failed'
        })
      }
    }
    
    return { validFiles, invalidFiles }
  }
}